import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Gesto/botão de voltar do Android (app Capacitor). Sem esse listener o Android fecha o
// app direto; com ele: sai da tela cheia do player > volta uma tela > só então fecha.
export function registerAndroidBackButton(): void {
  if (Capacitor.getPlatform() !== 'android') return;

  App.addListener('backButton', ({ canGoBack }) => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }

    if (canGoBack) {
      window.history.back();
      return;
    }

    App.exitApp();
  });
}
