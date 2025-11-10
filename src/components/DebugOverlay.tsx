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
  // Layout tab local state
  const [isEditMode, setIsEditMode] = useState(false);
  const [layoutText, setLayoutText] = useState<string>("");
  const [beltCount, setBeltCount] = useState<number>(0);
  const [gap, setGap] = useState<string>("20px");

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

    // Listen layout updates
    const refreshLayout = () => {
      const saved = localStorage.getItem('debugLayoutConfig');
      if (saved) {
        setLayoutText(saved);
        try {
          const cfg = JSON.parse(saved);
          setGap(cfg?.grid?.gap ?? '20px');
          setBeltCount(Array.isArray(cfg?.belts) ? cfg.belts.length : 0);
        } catch {}
      }
    };
    refreshLayout();
    const onLayoutUpdate = () => refreshLayout();
    const onEditChange = (e: any) => setIsEditMode(!!e.detail);
    window.addEventListener('layoutConfigUpdate', onLayoutUpdate as any);
    window.addEventListener('layoutEditModeChange', onEditChange as any);

    return () => {
      console.log = orig.log;
      console.warn = orig.warn;
      console.error = orig.error;
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
      window.removeEventListener('layoutConfigUpdate', onLayoutUpdate as any);
      window.removeEventListener('layoutEditModeChange', onEditChange as any);
    };
  }, [enabled]);

  if (!enabled) return null;

  const tg = isTelegramWebApp();
  const tgUser = getTelegramUser();

  // Layout actions
  const toggleEdit = () => {
    const next = !isEditMode;
    setIsEditMode(next);
    window.dispatchEvent(new CustomEvent('layoutEditModeChange', { detail: next }));
  };
  const addBelt = () => window.dispatchEvent(new CustomEvent('addBelt'));
  const resetLayout = () => {
    const defaultConfig = {
      warehouse: { gridColumn: '1 / 7', gridRow: '1 / 4' },
      market: { gridColumn: '20 / 26', gridRow: '1 / 4' },
      house: { gridColumn: '11 / 16', gridRow: '1 / 3' },
      boxes: { gridColumn: '6 / 8', gridRow: '3 / 5' },
      leftCorrals: { gridColumn: '1 / 7', gap: '20px', startRow: 4 },
      rightCorrals: { gridColumn: '20 / 26', gap: '20px', startRow: 4 },
      belts: [{ id: 'belt-1', gridColumn: '13 / 14', gridRow: '10 / 11', direction: 'east', type: 'straight' }],
      grid: { gap: '20px', maxWidth: '1600px' },
    } as any;
    localStorage.setItem('debugLayoutConfig', JSON.stringify(defaultConfig));
    window.dispatchEvent(new CustomEvent('layoutConfigUpdate', { detail: defaultConfig }));
  };
  const copyLayout = () => layoutText && navigator.clipboard.writeText(layoutText);
  const onGapChange = (val: string) => {
    setGap(val);
    try {
      const saved = localStorage.getItem('debugLayoutConfig');
      if (saved) {
        const cfg = JSON.parse(saved);
        cfg.grid = cfg.grid || {};
        cfg.grid.gap = val;
        localStorage.setItem('debugLayoutConfig', JSON.stringify(cfg));
        window.dispatchEvent(new CustomEvent('layoutConfigUpdate', { detail: cfg }));
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/90 text-white overflow-auto p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-xl font-bold">Debug Overlay</h2>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">General</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
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
            <Button className="mt-2" variant="secondary" onClick={() => navigator.clipboard.writeText(JSON.stringify({ errors, logs }, null, 2))}>Copiar</Button>
          </TabsContent>

          <TabsContent value="layout">
            <div className="space-y-3 text-sm">
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={toggleEdit}>{isEditMode ? 'Desactivar edición' : 'Activar edición'}</Button>
                <Button size="sm" variant="outline" onClick={addBelt}>Añadir cinta</Button>
                <Button size="sm" variant="outline" onClick={resetLayout}>Restablecer layout</Button>
                <Button size="sm" variant="outline" onClick={copyLayout}>Copiar layout</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white/10 p-3 rounded">
                  <div className="font-semibold mb-1">Estado</div>
                  <div>Edición: {isEditMode ? 'ON' : 'OFF'}</div>
                  <div>Belts manuales: {beltCount}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="opacity-80">Gap:</label>
                    <input className="text-black px-2 py-1 rounded" value={gap} onChange={(e) => onGapChange(e.target.value)} placeholder="20px" />
                  </div>
                </div>
                <div className="bg-white/10 p-3 rounded">
                  <div className="font-semibold mb-1">JSON</div>
                  <pre className="text-xs max-h-56 overflow-auto whitespace-pre-wrap break-all">{layoutText || 'Sin datos'}</pre>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DebugOverlay;
