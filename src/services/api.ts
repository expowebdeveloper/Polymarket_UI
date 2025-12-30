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
    EnhancedProfileStatsResponse,
    LeaderboardResponse,
    MarketsResponse,
    UserLeaderboardData,
    MarketOrdersResponse,
    AllLeaderboardsResponse,
    TradeHistoryResponse,
    LeaderboardTrader,
    LeaderboardTradersResponse,
    RewardsMarketResponse,
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
 * Fetch traders from Polymarket Leaderboard API
 * @param category - Category filter ('overall', 'politics', 'sports', etc.)
 * @param timePeriod - Time period ('all', '1m', '3m', '6m', '1y')
 * @param orderBy - Sort by ('VOL', 'PNL', 'ROI')
 * @param limit - Maximum number of traders to return
 * @param offset - Offset for pagination
 */
export async function fetchLeaderboardTraders(
    category: string = 'overall',
    timePeriod: string = 'all',
    orderBy: string = 'VOL',
    limit: number | null = null,
    offset: number = 0
): Promise<LeaderboardTradersResponse> {
    // If limit is null or 0, don't include it in the URL to fetch all traders
    let url = `${API_ENDPOINTS.traders.list}/leaderboard?category=${category}&time_period=${timePeriod}&order_by=${orderBy}`;
    if (limit !== null && limit > 0) {
        url += `&limit=${limit}&offset=${offset}`;
    }
    // Use longer timeout when fetching all traders (5 minutes)
    const timeout = limit === null || limit === 0 ? 300000 : 60000;
    return fetchApi<LeaderboardTradersResponse>(url, timeout);
}

/**
 * Fetch detailed information for a specific trader
 * @param wallet - Wallet address of the trader
 */
export async function fetchTraderDetails(wallet: string): Promise<TraderDetails> {
    return fetchApi<TraderDetails>(API_ENDPOINTS.traders.details(wallet));
}

/**
 * Fetch Polymarket-style trader profile (comprehensive format matching Polymarket UI)
 * @param wallet - Wallet address of the trader
 */
