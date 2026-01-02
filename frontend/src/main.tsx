// import React from "react";
// import ReactDOM from "react-dom/client";
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import App from "./App";
// import DataUploadPage from "./pages/DataUploadPage";
// import "./index.css"; // Global styles

// ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
//   <React.StrictMode>
//     <Router>
//       <Routes>
//         <Route path="/" element={<App />} />
//         <Route path="/data-upload" element={<DataUploadPage />} />
//       </Routes>
//     </Router>
//   </React.StrictMode>
// );
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./components/UserAuth";

// Load runtime config from /config.json before mounting the app.
// This allows changing API endpoints without rebuilding the static bundle.
async function initApp() {
  try {
    const res = await fetch("/config.json", { cache: "no-store" });
    if (res.ok) {
      // Attach to window so other modules can synchronously read it
      (window as any).__APP_CONFIG__ = await res.json();
      console.log("Loaded runtime config:", (window as any).__APP_CONFIG__);
    } else {
      (window as any).__APP_CONFIG__ = {};
      console.warn("/config.json not found (status:", res.status, ") - using defaults");
    }
  } catch (e) {
    (window as any).__APP_CONFIG__ = {};
    console.warn("Failed to load /config.json - using defaults", e);
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  );
}

initApp();
