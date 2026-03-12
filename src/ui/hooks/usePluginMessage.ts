import React from "react";
import type { UIMessage, PluginMessage } from "@shared/messages";

export function postToPlugin(msg: UIMessage): void {
  parent.postMessage({ pluginMessage: msg }, "*");
}

export function usePluginMessage(
  handler: (msg: PluginMessage) => void
): void {
  const handlerRef = React.useRef(handler);
  React.useEffect(() => {
    handlerRef.current = handler;
  });
  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (msg) handlerRef.current(msg);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
}
