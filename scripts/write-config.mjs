#!/usr/bin/env node
/**
 * Gera `config.json` a partir das variáveis de ambiente do host.
 *
 * O Angular embute `environment.ts` no bundle durante o build, então variáveis
 * exportadas na VPS não chegariam ao bundle já compilado. Este script roda antes
 * do `ng build` e materializa essas variáveis em `public/config.json`, que é
 * copiado para o `dist` e lido em runtime pelo `RuntimeConfigService`.
 *
 * Uso:
 *   npm run config                      # escreve public/config.json
 *   npm run config -- --out dist/XerifeTVWeb/browser
 *                                       # escreve direto no bundle publicado
 *
 * Variáveis lidas (a primeira encontrada vence):
 *   API_URL | NG_API_URL | XERIFETV_API_URL
 *   GIPHY_API_KEY | GIPHY_KEY | NG_GIPHY_API_KEY
 *
 * Sem nenhuma variável definida o script não escreve nada, para não sobrescrever
 * um `public/config.json` local de desenvolvimento.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';

const API_URL_VARS = ['API_URL', 'NG_API_URL', 'XERIFETV_API_URL'];
const GIPHY_KEY_VARS = ['GIPHY_API_KEY', 'GIPHY_KEY', 'NG_GIPHY_API_KEY'];

/** Lê a primeira variável de ambiente definida e não vazia. */
function readEnv(names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return '';
}

/** Garante exatamente uma barra no final. */
function withTrailingSlash(value) {
  return value.replace(/\/+$/, '') + '/';
}

/** Diretório de saída (`--out <dir>`, padrão `public`). */
function readOutDir(argv) {
  const index = argv.indexOf('--out');
  if (index === -1) return resolve('public');
  const value = argv[index + 1];
  if (!value) {
    console.error('[config] --out exige um diretório.');
    process.exit(1);
  }
  return resolve(value);
}

async function readExisting(file) {
  if (!existsSync(file)) return {};
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    console.warn(`[config] ${file} está inválido e será regravado.`);
    return {};
  }
}

async function main() {
  const outDir = readOutDir(process.argv.slice(2));
  const file = join(outDir, 'config.json');

  const apiUrl = readEnv(API_URL_VARS);
  const giphyApiKey = readEnv(GIPHY_KEY_VARS);

  if (!apiUrl && !giphyApiKey) {
    console.log(
      `[config] Nenhuma variável definida (${API_URL_VARS[0]}, ${GIPHY_KEY_VARS[0]}); ` +
        `${file} mantido como está.`,
    );
    return;
  }

  const config = await readExisting(file);
  const written = [];

  if (apiUrl) {
    if (!/^https?:\/\//i.test(apiUrl)) {
      console.warn(`[config] ${API_URL_VARS[0]} não começa com http(s): ${apiUrl}`);
    }
    config.apiUrl = withTrailingSlash(apiUrl);
    written.push('apiUrl');
  }

  if (giphyApiKey) {
    config.giphyApiKey = giphyApiKey;
    written.push('giphyApiKey');
  }

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(config, null, 2) + '\n', 'utf8');

  // Loga apenas os nomes das chaves: a chave do GIPHY não deve aparecer no CI.
  console.log(`[config] ${file} atualizado (${written.join(', ')}).`);
}

main().catch((error) => {
  console.error('[config] Falha ao gerar config.json:', error);
  process.exit(1);
});