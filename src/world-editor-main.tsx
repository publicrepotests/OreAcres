import React from "react";
import ReactDOM from "react-dom/client";
import { WorldEditor } from "./WorldEditor";
import "./worldEditor.css";

ReactDOM.createRoot(document.getElementById("world-editor-root")!).render(
  <React.StrictMode>
    <WorldEditor />
  </React.StrictMode>,
);
