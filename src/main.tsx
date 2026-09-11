import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { BrowserSeedVault } from "./lib/vault/seedVault";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App vault={new BrowserSeedVault()} />
  </React.StrictMode>,
);
