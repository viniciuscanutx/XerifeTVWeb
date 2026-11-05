import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { ResolvedVideoResponse, VideoSource } from './content-api.types';

// Resolução de vídeo no próprio aparelho (apps Tauri, casca .NET ou Android) e busca do
// catálogo no navegador (site).
//
// No site, o navegador busca o catálogo (o provedor bloqueia o IP de datacenter do Render)
// e o CMS só testa as fontes e passa os vídeos http:// pelo proxy dele.
// No app, o WebView roda com CORS desligado e origem http (sem mixed content), então
// o catálogo e o vídeo saem direto do IP de quem assiste, como no localhost.

interface RawResolveResponse {
  url: string;
  streamFormat: string;
  followRedirect: boolean;
  catalogProviders: { baseUrl: string; name: string }[];
  // Worker com cache KV dos catálogos (vazio = sem cache, vai direto no provedor)
  catalogCacheUrl?: string;
}

interface CatalogStream {
  name?: string;
  title?: string;
  url?: string;
  behaviorHints?: { notWebReady?: boolean };
}

const CATALOG_TIMEOUT_MS = 20000;
// KV é só uma leitura rápida no Worker: se demorar, desiste e vai direto no provedor
const CATALOG_CACHE_TIMEOUT_MS = 4000;
const QUALITY_PATTERN = /(?<![a-z0-9])(4k|2160p|1440p|1080p|720p|576p|480p|360p)(?![a-z0-9])/i;

// Tauri (src-tauri), casca .NET WebView2 (desktop-windows, injeta __XERIFETV_DESKTOP__)
// ou app Android do Capacitor (android/)
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const capacitor = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return '__TAURI_INTERNALS__' in window
    || '__XERIFETV_DESKTOP__' in window
    || capacitor?.isNativePlatform?.() === true;
}

// Só os links cifrados do CMS (ResolveUrlFx) têm versão crua; o resto segue o fluxo normal.
export function toRawResolverUrl(resolverUrl: string): string | null {
  const url = new URL(resolverUrl);
  if (!url.pathname.endsWith('/ResolveUrlFx')) return null;
  url.pathname = url.pathname.replace(/\/ResolveUrlFx$/, '/ResolveUrlFxRaw');
  return url.toString();
}

export async function resolveOnDevice(rawResolverUrl: string): Promise<ResolvedVideoResponse> {
  const raw = await fetchJson<RawResolveResponse>(rawResolverUrl);

  if (!isCatalogUrl(raw.url)) {
    // Link direto ou de redirect: o <video> segue o redirect sozinho a cada play.
    const format = getFormatFromUrl(raw.url) || normalizeFormat(raw.streamFormat) || 'mp4';
    return { url: raw.url, streamFormat: format, sources: [] };
  }

  const { streams, catalogUrl } = await fetchFirstCatalogWithStreams(raw);
  const sources = buildSources(streams, getProviderName(catalogUrl, raw.catalogProviders));
  if (sources.length === 0) throw new Error('O catálogo não possui fontes reproduzíveis.');

  return { url: sources[0].url, streamFormat: sources[0].streamFormat, sources };
}

export interface BrowserCatalog {
  catalogUrl: string;
  payload: string;
  // Fontes montadas aqui, para tocar direto se o teste no servidor falhar (igual ao CMS)
  browserVideo: ResolvedVideoResponse | null;
}

// Site: devolve o catálogo buscado no navegador; null quando o link não é catálogo
export async function fetchCatalogInBrowser(rawResolverUrl: string): Promise<BrowserCatalog | null> {
  const raw = await fetchJson<RawResolveResponse>(rawResolverUrl);
  if (!isCatalogUrl(raw.url)) return null;

  const { streams, catalogUrl, payload } = await fetchFirstCatalogWithStreams(raw);
  const sources = buildSources(streams, getProviderName(catalogUrl, raw.catalogProviders));
  const browserVideo = sources.length > 0
    ? { url: sources[0].url, streamFormat: sources[0].streamFormat, sources }
    : null;

  return { catalogUrl, payload, browserVideo };
}

function isCatalogUrl(url: string): boolean {
  const normalized = url.toLowerCase();
  return normalized.includes('/stream/') || normalized.split('?')[0].endsWith('.json');
}

