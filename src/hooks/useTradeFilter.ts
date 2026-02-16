import { useState, useCallback, useEffect } from 'react';
import { fetchFilteredTrades } from '../services/api';
import { UserPnL } from '../types/api';

export type TradeFilter = 'recent10' | '7days' | '30days' | 'all';

export function useTradeFilter(walletAddress: string) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [trades, setTrades] = useState<UserPnL[]>([]);
    const [currentFilter, setCurrentFilter] = useState<TradeFilter | null>(null);

    // When wallet changes (e.g. user searched a new address), only clear state. Do NOT fetch.
    // Portfolio performance data is fetched only when user explicitly clicks a filter (Recent 10, 7 Days, 30 Days, All).
    useEffect(() => {
        setTrades([]);
        setCurrentFilter(null);
        setError(null);
    }, [walletAddress]);

    const fetchTrades = useCallback(async (filter: TradeFilter) => {
        if (!walletAddress) return;

        setLoading(true);
        setError(null);

        try {
            const result = await fetchFilteredTrades(walletAddress, filter);
            const tradeData = result.trades || [];

            setTrades(tradeData);
            setCurrentFilter(filter);
        } catch (err: any) {
            console.error('Error fetching filtered trades:', err);
            setError(err.message || 'Failed to fetch trades');
        } finally {
            setLoading(false);
        }
    }, [walletAddress]);

    /** Set filter without fetching (e.g. when "All Trades" uses existing closedPositions). */
    const setFilterOnly = useCallback((filter: TradeFilter | null) => {
        setCurrentFilter(filter);
    }, []);

    return {
        trades,
        loading,
        error,
        currentFilter,
        fetchTrades,
        setFilterOnly,
    };
}
