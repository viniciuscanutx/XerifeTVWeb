<div align="center">

# ChelifeTV Web

**Plataforma de streaming de filmes e séries — o front-end do ecossistema ChelifeTV.**

Catálogo com destaque, player HLS com várias fontes e qualidades, progresso sincronizado,
perfil personalizável com capa, badges, favoritos e avaliações.

![Angular](https://img.shields.io/badge/Angular-22-dd0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952b3?logo=bootstrap&logoColor=white)
![hls.js](https://img.shields.io/badge/hls.js-1.5-9b68ff)
![Vitest](https://img.shields.io/badge/Vitest-4-6e9f18?logo=vitest&logoColor=white)

<img src="docs/screenshots/home.png" alt="Página inicial do ChelifeTV com título em destaque e a seção Continuar Assistindo" width="100%" />

</div>

---

## Sumário

- [Telas](#telas)
- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Como rodar](#como-rodar)
- [Configuração](#configuração)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Scripts](#scripts)
- [Back-end](#back-end)

## Telas

### Catálogo

| Filmes | Séries |
| :---: | :---: |
| <img src="docs/screenshots/movies.png" alt="Catálogo de filmes com busca, filtro por gênero e ordenação" /> | <img src="docs/screenshots/series.png" alt="Catálogo de séries com busca, filtro por gênero e ordenação" /> |

### Página do título

| Filme | Série |
| :---: | :---: |
| <img src="docs/screenshots/watch-movie.png" alt="Página de um filme com banner, sinopse, botão de reproduzir, favoritos e atalho para avaliações" /> | <img src="docs/screenshots/watch-series.png" alt="Página de uma série com logo, temporadas e botão A Seguir" /> |

| Episódios | Detalhes e avaliações |
| :---: | :---: |
| <img src="docs/screenshots/watch-series-episodes.png" alt="Lista de episódios da temporada com miniatura, número e duração" /> | <img src="docs/screenshots/watch-details.png" alt="Detalhes do filme, classificação indicativa e formulário de avaliação da comunidade" /> |

### Perfil

<img src="docs/screenshots/profile.png" alt="Perfil do usuário com imagem de capa, avatar, badge e filmes favoritos" width="100%" />

### Mobile

| Início | Título | Perfil |
| :---: | :---: | :---: |
| <img src="docs/screenshots/mobile-home.png" alt="Página inicial no celular com a barra de navegação inferior" width="260" /> | <img src="docs/screenshots/mobile-watch.png" alt="Página de um filme no celular" width="260" /> | <img src="docs/screenshots/mobile-profile.png" alt="Perfil no celular" width="260" /> |

### Login

<img src="docs/screenshots/login.png" alt="Tela de login" width="100%" />

## Funcionalidades

**Catálogo e descoberta**
- Home com título em destaque, **Continuar Assistindo** e carrosséis.
- Catálogos de filmes e séries com busca, filtro por gênero e ordenação.
- Busca global na topbar com resultados em tempo real.
- Canais agrupados por categoria.
- Recomendações na página de cada título.

**Página do título**
- Banner imersivo com a topbar transparente, que fica sólida ao rolar.
- Detalhes (lançamento, idioma original, país de origem) e classificação indicativa.
- Temporadas e episódios, com marcação dos já assistidos e botão "A Seguir".
- Versões **dublada e legendada**, quando disponíveis.
- Favoritar, avaliar e botão flutuante que leva direto às avaliações.

**Player**
- Reprodução **HLS** (via `hls.js`) e MP4.
- Várias fontes por título, com troca manual de qualidade e fallback automático quando uma fonte falha.
- Abre na hora e carrega o vídeo por dentro, sem travar o botão de reproduzir.
- Retoma de onde parou (**progresso salvo na API**) e avança para o próximo episódio.
- Controles próprios: velocidade, avançar/voltar 10s, volume e tela cheia.

**Perfil**
- Avatar por link ou **GIF do GIPHY**, imagem de capa e badge em destaque.
- Filmes e séries favoritos, assistidos recentemente e avaliações (editar/excluir).
- Seções vazias ficam ocultas; carregamento com skeleton, sem "piscar".

**Conta e acesso**
- Login com token JWT e renovação automática (`auth.interceptor`).
- Rotas protegidas por autenticação e por permissão (`auth.guard`, `permission.guard`).

**Experiência**
- Layout responsivo com barra de navegação inferior no mobile.
- Acessibilidade: HTML semântico, `aria-*`, foco visível e respeito a `prefers-reduced-motion`.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | [Angular 22](https://angular.dev) — standalone components, **signals**, control flow (`@if`/`@for`/`@defer`) |
| Linguagem | TypeScript 6 |
| Estilo | CSS por componente + [Tailwind CSS 4](https://tailwindcss.com) + [Bootstrap 5.3](https://getbootstrap.com) |
| Ícones | [Bootstrap Icons](https://icons.getbootstrap.com) |
| Vídeo | [hls.js](https://github.com/video-dev/hls.js) |
| HTTP / estado | `HttpClient` + RxJS 7 + signals |
| Testes | [Vitest](https://vitest.dev) + jsdom |
| Formatação | Prettier |

## Como rodar

**Pré-requisitos:** Node.js 22.22+ ou 24.15+ (exigência do Angular 22) e npm 11.

```bash
npm install
```

```bash
npm start
```

A aplicação sobe em **http://localhost:4300**.

## Configuração

A URL da API e a chave do GIPHY **não ficam no código**: vêm de variáveis de ambiente do host.

| Variável | Para que serve |
| --- | --- |
| `API_URL` | URL base do ChelifeTV.CMS (ex.: `https://chelifetvcms.vertraweb.app/`) |
| `GIPHY_API_KEY` | Chave da API do GIPHY usada no picker de GIFs do perfil |

Aliases aceitos: `NG_API_URL` / `CHELIFETV_API_URL` para a URL e `GIPHY_KEY` / `NG_GIPHY_API_KEY` para a chave.

O `prebuild` executa `scripts/write-config.mjs`, que lê essas variáveis e escreve `public/config.json`. Como o Angular copia `public/` para o bundle, o arquivo chega ao `dist` e é lido em runtime pelo `RuntimeConfigService`.

```bash
# Linux/macOS
API_URL=https://chelifetvcms.vertraweb.app/ GIPHY_API_KEY=xxxx npm run build

# PowerShell
$env:API_URL="https://chelifetvcms.vertraweb.app/"; $env:GIPHY_API_KEY="xxxx"; npm run build
```

Sem variáveis definidas o script **não** escreve nada, preservando um `config.json` local.

Para já publicar sem rebuild, gere direto no bundle:

```bash
npm run config -- --out dist/ChelifeTVWeb/browser
```

### Desenvolvimento local

Copie `public/config.example.json` para `public/config.json` (arquivo ignorado pelo git) e aponte para o back-end local:

```json
{
  "apiUrl": "http://localhost:5003/",
  "giphyApiKey": ""
}
```

Sem `public/config.json` o app cai no `apiUrl` de `src/app/environments/environment.ts`, que é apenas o fallback de produção. Com `giphyApiKey` vazia o picker de GIFs fica desabilitado.

## Estrutura do projeto

```text
src/app
├── pages/                  # Uma pasta por rota
│   ├── home/               # Destaque, continuar assistindo, carrosséis
│   ├── movies/ · series/   # Catálogos com filtros
│   ├── channels/           # Canais por categoria
│   ├── watch/              # Página do título (filme/série) + player
│   ├── profile/            # Perfil, favoritos, avaliações, badges
│   ├── search/ · about/ · login/ · access-denied/
├── shared/
│   ├── components/         # navbar, video-player, media-card, review-dialog, ...
│   ├── data/               # Cliente da API de conteúdo, tipos e mappers
│   ├── services/           # auth, profile, watch-progress, feedback, giphy
│   ├── guards/             # auth.guard, permission.guard
│   ├── interceptors/       # auth.interceptor (Bearer + refresh)
│   └── models/
└── environments/
```

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm start` | Servidor de desenvolvimento em `localhost:4300` |
| `npm run build` | Build de produção em `dist/` |
| `npm run watch` | Build de desenvolvimento em modo watch |
| `npm test` | Testes unitários com Vitest |

## Back-end

O ChelifeTV Web consome a API do **ChelifeTV.CMS** (ASP.NET Core + MongoDB), que também é o painel
administrativo do catálogo. A especificação da API está em [`api/v1.json`](api/v1.json).