export async function fetchPolymarketTraderProfile(wallet: string): Promise<any> {
    return fetchApi<any>(`${API_ENDPOINTS.traders.list}/${wallet}/polymarket-profile`, 60000);
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
 * Get enhanced profile stats with scoring and streaks
 * @param wallet - Optional wallet address
 * @param username - Optional username
 * @param search - Optional search query (username or wallet)
 */
export async function fetchEnhancedProfileStats(
    wallet?: string,
    username?: string,
    search?: string
): Promise<EnhancedProfileStatsResponse> {
    let url = `${API_ENDPOINTS.profileStats.enhanced}?`;
    const params: string[] = [];
    if (wallet) params.push(`wallet=${wallet}`);
    if (username) params.push(`username=${username}`);
    if (search) params.push(`search=${search}`);
    url += params.join('&');
    return fetchApi<EnhancedProfileStatsResponse>(url, 30000);
}

/**
 * Get top traders
 * @param limit - Number of top traders to return (default: 3)
 */
export async function fetchTopTraders(limit: number = 3): Promise<EnhancedProfileStatsResponse[]> {
    return fetchApi<EnhancedProfileStatsResponse[]>(`${API_ENDPOINTS.profileStats.topTraders}?limit=${limit}`, 60000);
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
 * Fetch live leaderboard data from Polymarket API
 * @param timePeriod - Time period: day, week, month, or all
 * @param orderBy - Order by metric: PNL or VOL
 * @param limit - Maximum number of entries
 * @param offset - Offset for pagination
 */
export async function fetchLiveLeaderboard(
    timePeriod: 'day' | 'week' | 'month' | 'all' = 'day',
    orderBy: 'PNL' | 'VOL' = 'PNL',
    limit: number = 20,
    offset: number = 0
): Promise<LeaderboardResponse> {
    const endpoint = API_ENDPOINTS.leaderboard.live;
    const url = `${endpoint}?time_period=${timePeriod}&order_by=${orderBy}&limit=${limit}&offset=${offset}`;
    // POST request with query parameters
    return fetchApi<LeaderboardResponse>(url, 60000, 'POST');
}

/**
 * Fetch biggest winners from Polymarket API
 * @param timePeriod - Time period: day, week, month, or all
 * @param limit - Maximum number of entries
 * @param offset - Offset for pagination
 */
export async function fetchBiggestWinners(
    timePeriod: 'day' | 'week' | 'month' | 'all' = 'day',
    limit: number = 20,
    offset: number = 0
): Promise<LeaderboardResponse> {
    const endpoint = API_ENDPOINTS.leaderboard.biggestWinners;
    const url = `${endpoint}?time_period=${timePeriod}&limit=${limit}&offset=${offset}`;
    return fetchApi<LeaderboardResponse>(url, 60000, 'GET');
}

/**
 * Fetch markets from the API
 * @param status - Market status filter ('active', 'resolved', 'closed', etc.)
 * @param limit - Number of markets per page
 * @param offset - Offset for pagination
 * @param tagSlug - Optional tag filter (e.g., 'sports', 'politics', 'crypto')
 */
export async function fetchMarkets(
    status: string = 'active',
    limit: number = 20,
    offset: number = 0,
    tagSlug?: string
): Promise<MarketsResponse> {
    let url = `${API_ENDPOINTS.markets.list}?status=${status}&limit=${limit}&offset=${offset}`;
    if (tagSlug) {
        url += `&tag_slug=${encodeURIComponent(tagSlug)}`;
    }
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
 * @param timePeriod - Time period for filtering (day, week, month, all)
 * @param orderBy - Order by metric (PNL, VOL)
 * @param limit - Maximum number of traders to return
 * @param offset - Offset for pagination
 */
export async function fetchViewAllLeaderboards(
    timePeriod: 'day' | 'week' | 'month' | 'all' = 'all',
    orderBy: 'PNL' | 'VOL' = 'PNL',
    limit: number = 100,
    offset: number = 0
): Promise<AllLeaderboardsResponse> {
    const url = `${API_ENDPOINTS.leaderboard.viewAll}?time_period=${timePeriod}&order_by=${orderBy}&limit=${limit}&offset=${offset}`;
    return fetchApi<AllLeaderboardsResponse>(url, 60000, 'GET');
}

/**
 * Fetch analytics from database with retry logic
 */
export async function fetchTradersAnalytics(limit: number = 100, offset: number = 0, retries: number = 2): Promise<AllLeaderboardsResponse> {
    // Use longer timeout (120 seconds) for analytics endpoint as it processes many traders
    // Don't pass max_traders to process all traders (backend will handle pagination)
    const url = `${API_ENDPOINTS.traders.list}/analytics?limit=${limit}&offset=${offset}`;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fetchApi<AllLeaderboardsResponse>(url, 120000, 'GET');
        } catch (error: any) {
            const isLastAttempt = attempt === retries;
            const isTimeout = error?.status === 408 || error?.message?.includes('timeout');
            
            if (isLastAttempt) {
                throw error; // Re-throw on last attempt
            }
            
            if (isTimeout) {
                // Wait before retrying (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
                console.log(`Request timeout, retrying in ${delay}ms... (attempt ${attempt + 1}/${retries + 1})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error; // Don't retry on non-timeout errors
            }
        }
    }
    
    throw new Error('Failed to fetch analytics after retries');
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
 * Fetch market details by slug from Polymarket API
 * @param marketSlug - Market slug identifier
 */
export async function fetchMarketDetails(marketSlug: string): Promise<any> {
    return fetchApi<any>(`/markets/${encodeURIComponent(marketSlug)}`, 30000);
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

/**
 * Fetch comprehensive trade history for a wallet address
 * @param walletAddress - Wallet address to fetch trade history for
 */
export async function fetchTradeHistory(walletAddress: string): Promise<TradeHistoryResponse> {
    return fetchApi<TradeHistoryResponse>(`/trade-history?user=${walletAddress}`, 60000);
}

/**
 * Fetch comprehensive dashboard data from local database
 * @param walletAddress - Wallet address
 */
export async function fetchDBDashboard(walletAddress: string): Promise<any> {
    return fetchApi<any>(`/dashboard/db/${walletAddress}`, 30000);
}

/**
 * Trigger a full sync of wallet data from server to local database
 * @param walletAddress - Wallet address
 */
export async function syncDBDashboard(walletAddress: string): Promise<any> {
    return fetchApi<any>(`/dashboard/sync/${walletAddress}`, 120000, 'POST');
}

/**
 * Fetch rewards market data from Polymarket CLOB API
 * @param conditionId - Condition ID of the market
 */
export async function fetchRewardsMarket(conditionId: string): Promise<RewardsMarketResponse> {
    // Call Polymarket CLOB API directly
    const url = `https://clob.polymarket.com/rewards/markets/${conditionId}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data as RewardsMarketResponse;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
            throw {
                message: 'Request timeout - the server is taking too long to respond',
                status: 408,
            } as ApiError;
        }

        console.error('Rewards Market API Error:', error);
        throw {
            message: error instanceof Error ? error.message : 'An unknown error occurred',
            status: error instanceof Response ? error.status : undefined,
        } as ApiError;
    }
}

// ============================================================================
// AUTHENTICATION API
// ============================================================================

export interface RegisterRequest {
    email: string;
    name: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
}

export interface UserResponse {
    id: number;
    email: string;
    name: string;
}

/**
 * Register a new user
 */
export async function register(data: RegisterRequest): Promise<UserResponse> {
    const url = `${API_BASE_URL}${API_ENDPOINTS.auth.register}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Registration failed' }));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        return await response.json() as UserResponse;
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Registration Error:', error);
        throw {
            message: error instanceof Error ? error.message : 'An unknown error occurred',
            status: error instanceof Response ? error.status : undefined,
        } as ApiError;
    }
}

/**
 * Login user and get access token
 */
export async function login(data: LoginRequest): Promise<AuthResponse> {
    const url = `${API_BASE_URL}${API_ENDPOINTS.auth.login}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        return await response.json() as AuthResponse;
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Login Error:', error);
        throw {
            message: error instanceof Error ? error.message : 'An unknown error occurred',
            status: error instanceof Response ? error.status : undefined,
        } as ApiError;
    }
}
