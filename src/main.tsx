import React from "react";
import ReactDOM from "react-dom/client";
import { Buffer } from "buffer";
import App from "./App";
import "./styles.css";

const globalWindow = window as Window & { Buffer?: typeof Buffer };

if (typeof window !== "undefined" && !globalWindow.Buffer) {
  globalWindow.Buffer = Buffer;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
