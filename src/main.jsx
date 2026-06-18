import React from "react";
import ReactDOM from "react-dom/client";
import StockCompass from "./StockCompass.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <StockCompass />
  </React.StrictMode>
);

// PWA: 서비스워커 등록 (설치형 + 오프라인 셸). 상대 경로로 Pages 호환.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => { /* 등록 실패해도 앱은 동작 */ });
  });
}
