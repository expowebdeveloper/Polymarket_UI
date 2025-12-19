import { API_BASE_URL, API_ENDPOINTS } from '../config';
import type {
    TradersResponse,
    TraderDetails,
    TraderBasicInfo,
    TradesResponse,
    PositionsResponse,
    ClosedPosition,
    ActivitiesResponse,
    ProfileStatsResponse,
    LeaderboardResponse,
    MarketsResponse,
    UserLeaderboardData,
    MarketOrdersResponse,
    AllLeaderboardsResponse,
    ApiError,
} from '../types/api';

/**
 * Generic fetch wrapper with error handling and timeout
 */
async function fetchApi<T>(endpoint: string, timeoutMs: number = 30000, method: string = 'GET'): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        // Construct full URL - handle both absolute and relative URLs
        const url = API_BASE_URL 
            ? `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
            : endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        // Log the URL being called (helpful for debugging)
        console.log(`API Call: ${method} ${url}`);
        
        const response = await fetch(url, {
            method,
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data as T;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
            throw {
                message: 'Request timeout - the server is taking too long to respond',
                status: 408,
            } as ApiError;
        }

        console.error('API Error:', error);
        throw {
            message: error instanceof Error ? error.message : 'An unknown error occurred',
            status: error instanceof Response ? error.status : undefined,
        } as ApiError;
    }
}

/**
 * Fetch list of traders
 * @param limit - Maximum number of traders to return (default: 50)
 */
export async function fetchTraders(limit: number = 50): Promise<TradersResponse> {
    // Use longer timeout for traders endpoint (60 seconds)
    return fetchApi<TradersResponse>(`${API_ENDPOINTS.traders.list}?limit=${limit}`, 60000);
}

/**
 * Fetch detailed information for a specific trader
 * @param wallet - Wallet address of the trader
 */
export async function fetchTraderDetails(wallet: string): Promise<TraderDetails> {
    return fetchApi<TraderDetails>(API_ENDPOINTS.traders.details(wallet));
}

/**
 * Fetch basic information for a specific trader
 * @param wallet - Wallet address of the trader
 */
export async function fetchTraderBasicInfo(wallet: string): Promise<TraderBasicInfo> {
    return fetchApi<TraderBasicInfo>(API_ENDPOINTS.traders.basic(wallet));
}

/**
 * Fetch trades for a specific trader
 * @param wallet - Wallet address of the trader
 */
export async function fetchTraderTrades(wallet: string): Promise<TradesResponse> {
    return fetchApi<TradesResponse>(API_ENDPOINTS.traders.trades(wallet));
}

/**
 * Fetch and save positions
 */
export async function fetchPositions(): Promise<PositionsResponse> {
    return fetchApi<PositionsResponse>(API_ENDPOINTS.positions.fetch);
}

/**
 * Get positions from database
 */
export async function fetchPositionsFromDB(): Promise<PositionsResponse> {
    return fetchApi<PositionsResponse>(API_ENDPOINTS.positions.fromDb);
}

/**
 * Fetch positions for a specific wallet address
 * @param walletAddress - Wallet address to fetch positions for
 */
export async function fetchPositionsForWallet(walletAddress: string): Promise<PositionsResponse> {
    // Use longer timeout for positions endpoint (30 seconds)
    return fetchApi<PositionsResponse>(`/positions?user=${walletAddress}`, 30000);
}

/**
 * Fetch closed positions for a specific wallet address
 * @param walletAddress - Wallet address to fetch closed positions for
 */
export async function fetchClosedPositionsForWallet(walletAddress: string): Promise<ClosedPosition[]> {
    // Use POST endpoint to trigger fetch and store
    return fetchApi<ClosedPosition[]>(`/closed-positions/${walletAddress}`, 30000, 'POST');
}

/**
 * Fetch activity for a specific wallet address
 * @param walletAddress - Wallet address to fetch activity for
 * @param type - Optional activity type filter (TRADE, REDEEM, REWARD, etc.)
 * @param limit - Optional limit for number of activities
 * @param offset - Optional offset for pagination
 */
export async function fetchActivityForWallet(
    walletAddress: string,
    type?: string,
    limit?: number,
    offset?: number
): Promise<ActivitiesResponse> {
    let url = `/activity?user=${walletAddress}`;
    if (type) url += `&type=${type}`;
    if (limit) url += `&limit=${limit}`;
    if (offset) url += `&offset=${offset}`;
    return fetchApi<ActivitiesResponse>(url, 30000);
}

/**
 * Fetch and save profile stats for a wallet address
 * @param proxyAddress - Wallet address to fetch stats for
 * @param username - Optional username
 */
export async function fetchProfileStats(
    proxyAddress: string,
    username?: string
): Promise<ProfileStatsResponse> {
    let url = `${API_ENDPOINTS.profileStats.fetch}?proxyAddress=${proxyAddress}`;
    if (username) url += `&username=${username}`;
    return fetchApi<ProfileStatsResponse>(url, 30000);
}

/**
 * Get profile stats from database
 * @param proxyAddress - Wallet address to get stats for
 * @param username - Optional username
 */
export async function fetchProfileStatsFromDB(
    proxyAddress: string,
    username?: string
): Promise<ProfileStatsResponse> {
    let url = `${API_ENDPOINTS.profileStats.fromDb}?proxyAddress=${proxyAddress}`;
    if (username) url += `&username=${username}`;
    return fetchApi<ProfileStatsResponse>(url, 30000);
}

/**
 * Fetch and save trades for a wallet address
 * @param walletAddress - Wallet address to fetch trades for
 */
export async function fetchTrades(walletAddress: string): Promise<TradesResponse> {
    const url = `${API_ENDPOINTS.trades.fetch}?user=${walletAddress}`;
    return fetchApi<TradesResponse>(url, 30000);
}

/**
 * Get trades from database
 * @param walletAddress - Wallet address to get trades for
 * @param side - Optional filter by side (BUY/SELL)
 * @param limit - Optional limit
 */
export async function fetchTradesFromDB(
    walletAddress: string,
    side?: string,
    limit?: number
): Promise<TradesResponse> {
    let url = `${API_ENDPOINTS.trades.fromDb}?user=${walletAddress}`;
    if (side) url += `&side=${side}`;
    if (limit) url += `&limit=${limit}`;
    return fetchApi<TradesResponse>(url, 30000);
}

/**
 * Fetch live leaderboard data
 * @param type - Type of leaderboard to fetch
 */
export async function fetchLiveLeaderboard(
    type: 'all' | 'roi' | 'pnl' | 'risk' = 'all'
): Promise<LeaderboardResponse> {
    const endpoints = {
        'all': API_ENDPOINTS.leaderboard.live,
        'roi': API_ENDPOINTS.leaderboard.liveRoi,
        'pnl': API_ENDPOINTS.leaderboard.livePnl,
        'risk': API_ENDPOINTS.leaderboard.liveRisk
    };

    // These are POST requests in backend
    return fetchApi<LeaderboardResponse>(endpoints[type], 60000, 'POST');
}

/**
 * Fetch markets from the API
 * @param status - Market status filter ('active', 'resolved', 'closed', etc.)
 * @param limit - Number of markets per page
 * @param offset - Offset for pagination
 */
export async function fetchMarkets(
    status: string = 'active',
    limit: number = 20,
    offset: number = 0
): Promise<MarketsResponse> {
    const url = `${API_ENDPOINTS.markets.list}?status=${status}&limit=${limit}&offset=${offset}`;
    return fetchApi<MarketsResponse>(url, 30000);
}

/**
 * Fetch portfolio stats for a wallet address
 * @param walletAddress - Wallet address to fetch portfolio stats for
 */
export async function fetchPortfolioStats(walletAddress: string): Promise<any> {
    return fetchApi<any>(`/pnl/portfolio?user_address=${walletAddress}`, 30000);
}

/**
 * Get closed positions from database for a wallet address
 * @param walletAddress - Wallet address to get closed positions for
 */
export async function getClosedPositionsFromDB(walletAddress: string): Promise<ClosedPosition[]> {
    return fetchApi<ClosedPosition[]>(`/closed-positions/${walletAddress}`, 30000);
}

/**
 * Fetch user leaderboard data for a wallet address
 * @param walletAddress - Wallet address to fetch leaderboard data for
 * @param category - Optional category filter (default: "politics")
 */
export async function fetchUserLeaderboardData(
    walletAddress: string,
    category: string = 'overall'
): Promise<UserLeaderboardData> {
    return fetchApi<UserLeaderboardData>(`/user/leaderboard?user=${walletAddress}&category=${category}`, 30000);
}

/**
 * Fetch market orders from Polymarket API
 * @param marketSlug - Market slug identifier
 * @param limit - Maximum number of orders to return
 * @param offset - Offset for pagination
 */
/**
 * Fetch all leaderboards with percentile information
 */
export async function fetchAllLeaderboards(): Promise<AllLeaderboardsResponse> {
    return fetchApi<AllLeaderboardsResponse>(API_ENDPOINTS.leaderboard.all, 60000, 'POST');
}

/**
 * Fetch all leaderboards with percentile information (GET endpoint)
 */
export async function fetchViewAllLeaderboards(): Promise<AllLeaderboardsResponse> {
    return fetchApi<AllLeaderboardsResponse>(API_ENDPOINTS.leaderboard.viewAll, 60000, 'GET');
}

/**
 * Fetch leaderboard sorted by W_shrunk (ascending)
 */
export async function fetchWShrunkLeaderboard(): Promise<LeaderboardResponse> {
    return fetchApi<LeaderboardResponse>(API_ENDPOINTS.leaderboard.wShrunk, 60000, 'POST');
}

/**
 * Fetch leaderboard sorted by raw ROI (descending)
 */
export async function fetchRoiRawLeaderboard(): Promise<LeaderboardResponse> {
    return fetchApi<LeaderboardResponse>(API_ENDPOINTS.leaderboard.roiRaw, 60000, 'POST');
}

/**
 * Fetch leaderboard sorted by ROI_shrunk (ascending)
 */
export async function fetchRoiShrunkLeaderboard(): Promise<LeaderboardResponse> {
    return fetchApi<LeaderboardResponse>(API_ENDPOINTS.leaderboard.roiShrunk, 60000, 'POST');
}

/**
 * Fetch leaderboard sorted by PNL_shrunk (ascending)
 */
export async function fetchPnlShrunkLeaderboard(): Promise<LeaderboardResponse> {
    return fetchApi<LeaderboardResponse>(API_ENDPOINTS.leaderboard.pnlShrunk, 60000, 'POST');
}

/**
 * Fetch market orders from Polymarket API
 * @param marketSlug - Market slug identifier
 * @param limit - Maximum number of orders to return
 * @param offset - Offset for pagination
 */
export async function fetchMarketOrders(
    marketSlug: string,
    limit: number = 100,
    offset: number = 0
): Promise<MarketOrdersResponse> {
    return fetchApi<MarketOrdersResponse>(`/markets/orders?market_slug=${marketSlug}&limit=${limit}&offset=${offset}`, 30000);
}

