package com.xerifetv.app;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.widget.FrameLayout;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getBridge().getWebView().setWebChromeClient(new FullscreenWebChromeClient());
    }

    /**
     * O BridgeWebChromeClient do Capacitor recusa o fullscreen do HTML (chama
     * onCustomViewHidden na hora), então o requestFullscreen() do player falhava e caía na
     * "tela cheia de CSS" com as barras do sistema aparecendo. Aqui o fullscreen é nativo:
     * a view do vídeo cobre a tela, as barras somem (voltam com um deslize) e gira pra paisagem.
     */
    private class FullscreenWebChromeClient extends BridgeWebChromeClient {

        private View customView;
        private WebChromeClient.CustomViewCallback customViewCallback;
        private int orientationBeforeFullscreen;

        FullscreenWebChromeClient() {
            super(getBridge());
        }

        @Override
        public void onShowCustomView(View view, WebChromeClient.CustomViewCallback callback) {
            if (customView != null) {
                callback.onCustomViewHidden();
                return;
            }

            customView = view;
            customViewCallback = callback;
            orientationBeforeFullscreen = getRequestedOrientation();

            FrameLayout decorView = (FrameLayout) getWindow().getDecorView();
            decorView.addView(view, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

            WindowInsetsControllerCompat insetsController = getInsetsController();
            insetsController.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            insetsController.hide(WindowInsetsCompat.Type.systemBars());

            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        }

        @Override
        public void onHideCustomView() {
            if (customView == null) {
                return;
            }

            ((FrameLayout) getWindow().getDecorView()).removeView(customView);
            customView = null;

            getInsetsController().show(WindowInsetsCompat.Type.systemBars());
            setRequestedOrientation(orientationBeforeFullscreen);

            customViewCallback.onCustomViewHidden();
            customViewCallback = null;
        }

        private WindowInsetsControllerCompat getInsetsController() {
            return WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        }
    }
}
