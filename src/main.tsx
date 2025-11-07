import { createRoot } from "react-dom/client";
import "./index.css";
import { Buffer } from "buffer";

// Ensure Buffer is available before loading the rest of the app (some libs require it at import time)
// @ts-ignore
if (!(window as any).Buffer) (window as any).Buffer = Buffer as any;

const rootEl = document.getElementById("root")!;
const root = createRoot(rootEl);

(async () => {
  const { default: App } = await import("./App.tsx");
  root.render(<App />);
})();
