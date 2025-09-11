import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { clearOldProtocolData } from "./services/protocolService";

// Development utilities
if (process.env.NODE_ENV === "development") {
  (window as any).delphiDebug = {
    clearData: clearOldProtocolData,
    clearAuth: () => localStorage.removeItem("delphi-auth"),
    clearAll: () => localStorage.clear(),
    showStorage: () => {
      console.log("LocalStorage contents:");
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          console.log(key, localStorage.getItem(key));
        }
      }
    },
  };
  console.log("Delphi debug utilities available at window.delphiDebug");
}

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);

root.render(<App />);
