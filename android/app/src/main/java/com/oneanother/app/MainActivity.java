package com.oneanother.app;

import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onStop() {
        super.onStop();
        // Flush the WebView CookieManager to disk so that cookie deletions
        // (e.g. on logout) are persisted before the process is killed.
        // Without this, the session cookie survives a cold app restart even
        // after the server has cleared it via Set-Cookie: Max-Age=0.
        CookieManager.getInstance().flush();
    }
}
