import React from "react";
import ReactDOM from "react-dom/client";
import { AdminConsole } from "./AdminConsole";
import "./adminConsole.css";

ReactDOM.createRoot(document.getElementById("admin-root")!).render(
  <React.StrictMode>
    <AdminConsole />
  </React.StrictMode>,
);
