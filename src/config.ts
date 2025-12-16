// Determine API base URL based on environment
const getApiBaseUrl = (): string => {
  // If explicitly set via environment variable, use it (remove trailing slash)
  const envUrl = import.meta.env.VITE_BACKEND_API;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, ''); // Remove trailing slash if present
  }
  
  // In production (Vercel), you MUST set VITE_BACKEND_API environment variable
  // pointing to your deployed backend API (e.g., https://your-backend.vercel.app)
  if (import.meta.env.PROD) {
    console.warn('VITE_BACKEND_API not set in production. API calls may fail.');
    // Return empty string to use relative URLs (only works if backend is on same domain)
    return '';
  }
  
  // Development fallback
  return 'http://127.0.0.1:8000';
};

export const API_BASE_URL = getApiBaseUrl();

// Debug logging (only in development)
if (import.meta.env.DEV) {
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('VITE_BACKEND_API env:', import.meta.env.VITE_BACKEND_API);
}

export const API_ENDPOINTS = {
    traders: {
        list: '/traders',
        details: (wallet: string) => `/traders/${wallet}`,
        basic: (wallet: string) => `/traders/${wallet}/basic`,
        trades: (wallet: string) => `/traders/${wallet}/trades`,
    },
    positions: {
        fetch: '/positions',
        fromDb: '/positions/from-db',
    },
    profileStats: {
        fetch: '/profile/stats',
        fromDb: '/profile/stats/from-db',
    },
    trades: {
        fetch: '/trades',
        fromDb: '/trades/from-db',
    },
    leaderboard: {
        live: '/leaderboard/live',
        liveRoi: '/leaderboard/live-roi',
        livePnl: '/leaderboard/live-pnl',
        liveRisk: '/leaderboard/live-risk',
    },
    markets: {
        list: '/markets',
    },
} as const;
