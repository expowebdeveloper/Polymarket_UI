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
    is_badge_holder?: boolean;
    user_tag?: {
        title: string;
        emoji: string;
        style: string;
    };
    streaks: {
        longest_streak: number;
        current_streak: number;
        total_wins: number;
        total_losses: number;
    };
    // New Detailed Metrics
    unrealized_pnl?: number;
    realized_pnl?: number;
    max_stake?: number;
    winning_stakes?: number;
    losing_stakes?: number;
    w_trade?: number;
    w_stake?: number;
    win_score_blended?: number;
    open_positions?: number;
    closed_positions?: number;
    /** Sum of all positive realized PnL (from Polymarket closed positions). */
    total_gains?: number;
    /** Sum of all losing realized PnL as positive number (from Polymarket closed positions). */
    total_losses?: number;
    /** Volume bonus multiplier (0 to 0.08): extra % applied to base rating for high prediction count. */
    volume_bonus?: number;
    /** Risk components from the equity-curve risk scoring algorithm. */
    risk_components?: {
        label: string;            // "Very Stable" | "Controlled" | "Moderate Risk" | "Aggressive" | "Highly Volatile" | "Insufficient Data"
        risk_score: number | null; // 0-100, higher = more stable
        drawdown_score: number | null;
        loss_severity_score: number | null;
        max_drawdown_units: number;
        p90_drawdown_units: number | null;
        reference_scale: number | null;
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
 * Volume bonus (piecewise linear) by prediction count N.
 * N < 500 → 0%; 500–2499 → 1% to 5%; 2500–4999 → 5% to 8%; N ≥ 5000 → 8% cap.
 * FinalRating = BaseRating × (1 + getVolumeBonus(N)).
 * Only eligible when total PnL is at least MIN_PNL_FOR_BONUS_USD ($1k).
 */
export const MIN_PNL_FOR_BONUS_USD = 1000;

export function getVolumeBonus(nPredictions: number): number {
    const n = nPredictions;
    if (n < 500) return 0;
    if (n < 2500) return 0.01 + 0.04 * (n - 500) / 2000;
    if (n < 5000) return 0.05 + 0.03 * (n - 2500) / 2500;
    return 0.08;
}

/** Min predictions required for Polyrating accuracy bonus. */
export const MIN_PREDICTIONS_FOR_POLYRATING_BONUS = 100;

/**
 * Stake Yield Bonus: % multiplier on base rating. Bucket by prediction count first;
 * within that bucket, pick the highest stake-yield threshold that matches (no stacking).
 * stakeYieldPct in percent (e.g. 5.2 means 5.2%). Predictions < 800 → 0%.
 * FinalRating = BaseRating × (1 + bonus_pct / 100).
 */
export function getStakeYieldBonusPct(nPredictions: number, stakeYieldPct: number): number {
    if (nPredictions < 800) return 0;
    const sy = stakeYieldPct;
    if (nPredictions >= 800 && nPredictions <= 1499) {
        if (sy > 10) return 5;
        if (sy > 8) return 4;
        if (sy > 5) return 3.5;
        if (sy > 3) return 3;
        return 0;
    }
    if (nPredictions >= 1500 && nPredictions <= 2999) {
        if (sy > 10) return 8;
        if (sy > 8) return 6;
        if (sy > 2.5) return 4;
        return 0;
    }
    if (nPredictions >= 3000 && nPredictions <= 4999) {
        if (sy > 10) return 10;
        if (sy > 5) return 7;
        if (sy > 2) return 5;
        return 0;
    }
    if (nPredictions >= 5000 && nPredictions <= 9999) {
        if (sy > 10) return 10;
        if (sy > 5) return 10;
        if (sy > 1.5) return 6;
        return 0;
    }
    // >= 10000
    if (sy > 10) return 20;
    if (sy > 5) return 15;
    if (sy >= 3) return 10;
    if (sy > 1) return 7;
    return 0;
}

/**
 * Polyrating bonus by WScore (accuracy). Only applies when nPredictions >= 100.
 * Moderate reward below 90%; aggressive elite reward from 90%+.
 *
 * Final Bonus Structure (WScore in %, bonus as decimal for multiplier):
 *   WScore        Bonus
 *   < 65%         0%
 *   65-74.99%     1%
 *   75-84.99%     2%
 *   85-89.99%     3%
 *   90-91.99%     5%
 *   92-93.99%     6%
 *   94-95.99%     7%
 *   96-97.99%     8%
 *   98-99.99%     9%
 *   100%          10%
 *
 * Used as: FinalRating = BaseRating × (1 + getPolyratingBonus(n, wScore)).
 *
 * @param nPredictions - Total predictions (unique markets); must be >= 100 for any bonus.
 * @param wScoreFraction - Win score in 0–1 (e.g. from calculateWinScore).
 */
export function getPolyratingBonus(nPredictions: number, wScoreFraction: number): number {
    if (nPredictions < MIN_PREDICTIONS_FOR_POLYRATING_BONUS) return 0;
    const pct = wScoreFraction * 100;
    if (pct < 65) return 0;
    if (pct < 75) return 0.01;   // 65-74.99%
    if (pct < 85) return 0.02;   // 75-84.99%
    if (pct < 90) return 0.03;   // 85-89.99%
    if (pct < 92) return 0.05;   // 90-91.99%
    if (pct < 94) return 0.06;   // 92-93.99%
    if (pct < 96) return 0.07;   // 94-95.99%
    if (pct < 98) return 0.08;   // 96-97.99%
    if (pct < 100) return 0.09;  // 98-99.99%
    return 0.10;                  // 100%
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

    // base_score = 0.225*W + 0.225*ROI + 0.50*PnL + 0.05*(1-Risk); base_rating = 100 * confidence(n) * base_score
    const base_score = 0.225 * win_score + 0.225 * roi_score + 0.50 * pnl_score + 0.05 * (1 - risk_score);
    const base_rating = 100 * confidence_score * base_score;
    // Polyrating bonus: min 100 predictions, bonus from WScore (65%+ = 1%, up to 10% at 100%)
    const volume_bonus = getPolyratingBonus(totalTrades, win_score);
    const stake_yield_bonus_pct = getStakeYieldBonusPct(totalTradesWithPnl, roi);
    const final_score = Math.min(99.9, base_rating * (1 + volume_bonus) * (1 + stake_yield_bonus_pct / 100));

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
        final_score,
        volume_bonus,
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
