import React, { useState, useEffect, Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useAuth } from "./components/UserAuth";
import "./App.css";

// Lazy load pages for better code splitting
const DataQualityCheckPage = lazy(() => import("./pages/DataQualityCheckPage"));
const FilterPage = lazy(() => import("./pages/FilterPage"));
const NormalizationPage = lazy(() => import("./pages/NormalizationPage"));
const TransformationPage = lazy(() => import("./pages/TransformationPage"));
const ImputationPage = lazy(() => import("./pages/ImputationPage"));
const StatisticalAnalysisPage = lazy(() => import("./pages/StatAnalysisPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignUpPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const DatasetPage = lazy(() => import("./pages/DatasetPage"));
const FeedbackPage = lazy(() => import("./pages/FeedbackPage"));
const HomePage = lazy(() => import("./pages/HomePage"));

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>("Data Upload");
  const { loading, user } = useAuth();
  const location = useLocation();

  const isInDashboard =
    location.pathname === "/dashboard" ||
    location.pathname === "/Datasets" ||
    location.pathname.startsWith("/DataQualityCheck") ||
    location.pathname.startsWith("/Filter") ||
    location.pathname.startsWith("/Normalization") ||
    location.pathname.startsWith("/Transformation") ||
    location.pathname.startsWith("/Imputation") ||
    location.pathname.startsWith("/StatisticalAnalysis");

  useEffect(() => {
    const path = location.pathname;
    if (path === "/feedback") {
      setActiveSection("Feedback");
    } else if (path === "/" || path === "/home") {
      setActiveSection("Home");
    } else if (path === "/dashboard" || path === "/Datasets") {
      setActiveSection("Dashboard");
    }
  }, [location.pathname]);

  const requireAuth = (element: React.ReactElement) =>
    user ? element : <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Initializing...</span>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      width: "100%",
      height: "100%",
      position: "absolute",
      top: 0,
      left: 0,
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
        <Navbar activeSection={activeSection} />

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {isInDashboard && (
            <div style={{
              width: "120px",
              flexShrink: 0,
              borderRight: "1px solid var(--border-color)",
            }}>
              <Sidebar onSelectSection={setActiveSection} activeSection={activeSection} />
            </div>
          )}

          <div style={{
            flex: 1,
            overflow: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "var(--bg-primary)",
          }}>
            <Suspense fallback={
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "200px", flexDirection: "column", gap: "16px" }}>
                <div className="spinner spinner--sm" />
                <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Loading page...</span>
              </div>
            }>
              <Routes>
                <Route path="/dashboard" element={requireAuth(<DatasetPage />)} />
                <Route path="/Datasets" element={requireAuth(<DatasetPage />)} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/profile" element={requireAuth(<ProfilePage />)} />
                <Route path="/DataQualityCheck" element={requireAuth(<DataQualityCheckPage />)} />
                <Route path="/Filter" element={requireAuth(<FilterPage />)} />
                <Route path="/Normalization" element={requireAuth(<NormalizationPage />)} />
                <Route path="/Transformation" element={requireAuth(<TransformationPage />)} />
                <Route path="/Imputation" element={requireAuth(<ImputationPage />)} />
                <Route path="/StatisticalAnalysis" element={requireAuth(<StatisticalAnalysisPage />)} />
                <Route path="/" element={<HomePage />} />
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="*" element={<h2 style={{ color: "var(--text-primary)" }}>Page Not Found</h2>} />
              </Routes>
            </Suspense>

            <div style={{ marginTop: "auto" }}>
              <Footer />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
