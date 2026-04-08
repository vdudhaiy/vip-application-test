// API configuration
// frontend/src/config/api.ts
// Runtime config loader: prefer a runtime value from `window.__APP_CONFIG__` (loaded from /config.json)
// then fall back to Vite build-time env, then finally to localhost for dev.
const RUNTIME_CONFIG = (typeof window !== 'undefined' && (window as any).__APP_CONFIG__) || {};
const API_BASE_URL = RUNTIME_CONFIG.VITE_API_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export const API_ENDPOINTS = {
  BASE_URL: API_BASE_URL,
  LOGIN: `${API_BASE_URL}/api/login`,
  SIGNUP: `${API_BASE_URL}/api/signup`,
  LOGOUT: `${API_BASE_URL}/api/logout`,
  ME: `${API_BASE_URL}/api/me`,
  DATASET: `${API_BASE_URL}/api/dataset`,
  UPLOAD_RAWDATA: `${API_BASE_URL}/api/upload/rawdata`,
  UPLOAD_GROUP: `${API_BASE_URL}/api/upload/group`,
  DATA: `${API_BASE_URL}/api/data`,
  FILTER: `${API_BASE_URL}/api/filter`,
  NORMAL: `${API_BASE_URL}/api/normal`,
  TRANSFORM: `${API_BASE_URL}/api/transform`,
  IMPUTE: `${API_BASE_URL}/api/impute`,
  ANALYSIS: `${API_BASE_URL}/api/analysis`,
  VOLCANO_PLOT_DATA: `${API_BASE_URL}/api/volcano-plot-data`,
  HEATMAP_DATA: `${API_BASE_URL}/api/heatmap-data`,
  RUN_TTEST: `${API_BASE_URL}/api/run-ttest`,
  TTEST_RESULTS: `${API_BASE_URL}/api/ttest-results`,
  CHANGE_PASSWORD: `${API_BASE_URL}/api/change-password`,
  UPDATE_PROFILE: `${API_BASE_URL}/api/update-profile`,
};

export default API_ENDPOINTS;
