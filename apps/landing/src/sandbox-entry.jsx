import React from "react";
import { createRoot } from "react-dom/client";

import { SandboxSection } from "./sandbox/SandboxSection.jsx";

const root = document.getElementById("sandbox-root");

if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <SandboxSection />
    </React.StrictMode>,
  );
}
