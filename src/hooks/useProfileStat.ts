import { useState, useEffect, useCallback } from 'react';
import {
    fetchProfileStatData
} from '../services/api';
import { ScoredMetrics } from '../utils/scoring';
import { Position, ClosedPosition, Activity, UserPnL } from '../types/api';

export interface ProfileStatState {
    loading: boolean;
    error: string | null;
    metrics: ScoredMetrics | null;
    positions: Position[];
    closedPositions: ClosedPosition[];
    activities: Activity[];
    userPnL: UserPnL[];
    portfolioValue?: number;
}

export function useProfileStat(walletAddress: string) {
    const [state, setState] = useState<ProfileStatState>({
        loading: true,
        error: null,
        metrics: null,
        positions: [],
        closedPositions: [],
        activities: [],
        userPnL: [],
        portfolioValue: undefined,
    });

    const fetchData = useCallback(async (includeTrades: boolean = false) => {
        if (!walletAddress) return;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const data = await fetchProfileStatData(walletAddress, !includeTrades);

            // Use backend pre-calculated metrics directly (Single Source of Truth)
            const backendMetrics = data.scoring_metrics;
            const metrics: ScoredMetrics = {
                ...backendMetrics,
                // Ensure field naming compatibility between backend and frontend
                risk_score: backendMetrics.score_risk || 0,
                win_score: backendMetrics.score_win_rate || 0,
                roi_score: backendMetrics.score_roi || 0,
                pnl_score: backendMetrics.score_pnl || 0,
                final_score: backendMetrics.final_score || 0,
            };

            setState({
                loading: false,
                error: null,
                metrics,
                positions: data.positions || [],
                closedPositions: data.closed_positions || [],
                activities: data.activities || [],
                userPnL: data.trade_history?.trades || [],
                portfolioValue: data.portfolio_value,
            });
        } catch (err: any) {
            console.error('Error fetching profile stat data:', err);
            setState(prev => ({
                ...prev,
                loading: false,
                error: err.message || 'Failed to fetch live data'
            }));
        }
    }, [walletAddress]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const refreshWithTrades = useCallback(() => fetchData(true), [fetchData]);

    return {
        ...state,
        refresh: () => fetchData(false),
        refreshWithTrades,
    };
}
