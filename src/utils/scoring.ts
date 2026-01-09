import { Position, ClosedPosition, Activity } from '../types/api';

export interface ScoredMetrics {
    total_pnl: number;
    roi: number;
    win_rate: number;
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    total_trades_with_pnl: number;
    total_stakes: number;
    worst_loss: number;
    largest_win: number;
    max_drawdown: number;
    stake_volatility: number;
    total_volume: number;
    buy_volume: number;
    sell_volume: number;
    final_score: number;
    risk_score: number;
    win_score: number;
    confidence_score: number;
    roi_score: number;
    pnl_score: number;
    streaks: {
        longest_streak: number;
        current_streak: number;
        total_wins: number;
        total_losses: number;
    };
}

/**
 * Logarithmic interpolation helper matching backend.
 */
function logInterpolate(x: number, x_min: number, x_max: number, s_min: number, s_max: number): number {
    if (x <= x_min) return s_min;
    if (x >= x_max) return s_max;

    try {
        const logX = Math.log(x);
        const logXMin = Math.log(x_min);
        const logXMax = Math.log(x_max);

        return s_min + (s_max - s_min) * (logX - logXMin) / (logXMax - logXMin);
    } catch (e) {
        return s_min;
    }
}

/**
 * Calculate PnL Score (0-1) matching scoring_engine.py.
 */
export function calculatePnLScore(pnl: number): number {
    if (pnl >= 0) {
        if (pnl < 1) return 0.15 + (0.25 - 0.15) * (pnl / 100.0);
        if (pnl < 100) return logInterpolate(pnl, 1, 100, 0.15, 0.25);
        if (pnl < 1000) return logInterpolate(pnl, 100, 1000, 0.25, 0.40);
        if (pnl < 5000) return logInterpolate(pnl, 1000, 5000, 0.40, 0.60);
        if (pnl < 10000) return logInterpolate(pnl, 5000, 10000, 0.60, 0.75);
        if (pnl < 50000) return logInterpolate(pnl, 10000, 50000, 0.75, 0.85);
        if (pnl < 100000) return logInterpolate(pnl, 50000, 100000, 0.85, 0.92);
        if (pnl < 500000) return logInterpolate(pnl, 100000, 500000, 0.92, 0.98);
        if (pnl < 1000000) return logInterpolate(pnl, 500000, 1000000, 0.98, 0.999);
        return 1.0;
    } else {
        const absPnl = Math.abs(pnl);
        if (absPnl < 100) return logInterpolate(absPnl, 10, 100, 0.20, 0.15);
        if (absPnl < 1000) return logInterpolate(absPnl, 100, 1000, 0.15, 0.10);
        if (absPnl < 10000) return logInterpolate(absPnl, 1000, 10000, 0.10, 0.05);

        try {
            const lnPnl = Math.log(absPnl);
            const ln10k = Math.log(10000);
            const ln1m = Math.log(1000000);
            const term = (lnPnl - ln10k) / (ln1m - ln10k);
            const score = 0.05 * (1.0 - term);
            return Math.max(0.0, score);
        } catch {
            return 0.0;
        }
    }
}

/**
 * Calculate Risk Score (Average Worst Loss / Total Stake).
 */
export function calculateRiskScore(losses: number[], totalStake: number, totalTrades: number): number | null {
    if (totalTrades < 10) return null;
    if (losses.length === 0 || totalStake <= 0) return 0;

    const k = Math.floor(totalTrades / 10);
    const absLosses = losses.map(Math.abs).sort((a, b) => b - a);
    const m = Math.min(k, absLosses.length);

    if (m === 0) return 0;
    const avgWorstLoss = absLosses.slice(0, m).reduce((a, b) => a + b, 0) / m;
    return avgWorstLoss / totalStake;
}

/**
 * Calculate Win Score (0.5 * W_trade + 0.5 * W_stake).
 */
export function calculateWinScore(winRateTrade: number, winRateStake: number): number {
    return 0.5 * winRateTrade + 0.5 * winRateStake;
}

/**
 * Calculate Confidence Score based on number of predictions.
 */
export function calculateConfidenceScore(nPredictions: number): number {
    if (nPredictions <= 0) return 0;
    const x = nPredictions / 16.0;
    const y = Math.pow(x, 0.60);
    const z = Math.exp(-y);
    return 1.0 - z;
}

/**
 * Calculate ROI Score using tanh-based logarithmic scale.
 */
export function calculateRoiScore(roi: number): number {
    try {
        const lnTerm = Math.log1p(Math.abs(roi));
        const signRoi = roi >= 0 ? 1.0 : -1.0;
        const sRoi = 0.6;
        const tanhTerm = Math.tanh(sRoi * signRoi * lnTerm);
        return (1.0 + tanhTerm) / 2.0;
    } catch {
        return 0.5;
    }
}

/**
 * Calculate Maximum Drawdown.
 */
