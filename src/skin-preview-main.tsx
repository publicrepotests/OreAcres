import React from "react";
import ReactDOM from "react-dom/client";
import SkinPreview from "./SkinPreview";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SkinPreview />
  </React.StrictMode>,
);
