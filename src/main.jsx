import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./App.jsx";

function bootstrap() {
  const root = createRoot(document.getElementById("root"));

  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  // Lapse is development-only. Load it after the product is on screen so a
  // slow or unavailable inspector can never blank the prototype.
  if (import.meta.env.DEV) {
    import("@aiforui/lapse/install")
      .then(() => import("@aiforui/lapse/panel"))
      .then(({ mountLapse }) => mountLapse())
      .catch((error) => console.warn("Lapse inspector unavailable", error));
  }
}

try {
  bootstrap();
} catch (error) {
  console.error("Application bootstrap failed", error);
}
