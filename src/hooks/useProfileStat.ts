import { useState, useEffect, useCallback, useRef } from 'react';
import {
    fetchProfileStatData
} from '../services/api';
import { ScoredMetrics } from '../utils/scoring';
import { Position, ClosedPosition, Activity, UserPnL } from '../types/api';

export interface DataOrigin {
    live?: boolean;
    sources?: string[];
}

export interface ProfileStatState {
    loading: boolean;
    error: string | null;
    metrics: ScoredMetrics | null;
    positions: Position[];
    closedPositions: ClosedPosition[];
    activities: Activity[];
    userPnL: UserPnL[];
    portfolioValue?: number;
    dataOrigin?: DataOrigin | null;
}

// Per-wallet cache so switching profiles shows the correct cached data immediately
const profileStatCache = new Map<string, ProfileStatState>();

function stateFromData(data: Awaited<ReturnType<typeof fetchProfileStatData>>): ProfileStatState {
    const backendMetrics = data.scoring_metrics;
    const metrics: ScoredMetrics = {
        ...backendMetrics,
        risk_score: backendMetrics.score_risk || 0,
        win_score: backendMetrics.score_win_rate || 0,
        roi_score: backendMetrics.score_roi || 0,
        pnl_score: backendMetrics.score_pnl || 0,
        final_score: backendMetrics.final_score || 0,
    };
    return {
        loading: false,
        error: null,
        metrics,
        positions: data.positions || [],
        closedPositions: data.closed_positions || [],
        activities: data.activities || [],
        userPnL: data.trade_history?.trades || [],
        portfolioValue: data.portfolio_value,
        dataOrigin: data.data_origin ?? null,
    };
}

export function useProfileStat(walletAddress: string) {
    const [state, setState] = useState<ProfileStatState>(() => {
        if (!walletAddress) {
            return {
                loading: true,
                error: null,
                metrics: null,
                positions: [],
                closedPositions: [],
                activities: [],
                userPnL: [],
                portfolioValue: undefined,
            };
        }
        const cached = profileStatCache.get(walletAddress);
        if (cached) return { ...cached };
        return {
            loading: true,
            error: null,
            metrics: null,
            positions: [],
            closedPositions: [],
            activities: [],
            userPnL: [],
            portfolioValue: undefined,
        };
    });

    const fetchData = useCallback(async (includeTrades: boolean = false) => {
        if (!walletAddress) {
            setState({
                loading: false,
                error: null,
                metrics: null,
                positions: [],
                closedPositions: [],
                activities: [],
                userPnL: [],
                portfolioValue: undefined,
            });
            return;
        }

        const hasCached = profileStatCache.has(walletAddress);
        if (!hasCached) setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const data = await fetchProfileStatData(walletAddress, !includeTrades);
            const newState = stateFromData(data);
            profileStatCache.set(walletAddress, newState);
            setState(newState);
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
        if (!walletAddress) return;
        const cached = profileStatCache.get(walletAddress);
        if (cached) setState({ ...cached });
        fetchData();
    }, [walletAddress, fetchData]);

    const refreshWithTrades = useCallback(() => fetchData(true), [fetchData]);

    return {
        ...state,
        refresh: () => fetchData(false),
        refreshWithTrades,
    };
}
