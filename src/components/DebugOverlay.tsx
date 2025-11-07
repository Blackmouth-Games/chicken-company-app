import { useEffect, useMemo, useState } from "react";
import { isTelegramWebApp, getTelegramUser } from "@/lib/telegram";

// Simple in-memory log store attached to window for persistence across re-renders
declare global {
  interface Window { __APP_LOGS?: Array<{ level: string; args: any[]; ts: number }>; }
}

interface DebugOverlayProps {
  manifestUrl: string;
}

export const DebugOverlay = ({ manifestUrl }: DebugOverlayProps) => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const enabled = params.get("debug") === "1";
  const [logs, setLogs] = useState<Array<{ level: string; args: any[]; ts: number }>>(window.__APP_LOGS || []);
  const [errors, setErrors] = useState<string[]>([]);
  const [txErrors, setTxErrors] = useState<Array<{ ts: number; msg: string }>>([]);

  useEffect(() => {
    if (!enabled) return;

    // Patch console
    if (!window.__APP_LOGS) window.__APP_LOGS = [];
    const orig: Record<string, any> = {
      log: console.log,
      warn: console.warn,
      error: console.error,
    };
    const wrap = (level: keyof typeof orig) =>
      (...args: any[]) => {
        window.__APP_LOGS!.push({ level, args, ts: Date.now() });
        setLogs([...window.__APP_LOGS!]);
        // @ts-ignore
        orig[level](...args);
      };

    console.log = wrap("log");
    console.warn = wrap("warn");
    console.error = wrap("error");

    const onErr = (ev: ErrorEvent) => {
      const errMsg = `${ev.message} @ ${ev.filename}:${ev.lineno}`;
      setErrors((e) => [...e, errMsg]);
      // Detect TON transaction errors
      if (ev.message?.includes("TON_CONNECT") || ev.message?.includes("SendTransaction")) {
        setTxErrors((tx) => [...tx, { ts: Date.now(), msg: ev.message }]);
      }
    };
    const onRej = (ev: PromiseRejectionEvent) => {
      const rejMsg = `Unhandled rejection: ${String(ev.reason)}`;
      setErrors((e) => [...e, rejMsg]);
      // Detect TON transaction errors
      const reasonStr = String(ev.reason);
      if (reasonStr.includes("TON_CONNECT") || reasonStr.includes("SendTransaction") || reasonStr.includes("address")) {
        setTxErrors((tx) => [...tx, { ts: Date.now(), msg: reasonStr }]);
      }
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);

    return () => {
      console.log = orig.log;
      console.warn = orig.warn;
      console.error = orig.error;
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, [enabled]);

  if (!enabled) return null;

  const tg = isTelegramWebApp();
  const tgUser = getTelegramUser();

  return (
    <div className="fixed inset-0 z-[10000] bg-black/90 text-white overflow-auto p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-xl font-bold">Debug Overlay</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-white/10 p-3 rounded">
            <div className="font-semibold mb-1">Environment</div>
            <div>Path: {window.location.pathname}{window.location.search}</div>
            <div>Manifest URL: {manifestUrl}</div>
            <div>UA: {navigator.userAgent}</div>
          </div>
          <div className="bg-white/10 p-3 rounded">
            <div className="font-semibold mb-1">Telegram</div>
            <div>isTelegramWebApp: {String(tg)}</div>
            <div>User ID: {tgUser?.id ?? "-"}</div>
            <div>Username: {tgUser?.username ?? "-"}</div>
          </div>
          <div className="bg-white/10 p-3 rounded col-span-1 md:col-span-2">
            <div className="font-semibold mb-1">TON Transaction Errors</div>
            {txErrors.length === 0 ? <div className="opacity-70">No TX errors</div> : (
              <ul className="space-y-1 list-disc list-inside text-xs">
                {txErrors.map((e, i) => (<li key={i}>[{new Date(e.ts).toLocaleTimeString()}] {e.msg}</li>))}
              </ul>
            )}
          </div>
          <div className="bg-white/10 p-3 rounded col-span-1 md:col-span-2">
            <div className="font-semibold mb-1">Errors</div>
            {errors.length === 0 ? <div className="opacity-70">No captured errors</div> : (
              <ul className="space-y-1 list-disc list-inside">
                {errors.map((e, i) => (<li key={i}>{e}</li>))}
              </ul>
            )}
          </div>
          <div className="bg-white/10 p-3 rounded col-span-1 md:col-span-2">
            <div className="font-semibold mb-1">Logs</div>
            {logs.length === 0 ? <div className="opacity-70">No logs</div> : (
              <ul className="space-y-1 text-xs font-mono">
                {logs.slice(-200).map((l, i) => (
                  <li key={i}>
                    <span className="opacity-70">[{new Date(l.ts).toLocaleTimeString()}] {l.level.toUpperCase()}:</span> {l.args.map(String).join(" ")}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <button className="mt-2 px-3 py-1 rounded bg-white/20 hover:bg-white/30" onClick={() => navigator.clipboard.writeText(JSON.stringify({ errors, logs }, null, 2))}>Copiar</button>
      </div>
    </div>
  );
};

export default DebugOverlay;
