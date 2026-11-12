import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../environments/environment';

/** Formato de `config.json` (gerado por `scripts/write-config.mjs`). */
interface RuntimeConfigFile {
  apiUrl?: string;
  giphyApiKey?: string;
}

const CONFIG_FILE = 'config.json';
const CONFIG_TIMEOUT_MS = 5000;

/** Garante exatamente uma barra no final. */
function withTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '') + '/';
}

/**
 * Base da API usada quando não há `config.json` nem `apiUrl` nele.
 *
 * `environment.apiUrl` vazio viraria `'/'`, e `'/'` não é base válida para
 * `new URL(url, base)` — além de fazer o interceptor considerar qualquer URL
 * como sendo da própria API. Por isso o fallback é a origem do site: mesmo
 * destino de `/`, porém absoluto.
 */
function resolveFallbackApiUrl(): string {
  const configured = environment.apiUrl.trim();
  if (configured) {
    return withTrailingSlash(configured);
  }
  if (typeof location !== 'undefined' && location.origin) {
    return withTrailingSlash(location.origin);
  }
  return '';
}

/**
 * Configuração de runtime lida de `config.json` na raiz do app.
 *
 * O Angular injeta `environment.ts` no bundle durante o build, então variáveis
 * de ambiente do host não chegariam ao bundle já compilado. Por isso o build
 * materializa essas variáveis em `config.json`, copiado junto com `public/`, e
 * o app busca o arquivo antes de disparar as primeiras requisições.
 *
 * Se o arquivo não existir (dev sem config local, SPA fallback devolvendo HTML,
 * etc.) a base cai em `environment.apiUrl`; se ele estiver vazio, na origem do
 * site.
 */
@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private readonly http = inject(HttpClient);

  private apiUrlValue = resolveFallbackApiUrl();
  private giphyApiKeyValue = '';
  private loadPromise: Promise<void> | null = null;

  /** URL da API com barra final. */
  get apiUrl(): string {
    return this.apiUrlValue;
  }

  /** Chave do GIPHY; string vazia desabilita o picker. */
  get giphyApiKey(): string {
    return this.giphyApiKeyValue;
  }

  /** Carrega `config.json` uma única vez. Nunca rejeita. */
  load(): Promise<void> {
    this.loadPromise ??= this.fetchConfig();
    return this.loadPromise;
  }

  private async fetchConfig(): Promise<void> {
    try {
      const config = await firstValueFrom(
        this.http
          .get<RuntimeConfigFile>(`${CONFIG_FILE}?v=${Date.now()}`)
          .pipe(timeout(CONFIG_TIMEOUT_MS)),
      );

      if (config && typeof config === 'object') {
        if (typeof config.apiUrl === 'string' && config.apiUrl.trim()) {
          this.apiUrlValue = withTrailingSlash(config.apiUrl.trim());
        }
        if (typeof config.giphyApiKey === 'string') {
          this.giphyApiKeyValue = config.giphyApiKey.trim();
        }
      }
    } catch {
      // Sem config.json: segue com os padrões do build.
      if (!this.apiUrlValue) {
        console.warn(
          '[RuntimeConfig] config.json indisponível e sem apiUrl de fallback: nenhuma chamada à API funcionará.',
        );
      }
    }
  }
}