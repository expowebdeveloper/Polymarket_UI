import { useState, useEffect, useCallback } from 'react';
import {
    fetchPositionsForWallet,
    fetchClosedPositionsForWallet,
    fetchActivityForWallet,
    fetchUserPnL
} from '../services/api';
import { calculateLiveMetrics, ScoredMetrics } from '../utils/scoring';
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
            const [
                posRes,
                closedRes,
                activityRes,
                pnlRes
            ] = await Promise.all([
                fetchPositionsForWallet(walletAddress),
                fetchClosedPositionsForWallet(walletAddress),
                fetchActivityForWallet(walletAddress),
                fetchUserPnL(walletAddress)
            ]);

            const metrics = calculateLiveMetrics(
                posRes.positions,
                closedRes,
                activityRes.activities
            );

            setState({
                loading: false,
                error: null,
                metrics,
                positions: posRes.positions,
                closedPositions: closedRes,
                activities: activityRes.activities,
                userPnL: pnlRes.data || [],
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
