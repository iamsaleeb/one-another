"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { App } from "@capacitor/app";

export function BackButtonProvider() {
  const pathname = usePathname();
  const historyDepth = useRef(0);

  // Track navigation depth so we know whether there's somewhere to go back to
  useEffect(() => {
    historyDepth.current += 1;
  }, [pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: PluginListenerHandle | undefined;

    App.addListener("backButton", () => {
      if (historyDepth.current > 1) {
        historyDepth.current -= 1;
        window.history.back();
      } else {
        App.exitApp();
      }
    }).then((h) => {
      handle = h;
    });

    return () => {
      handle?.remove();
    };
  }, []);

  return null;
}
