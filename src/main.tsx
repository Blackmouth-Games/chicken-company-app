import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Buffer } from "buffer";

// Ensure Buffer is available in the browser (some TON libs expect it)
// @ts-ignore
if (!(window as any).Buffer) (window as any).Buffer = Buffer as any;

createRoot(document.getElementById("root")!).render(<App />);
