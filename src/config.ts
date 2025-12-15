export const API_BASE_URL = import.meta.env.VITE_BACKEND_API || 'http://127.0.0.1:8000';

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