// URL cadastrada primeiro; depois cada provedor (ordem de fallback) com o mesmo /stream/...json.
function buildCatalogCandidates(raw: RawResolveResponse): string[] {
  const candidates = [raw.url];
  const suffixIndex = raw.url.indexOf('/stream/');
  if (suffixIndex < 0) return candidates;

  const suffix = raw.url.substring(suffixIndex);
  raw.catalogProviders.forEach((provider) => {
    const candidate = provider.baseUrl.replace(/\/$/, '') + suffix;
    if (!candidates.includes(candidate)) candidates.push(candidate);
  });
  return candidates;
}

// Busca todos os provedores ao mesmo tempo (antes era um por vez, somando o tempo de cada
// provedor sem o título), mas respeita a ordem de fallback: vale o primeiro da lista que tiver.
async function fetchFirstCatalogWithStreams(
  raw: RawResolveResponse,
): Promise<{ streams: CatalogStream[]; catalogUrl: string; payload: string }> {
  const attempts = buildCatalogCandidates(raw).map((catalogUrl) => ({
    catalogUrl,
    catalog: fetchCatalog(catalogUrl, raw.catalogCacheUrl).catch((error: unknown) => {
      console.warn('Catálogo indisponível:', catalogUrl, error);
      return { payload: '', streams: [] as CatalogStream[] };
    }),
  }));

  for (const attempt of attempts) {
    const { payload, streams } = await attempt.catalog;
    if (hasPlayableStream(streams)) return { streams, catalogUrl: attempt.catalogUrl, payload };
  }
  throw new Error('Nenhum provedor possui este título.');
}

// Igual ao _VideoModal do CMS: KV do Worker primeiro; no miss, busca direto no provedor e
// grava no Worker pra próxima vez (catálogo "frio" do bestcine leva ~10s).
async function fetchCatalog(
  catalogUrl: string,
  cacheUrl?: string,
): Promise<{ payload: string; streams: CatalogStream[] }> {
  if (cacheUrl) {
    try {
      const cached = await fetchText(`${cacheUrl}/?kvOnly=1&url=${encodeURIComponent(catalogUrl)}`, CATALOG_CACHE_TIMEOUT_MS);
      const cachedStreams = parseStreams(cached);
      if (hasPlayableStream(cachedStreams)) return { payload: cached, streams: cachedStreams };
    } catch {
      // Miss ou Worker fora: segue pro provedor
    }
  }

  const payload = await fetchText(catalogUrl, CATALOG_TIMEOUT_MS);
  const streams = parseStreams(payload);

  if (cacheUrl && hasPlayableStream(streams)) {
    postJson(`${cacheUrl}/?url=${encodeURIComponent(catalogUrl)}`, payload).catch(() => {});
  }
  return { payload, streams };
}

function parseStreams(payload: string): CatalogStream[] {
  const catalog = JSON.parse(payload) as { streams?: CatalogStream[] };
  return Array.isArray(catalog.streams) ? catalog.streams : [];
}

function hasPlayableStream(streams: CatalogStream[]): boolean {
  return streams.some((stream) => !!stream.url);
}

