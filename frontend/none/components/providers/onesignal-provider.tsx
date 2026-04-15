"use client";

import { useEffect, useState } from "react";
import OneSignal from "react-onesignal";

export function OneSignalProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    async function init() {
      const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
      if (!appId) {
        console.warn("OneSignal App ID not found in environment.");
        return;
      }

      try {
        await OneSignal.init({
          appId,
          allowLocalhostAsSecureOrigin: true, // for dev
          notifyButton: {
            enable: true,
          },
        });
        setInitialized(true);
      } catch (err) {
        console.error("Failed to initialize OneSignal:", err);
      }
    }
    
    // Check if window is defined (browser context)
    if (typeof window !== "undefined") {
      init();
    }
  }, []);

  return <>{children}</>;
}
