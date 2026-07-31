import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely silence benign Vite HMR (Hot Module Replacement) WebSocket connection warnings and errors
if (typeof window !== "undefined") {
  // Capture and silence asynchronous unhandled promises & error rejections from Vite WebSocket or HMR
  window.addEventListener("unhandledrejection", (event) => {
    const reasonStr = String(event.reason?.message || event.reason?.description || event.reason || "");
    const isWSError = 
      reasonStr.toLowerCase().includes("websocket") ||
      reasonStr.toLowerCase().includes("vite") ||
      reasonStr.toLowerCase().includes("hmr") ||
      reasonStr.toLowerCase().includes("unopened");

    if (isWSError) {
      event.preventDefault();
      event.stopPropagation();
      console.info("Silenced benign HMR/WebSocket rejection:", event.reason);
    }
  });

  window.addEventListener("error", (event) => {
    const message = event.message || "";
    const isWSError = 
      message.toLowerCase().includes("websocket") ||
      message.toLowerCase().includes("vite") ||
      message.toLowerCase().includes("hmr") ||
      message.toLowerCase().includes("unopened");

    if (isWSError) {
      event.preventDefault();
      event.stopPropagation();
      console.info("Silenced benign HMR/WebSocket error event:", message);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

