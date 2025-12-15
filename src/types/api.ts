// Trader Types
export interface Trader {
    wallet_address: string;
    total_trades: number;
    total_positions: number;
    first_trade_date: string | null;
    last_trade_date: string | null;
}

export interface TradersResponse {
    count: number;
    traders: Trader[];
}

export interface TraderDetails {
    wallet_address: string;
    total_trades: number;
    total_positions: number;
    first_trade_date: string | null;
    last_trade_date: string | null;
    // Add more fields as they become available from the API
}

export interface TraderBasicInfo {
    wallet_address: string;
    // Add fields based on the actual API response
}

export interface Trade {
    proxyWallet: string;
    side: string;
    asset: string;
    conditionId: string;
    size: string;
    price: string;
    timestamp: number;
    title?: string;
    slug?: string;
    icon?: string;
    eventSlug?: string;
    outcome?: string;
    outcomeIndex?: number;
    name?: string;
    pseudonym?: string;
    bio?: string;
    profileImage?: string;
    profileImageOptimized?: string;
    transactionHash: string;
}

export interface TradesResponse {
    wallet_address: string;
    count: number;
    trades: Trade[];
}

// Position Types
export interface Position {
    proxy_wallet: string;
    asset: string;
    condition_id: string;
    size: number;
    avg_price: number;
    initial_value: number;
    current_value: number;
    cash_pnl: number;
    percent_pnl: number;
    total_bought: number;
    realized_pnl: number;
    percent_realized_pnl: number;
    cur_price: number;
    redeemable: boolean;
    mergeable: boolean;
    title?: string;
    slug?: string;
    icon?: string;
    event_id?: string;
    event_slug?: string;
    outcome?: string;
    outcome_index?: number;
    opposite_outcome?: string;
    opposite_asset?: string;
    end_date?: string;
    negative_risk: boolean;
}

export interface PositionsResponse {
    wallet_address: string;
    count: number;
    positions: Position[];
}

// Closed Position Types
export interface UserLeaderboardData {
    rank?: string;
    proxyWallet: string;
    userName?: string;
    xUsername?: string;
    verifiedBadge: boolean;
    vol: number;
    pnl: number;
    profileImage?: string;
}

export interface ClosedPosition {
    proxy_wallet: string;
    asset: string;
    condition_id: string;
    avg_price: number;
    cur_price: number;
    size: number;
    realized_pnl: number;
    title?: string;
    slug?: string;
    icon?: string;
    outcome?: string;
    end_date?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ClosedPositionsResponse {
    positions: ClosedPosition[];
}

// Activity Types
export interface Activity {
    proxy_wallet: string;
    timestamp: number;
    condition_id?: string;
    type: string;
    size: number;
    usdc_size: number;
    transaction_hash: string;
    price: number;
    asset?: string;
    side?: string;
    outcome_index?: number;
    title?: string;
    slug?: string;
    icon?: string;
    event_slug?: string;
    outcome?: string;
    name?: string;
    pseudonym?: string;
    bio?: string;
    profile_image?: string;
    profile_image_optimized?: string;
}

export interface ActivitiesResponse {
    wallet_address: string;
    count: number;
    activities: Activity[];
}

// Profile Stats Types
export interface ProfileStats {
    proxyAddress: string;
    username?: string;
    trades: number;
    largestWin: string;
    views: number;
    joinDate?: string;
}

export interface ProfileStatsResponse {
    proxyAddress: string;
    username?: string;
    trades: number;
    largestWin: string;
    views: number;
    joinDate?: string;
}

// API Error Type
export interface ApiError {
    message: string;
    status?: number;
}

// Leaderboard Types
export interface LeaderboardEntry {
    rank: number;
    wallet_address: string;
    name?: string;
    pseudonym?: string;
    profile_image?: string;
    total_pnl: number;
    roi: number;
    win_rate: number;
    total_trades: number;
    total_trades_with_pnl: number;
    winning_trades: number;
    total_stakes: number;
    score_win_rate?: number;
    score_roi?: number;
    score_pnl?: number;
    score_risk?: number;
}

export interface LeaderboardResponse {
    period: string;
    metric: string;
    count: number;
    entries: LeaderboardEntry[];
}

// Market Types
export interface Market {
    id?: string;
    market_id?: string;
    slug?: string;
    question?: string;
    title?: string;
    description?: string;
    status?: string;
    resolution?: string;
    category?: string;
    tags?: string[];
    endDate?: string;
    end_date?: string;
    volume?: number;
    liquidity?: number;
    price?: number;
    outcomePrices?: Record<string, number>;
    icon?: string;
    image?: string;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
    [key: string]: any; // Allow additional fields from API
}

export interface PaginationInfo {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
}

// Market Order Types
export interface MarketOrder {
    token_id: string;
    token_label: string;
    side: 'BUY' | 'SELL';
    market_slug: string;
    condition_id: string;
    shares: number;
    price: number;
    tx_hash: string;
    title: string;
    timestamp: number;
    order_hash: string;
    user: string;
    taker: string;
    shares_normalized: number;
}

export interface MarketOrdersResponse {
    orders: MarketOrder[];
    pagination: PaginationInfo;
}

// Trader Rating Types
export interface TraderRating {
    user: string;
    total_orders: number;
    buy_orders: number;
    sell_orders: number;
    total_shares: number;
    win_count: number;
    lose_count: number;
    rating: number; // Win rate percentage
    total_volume: number;
}

export interface MarketsResponse {
    count: number;
    markets: Market[];
    pagination?: PaginationInfo;
}