function buildSources(streams: CatalogStream[], providerName: string | null): VideoSource[] {
  const usedLabels = new Map<string, number>();

  return streams
    .map((stream, index) => {
      // Magnet/P2P (sem url) e notWebReady não tocam no player
      if (stream.behaviorHints?.notWebReady) return null;
      const url = extractStreamUrl(stream.url);
      if (!/^https?:\/\//i.test(url)) return null;

      const quality = findQuality(stream.name, stream.title, url);
      const label = providerName
        ? `${providerName} ${quality.label}`
        : (stream.name || '').replace(/\s+/g, ' ').trim() || quality.label;

      return {
        url,
        // Sem extensão (ex: bestcine /r/<hash>) vai como mp4: <video> nativo segue o redirect
        streamFormat: getFormatFromUrl(url) || 'mp4',
        rank: quality.rank,
        index,
        label,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    // Sem HEVC, 4K (sempre hvc1 nesses provedores) vai pro fim: o play começa na 1080p
    .map((item) => ({ ...item, rank: item.rank >= 2160 && !supportsHevc() ? -1 : item.rank }))
    .sort((left, right) => right.rank - left.rank || left.index - right.index)
    .map((item) => {
      const count = usedLabels.get(item.label) ?? 0;
      usedLabels.set(item.label, count + 1);
      return {
        url: item.url,
        streamFormat: item.streamFormat,
        quality: count === 0 ? item.label : `${item.label} (${count + 1})`,
      };
    });
}

const HEVC_TYPES = ['video/mp4; codecs="hvc1.2.4.L153.B0"', 'video/mp4; codecs="hev1.2.4.L153.B0"'];

// WebView2/Edge só decodifica HEVC com a extensão "HEVC Video Extensions" do Windows
function supportsHevc(): boolean {
  return HEVC_TYPES.some((type) =>
    document.createElement('video').canPlayType(type) !== ''
    || (typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported(type)));
}

function getProviderName(catalogUrl: string, providers: RawResolveResponse['catalogProviders']): string | null {
  const normalizedUrl = catalogUrl.toLowerCase();
  const match = providers
    .filter((provider) => normalizedUrl.startsWith(provider.baseUrl.toLowerCase()))
    .sort((left, right) => right.baseUrl.length - left.baseUrl.length)[0];
  return match?.name ?? null;
}

function findQuality(...values: unknown[]): { label: string; rank: number } {
  for (const value of values) {
    const match = QUALITY_PATTERN.exec(typeof value === 'string' ? value : '');
    if (!match) continue;
    const raw = match[1].toLowerCase();
    return raw === '4k' ? { label: '4K', rank: 2160 } : { label: raw, rank: Number.parseInt(raw, 10) };
  }
  return { label: 'Auto', rank: 0 };
}

function getFormatFromUrl(url: string): string | null {
  try {
    const lastSegment = new URL(url).pathname.split('/').pop() || '';
    const dotIndex = lastSegment.lastIndexOf('.');
    return dotIndex > 0 ? normalizeFormat(lastSegment.slice(dotIndex + 1)) : null;
  } catch {
    return null;
  }
}

function normalizeFormat(format: string | null | undefined): string | null {
  const value = (format || '').trim().toLowerCase();
  if (!value) return null;
  return value === 'm3u8' ? 'hls' : value;
}

function extractStreamUrl(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.trim().replace(/\\\[/g, '[').replace(/\\\]/g, ']').replace(/\\_/g, '_');
  const markdownStart = normalized.indexOf('](');
  const url = normalized.startsWith('[') && markdownStart > 0
    ? normalized.slice(markdownStart + 2).replace(/\)$/, '')
    : normalized;
  return url.trim().replace(/^<|>$/g, '');
}

async function fetchJson<T>(url: string): Promise<T> {
  return JSON.parse(await fetchText(url, CATALOG_TIMEOUT_MS)) as T;
}

// No Android o fetch global passa pelo proxy "localhost/_capacitor_http_interceptor_" do
// WebView: todas as requisições caem no MESMO host, que o Chromium limita a 6 conexões, e cada
// uma segura a vaga até o destino responder (froststream leva 5-11s). O catálogo rápido
// (bestcine, ~40ms) ficava na fila atrás dos lentos. Aqui o plugin é chamado direto: roda no
// pool de threads nativo, em paralelo de verdade - o equivalente às requisições pelo IP local
// do app .NET. No Windows/Tauri segue o fetch normal (WebView2 já fala direto com cada host).
async function fetchText(url: string, timeoutMs: number): Promise<string> {
  if (Capacitor.isNativePlatform()) return nativeGetText(url, timeoutMs);
  return webGetText(url, timeoutMs);
}

async function nativeGetText(url: string, timeoutMs: number): Promise<string> {
  const request = CapacitorHttp.get({
    url,
    // Sem isso vai o UA do HttpURLConnection ("Dalvik/...") e o bestcine responde 403
    headers: { Accept: 'application/json', 'User-Agent': navigator.userAgent },
    responseType: 'text',
    connectTimeout: timeoutMs,
    readTimeout: timeoutMs,
  });
  const response = await withTimeout(request, timeoutMs, url);
  if (response.status < 200 || response.status >= 300) throw new Error(`HTTP ${response.status} em ${url}`);
  // Com Content-Type JSON o plugin pode devolver o objeto já parseado
  return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
}

async function postJson(url: string, body: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await CapacitorHttp.post({ url, headers: { 'Content-Type': 'application/json' }, data: body });
    return;
  }
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
}

// connect/readTimeout do plugin contam por etapa; isto garante o teto total
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, url: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Tempo esgotado em ${url}`)), timeoutMs);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}

async function webGetText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} em ${url}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}
