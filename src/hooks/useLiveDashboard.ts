import { useState, useEffect, useCallback } from 'react';
import {
    fetchLiveDashboardData
} from '../services/api';
import { ScoredMetrics } from '../utils/scoring';
import { Position, ClosedPosition, Activity, UserPnL } from '../types/api';

export interface LiveDashboardState {
    loading: boolean;
    error: string | null;
    metrics: ScoredMetrics | null;
    positions: Position[];
    closedPositions: ClosedPosition[];
    activities: Activity[];
    userPnL: UserPnL[];
}

export function useLiveDashboard(walletAddress: string) {
    const [state, setState] = useState<LiveDashboardState>({
        loading: true,
        error: null,
        metrics: null,
        positions: [],
        closedPositions: [],
        activities: [],
        userPnL: [],
    });

    const fetchData = useCallback(async () => {
        if (!walletAddress) return;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const data = await fetchLiveDashboardData(walletAddress);

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
            });
        } catch (err: any) {
            console.error('Error fetching live dashboard data:', err);
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

    return {
        ...state,
        refresh: fetchData
    };
}
