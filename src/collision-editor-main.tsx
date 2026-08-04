import React from "react";
import ReactDOM from "react-dom/client";
import { CollisionEditor } from "./CollisionEditor";
import "./collisionEditor.css";

ReactDOM.createRoot(document.getElementById("collision-editor-root")!).render(
  <React.StrictMode>
    <CollisionEditor />
  </React.StrictMode>,
);
