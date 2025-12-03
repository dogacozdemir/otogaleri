import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./i18n";

// Set default dark mode
if (!localStorage.getItem('theme-mode')) {
  localStorage.setItem('theme-mode', 'dark');
  document.documentElement.classList.add('dark');
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
