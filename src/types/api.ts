// Trader Types
export interface Trader {
    wallet_address: string;
    total_trades: number;
    total_positions: number;
    first_trade_date: string | null;
    last_trade_date: string | null;
    // Optional fields for DB Leaderboard
    userName?: string;
    profileImage?: string;
    vol?: number;
    pnl?: number;
    winRate?: number;
}

export interface TradersResponse {
    count: number;
    traders: Trader[];
}

export interface TraderDetails {
    wallet_address: string;
    total_trades: number;
    total_positions: number;
    active_positions: number;
    total_wins: number;
    total_losses: number;
    win_rate_percent: number;
    pnl: number;
    final_score: number;
    first_trade_date: string | null;
    last_trade_date: string | null;
    categories: Record<string, {
        total_wins: number;
        total_losses: number;
        win_rate_percent: number;
        pnl: number;
    }>;
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

export interface EnhancedProfileStatsResponse {
    proxyAddress: string;
    username?: string;
    name?: string;
    pseudonym?: string;
    profileImage?: string;

    // Highlighted Metrics
    finalScore: number;
    topPercent: number;
    rankingTag: string;
    longestWinningStreak: number;
    currentWinningStreak: number;

    // View Details Metrics
    biggestWin: number;
    worstLoss: number;
    maximumStake: number;
    portfolioValue: number;
    averageStakeValue: number;

    // Additional Info
    rank?: number;
    totalTrades: number;
    totalPnl: number;
    roi: number;
    winRate: number;
}

export interface UserPnL {
    t: number;
    p: number;
}

export interface UserPnLResponse {
    user_address: string;
    interval: string;
    fidelity: string;
    count: number;
    data: UserPnL[];
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
    final_score?: number;
    // Intermediate values for leaderboard sorting
    W_shrunk?: number;
    roi_shrunk?: number;
    pnl_shrunk?: number;
}

export interface LeaderboardResponse {
    period: string;
    metric: string;
    count: number;
    entries: LeaderboardEntry[];
}

export interface PercentileInfo {
    w_shrunk_1_percent: number;
    w_shrunk_99_percent: number;
    roi_shrunk_1_percent: number;
    roi_shrunk_99_percent: number;
    pnl_shrunk_1_percent: number;
    pnl_shrunk_99_percent: number;
    population_size: number;
}

export interface MedianInfo {
    roi_median: number;
    pnl_median: number;
}

export interface AllLeaderboardsResponse {
    percentiles: PercentileInfo;
    medians: MedianInfo;
    leaderboards: {
        w_shrunk?: LeaderboardEntry[];
        roi_raw?: LeaderboardEntry[];
        roi_shrunk?: LeaderboardEntry[];
        pnl_shrunk?: LeaderboardEntry[];
        score_win_rate?: LeaderboardEntry[];
        score_roi?: LeaderboardEntry[];
        score_pnl?: LeaderboardEntry[];
        score_risk?: LeaderboardEntry[];
        final_score?: LeaderboardEntry[];
    };
    total_traders: number;
    population_traders: number;
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
    condition_id?: string;
    [key: string]: any; // Allow additional fields from API
}

// Rewards Market Types
export interface RewardsMarketToken {
    token_id: string;
    outcome: string;
    price: number;
}

export interface RewardsConfig {
    asset_address: string;
    start_date: string;
    end_date: string;
    id: number;
    rate_per_day: number;
    total_rewards: number;
    total_days: number;
}

export interface RewardsMarketData {
    condition_id: string;
    question: string;
    market_slug: string;
    event_slug: string;
    image: string;
    tokens: RewardsMarketToken[];
    rewards_config: RewardsConfig[];
    rewards_max_spread: number;
    rewards_min_size: number;
    market_competitiveness: number;
}

export interface RewardsMarketResponse {
    data: RewardsMarketData[];
    next_cursor: string;
    limit: number;
    count: number;
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

// Trade History Types
export interface TradeHistoryTrade {
    id: number;
    proxy_wallet: string;
    side: string;
    asset: string;
    condition_id: string;
    size: number;
    price: number;
    entry_price?: number | null;
    exit_price?: number | null;
    pnl?: number | null;
    roi?: number | null;
    timestamp: number;
    title?: string | null;
    slug?: string | null;
    icon?: string | null;
    event_slug?: string | null;
    outcome?: string | null;
    outcome_index?: number | null;
    transaction_hash: string;
    category: string;
}

export interface TradeHistoryOpenPosition {
    id: number;
    proxy_wallet: string;
    asset: string;
    condition_id: string;
    size: number;
    avg_price: number;
    initial_value: number;
    current_value: number;
    cash_pnl: number;
    percent_pnl: number;
    cur_price: number;
    roi?: number | null;
    title?: string | null;
    slug?: string | null;
    icon?: string | null;
    outcome?: string | null;
    category: string;
}

export interface TradeHistoryClosedPosition {
    id: number;
    proxy_wallet: string;
    asset: string;
    condition_id: string;
    avg_price: number;
    cur_price: number;
    realized_pnl: number;
    roi?: number | null;
    title?: string | null;
    slug?: string | null;
    icon?: string | null;
    outcome?: string | null;
    timestamp: number;
    category: string;
}

export interface OverallMetrics {
    total_pnl: number;
    realized_pnl: number;
    unrealized_pnl: number;
    roi: number;
    win_rate: number;
    winning_trades: number;
    losing_trades: number;
    total_trades: number;
    total_trades_with_pnl?: number;
    score: number;
    total_volume: number;
}

export interface CategoryMetrics {
    roi: number;
    pnl: number;
    realized_pnl: number;
    unrealized_pnl: number;
    win_rate: number;
    winning_trades: number;
    losing_trades: number;
    total_trades: number;
    score: number;
    total_volume: number;
}

export interface TradeHistoryResponse {
    wallet_address: string;
    open_positions: TradeHistoryOpenPosition[];
    closed_positions: TradeHistoryClosedPosition[];
    trades: TradeHistoryTrade[];
    overall_metrics: OverallMetrics;
    category_breakdown: Record<string, CategoryMetrics>;
}

// Leaderboard Trader Types
export interface LeaderboardTrader {
    wallet_address: string;
    rank?: number;
    userName?: string;
    xUsername?: string;
    verifiedBadge: boolean;
    profileImage?: string;
    vol: number;
    pnl: number;
    roi?: number;
    winRate?: number;
    totalTrades: number;
}

export interface LeaderboardTradersResponse {
    count: number;
    traders: LeaderboardTrader[];
    pagination?: PaginationInfo;
}
