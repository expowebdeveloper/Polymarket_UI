// Determine API base URL based on environment
const getApiBaseUrl = (): string => {
  // If explicitly set via environment variable, use it (remove trailing slash)
  const envUrl = import.meta.env.VITE_BACKEND_API;
  
  if (envUrl && envUrl.trim()) {
    const url = envUrl.trim().replace(/\/$/, ''); // Remove trailing slash if present
    return url;
  }
  
  // In production (Vercel), you MUST set VITE_BACKEND_API environment variable
  // pointing to your deployed backend API
  if (import.meta.env.PROD) {
    console.error('⚠️ VITE_BACKEND_API is not set in production!');
    console.error('API calls will fail. Please set VITE_BACKEND_API in Vercel environment variables.');
    // Return empty string to use relative URLs (only works if backend is on same domain)
    return '';
  }
  
  // Development fallback
  return 'http://127.0.0.1:8000';
};

export const API_BASE_URL = getApiBaseUrl();

// Debug logging (always log to help debug)
if (typeof window !== 'undefined') {
  console.log('🔧 API Configuration:', {
    API_BASE_URL,
    VITE_BACKEND_API: import.meta.env.VITE_BACKEND_API || '(not set)',
    MODE: import.meta.env.MODE,
    PROD: import.meta.env.PROD,
  });
  
  if (import.meta.env.PROD && !API_BASE_URL && !import.meta.env.VITE_BACKEND_API) {
    console.error('❌ ERROR: VITE_BACKEND_API is not set in production!');
    console.error('Please set it in Vercel: Settings → Environment Variables');
  }
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
