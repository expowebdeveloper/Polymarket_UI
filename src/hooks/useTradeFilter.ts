import { useState, useRef, useCallback } from 'react';
import { fetchFilteredTrades } from '../services/api';
import { UserPnL } from '../types/api';

export type TradeFilter = 'recent10' | '7days' | '30days' | '1year' | 'all';

interface TradeCache {
    [key: string]: {
        data: UserPnL[];
        timestamp: number;
    };
}

export function useTradeFilter(walletAddress: string) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [trades, setTrades] = useState<UserPnL[]>([]);
    const [currentFilter, setCurrentFilter] = useState<TradeFilter | null>(null);

    // Cache for storing fetched trade data
    const cacheRef = useRef<TradeCache>({});

    const fetchTrades = useCallback(async (filter: TradeFilter) => {
        if (!walletAddress) return;

        // Check cache first
        const cacheKey = `${walletAddress}-${filter}`;
        const cached = cacheRef.current[cacheKey];

        if (cached) {
            console.log(`Using cached trades for filter: ${filter}`);
            setTrades(cached.data);
            setCurrentFilter(filter);
            return;
        }

        // Fetch from API
        setLoading(true);
        setError(null);

        try {
            const result = await fetchFilteredTrades(walletAddress, filter);
            const tradeData = result.trades || [];

            // Store in cache
            cacheRef.current[cacheKey] = {
                data: tradeData,
                timestamp: Date.now()
            };

            setTrades(tradeData);
            setCurrentFilter(filter);
        } catch (err: any) {
            console.error('Error fetching filtered trades:', err);
            setError(err.message || 'Failed to fetch trades');
        } finally {
            setLoading(false);
        }
    }, [walletAddress]);

    const clearCache = useCallback(() => {
        cacheRef.current = {};
    }, []);

    return {
        trades,
        loading,
        error,
        currentFilter,
        fetchTrades,
        clearCache
    };
}
