import type { CapacitorConfig } from '@capacitor/cli';

// App Android do XerifeTV (Capacitor): mesmo Angular do site, mas o catálogo e o vídeo
// saem do celular de quem assiste (ver native-stream-resolver.ts), sem o Render no caminho.
const config: CapacitorConfig = {
  appId: 'com.xerifetv.app',
  appName: 'XerifeTV',
  webDir: 'dist/XerifeTVWeb/browser',
  server: {
    // http://localhost: origem segura (aceita os cookies "Secure" do auth.service.ts) e
    // sem mixed content pra vídeos http://IP/...mp4
    androidScheme: 'http',
    // Vídeos dos provedores são http:// puro; sem isso o Android (API 28+) bloqueia
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    // fetch/XHR passam pela camada nativa: sem CORS pra catálogos e playlists HLS
    CapacitorHttp: {
      enabled: true,
    },
    // Barras do sistema escuras (ícones claros) combinando com o fundo do app,
    // independente do tema claro/escuro do celular
    SystemBars: {
      style: 'DARK',
    },
  },
};

export default config;
