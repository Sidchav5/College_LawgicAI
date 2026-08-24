// Centralized API Base URL configuration
// On production (Vercel), automatically uses /api-proxy to route through Vercel HTTPS reverse proxy
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || (isLocal ? "http://127.0.0.1:5000" : "/api-proxy");

export default API_BASE_URL;
