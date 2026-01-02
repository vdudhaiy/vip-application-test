import React, { useState, useEffect, Suspense, lazy } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { useAuth } from "./components/UserAuth";

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

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>("Data Upload");
  const { loading, user } = useAuth(); // ✅ Access loading state and user
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if we're in the dashboard section (any route that starts with /Datasets or is /dashboard)
  const isInDashboard = location.pathname === '/dashboard' || 
                       location.pathname === '/Datasets' ||
                       location.pathname.startsWith('/DataQualityCheck') ||
                       location.pathname.startsWith('/Filter') ||
                       location.pathname.startsWith('/Normalization') ||
                       location.pathname.startsWith('/Transformation') ||
                       location.pathname.startsWith('/Imputation') ||
                       location.pathname.startsWith('/StatisticalAnalysis');

  // Check if we're on a protected route that requires authentication
  const isProtectedRoute = isInDashboard || location.pathname === '/profile';

  // Update active section based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path === '/feedback') {
      setActiveSection('Feedback');
    } else if (path === '/about') {
      setActiveSection('About');
    } else if (path === '/' || path === '/home') {
      setActiveSection('Home');
    } else if (path === '/dashboard' || path === '/Datasets') {
      setActiveSection('Dashboard');
    }
  }, [location.pathname]);

  // Redirect logged-out users from protected routes to login
  useEffect(() => {
    if (!loading && !user && isProtectedRoute) {
      navigate('/login');
    }
  }, [loading, user, isProtectedRoute, navigate]);

  if (loading) {
    return (
      <div style={{
        backgroundColor: "#1e1e1e",
        color: "#E0E0E0",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "16px"
      }}>
        Loading...
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
      margin: 0,
      padding: 0,
      overflow: "hidden",
      backgroundColor: "#1e1e1e",
      
      fontSize: "11px", 

    }}>
      <div style={{ 
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%"
      }}>
        <Navbar activeSection={activeSection} />
        
        <div style={{ 
          display: "flex",
          flex: 1,
          backgroundColor: "#1e1e1e",
          overflow: "hidden"
        }}>
          {isInDashboard && (
            <div style={{ 
              width: "100px",
              backgroundColor: "#1e1e1e",
              flexShrink: 0,
              margin: 0,
              padding: 0
            }}>
              <Sidebar onSelectSection={setActiveSection} activeSection={activeSection} />
            </div>
          )}
          
          <div style={{ 
            flex: 1,
            backgroundColor: "#1e1e1e",
            overflow: "auto",
            padding: "20px"
            
          }}>
            <Suspense fallback={
              <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "200px",
                color: "#E0E0E0"
              }}>
                Loading page...
              </div>
            }>
              <Routes>
                <Route path="/dashboard" element={<DatasetPage />} />
                <Route path="/Datasets" element={<DatasetPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                {/* <Route path="/DataUpload" element={<DataUploadPage />} /> */}
                <Route path="/DataQualityCheck" element={<DataQualityCheckPage />} />
                <Route path="/Filter" element={<FilterPage />} />
                <Route path="/Normalization" element={<NormalizationPage />} />
                <Route path="/Transformation" element={<TransformationPage />} />
                <Route path="/Imputation" element={<ImputationPage />} />
                <Route path="/StatisticalAnalysis" element={<StatisticalAnalysisPage />} />
                <Route path="/" element={<h2 style={{ color: "#E0E0E0" }}>Home</h2>} />
                <Route path="/about" element={<h2 style={{ color: "#E0E0E0" }}>About</h2>} />
                <Route path="/feedback" element={<FeedbackPage />} />
                <Route path="*" element={<h2 style={{ color: "#E0E0E0" }}>Page Not Found</h2>} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
};
export default App;
