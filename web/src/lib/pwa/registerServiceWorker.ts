/**
 * web/src/lib/pwa/registerServiceWorker.ts
 *
 * Registers the Service Worker in the browser and attaches online/offline event listeners.
 */

import { useSyncStore } from "../stores/useSyncStore";

export function registerServiceWorker() {
  if (typeof window === "undefined") return;

  // Track online/offline status
  window.addEventListener("online", () => {
    useSyncStore.getState().setOnline(true);
  });

  window.addEventListener("offline", () => {
    useSyncStore.getState().setOnline(false);
  });

  // Register service worker if supported
  if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("Service Worker registration failed:", err);
        });
    });
  }
}