export function calculateMaxDrawdown(equityCurve: number[]): number {
    if (equityCurve.length === 0) return 0;
    let maxDD = 0;
    let peak = -Infinity;
    for (const val of equityCurve) {
        if (val > peak) peak = val;
        const dd = peak - val;
        if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
}

/**
 * Orchestrate all calculations from raw data.
 */
export function calculateLiveMetrics(
    positions: Position[],
    closedPositions: ClosedPosition[],
    activities: Activity[]
): ScoredMetrics {
    let totalRealizedPnl = 0;
    let totalUnrealizedPnl = 0;
    let totalRewards = 0;
    let buyVolume = 0;
    let sellVolume = 0;

    // Trades/Wins Metrics
    let totalStakes = 0;
    let winningTradesCount = 0;
    let totalTradesWithPnl = 0;
    let stakesOfWins = 0;
    let sumSqStakes = 0;
    let worstLoss = 0;
    let largestWin = 0;
    const allLosses: number[] = [];
    const stakesList: number[] = [];

    // Streaks
    let currentStreak = 0;
    let maxStreak = 0;
    let totalWins = 0;
    let totalLosses = 0;

    // Equity Curve for MDD
    const sortedClosed = [...closedPositions].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeA - timeB;
    });

    let runningPnl = 0;
    const equityCurve: number[] = [0];

    // Process activities for rewards and buy/sell volume
    activities.forEach(a => {
        const size = Number(a.usdc_size || 0);
        if (a.type === 'REWARD') totalRewards += size;

        if (a.side === 'BUY') {
            buyVolume += size;
        } else if (a.side === 'SELL') {
            sellVolume += size;
        } else {
            // Include other activity volume if relevant, but typically we want split
            // If it's a generic TRADE with no side, we'll just count it in buy for now? 
            // Or just leave it as general total volume.
        }
    });

    // Process Closed Positions
    sortedClosed.forEach(cp => {
        const stake = Number(cp.size || 0) * Number(cp.avg_price || 0);
        totalStakes += stake;
        sumSqStakes += stake ** 2;
        stakesList.push(stake);

        const pnl = Number(cp.realized_pnl || 0);
        totalRealizedPnl += pnl;
        runningPnl += pnl;
        equityCurve.push(runningPnl);

        totalTradesWithPnl++;
        if (pnl > 0) {
            winningTradesCount++;
            stakesOfWins += stake;
            totalWins++;
            currentStreak++;
            if (currentStreak > maxStreak) maxStreak = currentStreak;
            if (pnl > largestWin) largestWin = pnl;
        } else if (pnl < 0) {
            totalLosses++;
            currentStreak = 0;
            allLosses.push(pnl);
            if (pnl < worstLoss) worstLoss = pnl;
        }
    });

    // Process Active Positions
    positions.forEach(p => {
        const stake = Number(p.initial_value || 0);
        totalStakes += stake;
        sumSqStakes += stake ** 2;
        stakesList.push(stake);

        totalUnrealizedPnl += Number(p.cash_pnl || 0); // Position.cash_pnl is usually the total pnl for that position

        if (Number(p.cash_pnl) < 0) {
            allLosses.push(Number(p.cash_pnl));
            if (Number(p.cash_pnl) < worstLoss) worstLoss = Number(p.cash_pnl);
        } else if (Number(p.cash_pnl) > largestWin) {
            largestWin = Number(p.cash_pnl);
        }
    });

    const totalPnl = totalRealizedPnl + totalUnrealizedPnl + totalRewards;

    // Deduplicated Predictions (unique markets)
    const uniqueClosedMarkets = new Set(closedPositions.map(cp => cp.condition_id));
    const uniqueActiveMarkets = new Set(positions.map(p => p.condition_id));
    const totalTrades = uniqueClosedMarkets.size + uniqueActiveMarkets.size;

    const roi = totalStakes > 0 ? (totalPnl / totalStakes) * 100 : 0;
    const winRate = totalTradesWithPnl > 0 ? (winningTradesCount / totalTradesWithPnl) * 100 : 0;

    const stakeVol = stakesList.length > 0 ? (() => {
        const mean = totalStakes / stakesList.length;
        if (mean <= 0) return 0;
        const variance = (sumSqStakes / stakesList.length) - (mean ** 2);
        const stdDev = Math.sqrt(Math.max(0, variance));
        return stdDev / mean;
    })() : 0;

    // Scores
    const pnl_score = calculatePnLScore(totalPnl);
    const win_rate_trade = totalTradesWithPnl > 0 ? winningTradesCount / totalTradesWithPnl : 0;
    const win_rate_stake = totalStakes > 0 ? stakesOfWins / totalStakes : 0;

    const win_score = calculateWinScore(win_rate_trade, win_rate_stake);
    const risk_score = calculateRiskScore(allLosses, totalStakes, totalTrades) || 0;
    const confidence_score = calculateConfidenceScore(totalTrades);
    const roi_score = calculateRoiScore(roi / 100); // Input as fractional roi

    return {
        total_pnl: totalPnl,
        roi,
        win_rate: winRate,
        total_trades: totalTrades,
        winning_trades: winningTradesCount,
        losing_trades: totalLosses,
        total_trades_with_pnl: totalTradesWithPnl,
        total_stakes: totalStakes,
        worst_loss: worstLoss,
        largest_win: largestWin,
        max_drawdown: calculateMaxDrawdown(equityCurve),
        stake_volatility: stakeVol,
        total_volume: buyVolume + sellVolume,
        buy_volume: buyVolume,
        sell_volume: sellVolume,
        final_score: pnl_score * 100,
        risk_score,
        win_score,
        confidence_score,
        roi_score,
        pnl_score,
        streaks: {
            longest_streak: maxStreak,
            current_streak: currentStreak,
            total_wins: totalWins,
            total_losses: totalLosses
        }
    };
}
