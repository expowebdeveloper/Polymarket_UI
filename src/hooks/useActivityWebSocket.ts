import { useEffect, useState, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config';

export interface Activity {
    id: string;
    user: string;
    user_address: string;
    market_id: string;
    market: string;
    side: 'BUY' | 'SELL';
    amount_usd: number;
    price: number;
    size: number;
    outcome: string;
    timestamp: number;
}

interface WebSocketMessage {
    type: string;
    data?: Activity | Activity[]; // Can be single or batch
    message?: string;
    timestamp?: number | null;
}

const STORAGE_KEY = 'polymarket_activities_v2';

export function useActivityWebSocket() {
    const [activities, setActivities] = useState<Activity[]>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return Array.isArray(parsed) ? parsed : [];
            }
        } catch (error) {
            console.error('Failed to load activities from storage:', error);
        }
        return [];
    });

    const [isConnected, setIsConnected] = useState(false);
    const [lastSyncAt, setLastSyncAt] = useState<number>(Date.now());
    const ws = useRef<WebSocket | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

    // Save to localStorage (debounced-ish via useEffect dependency)
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(activities.slice(0, 2000)));
        } catch (error) {
            console.error('Failed to save activities to storage:', error);
        }
    }, [activities]);

    // Initial fetch from API (Fallback/Fast-Load)
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const { fetchGlobalActivity } = await import('../services/api');
                const data = await fetchGlobalActivity();
                if (Array.isArray(data) && data.length > 0) {
                    setActivities(prev => {
                        const existingIds = new Set(prev.map(a => a.id));
                        const newOnes = (data as Activity[]).filter(a => !existingIds.has(a.id));
                        if (newOnes.length === 0) return prev;
                        return [...newOnes, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 2000);
                    });
                }
            } catch (error) {
                console.error('Failed to fetch initial activity from API:', error);
            }
        };
        fetchInitial();
    }, []);

    const connect = useCallback(() => {
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
        }

        try {

            // Derive WS URL from API_BASE_URL to match environment (local vs production)
            const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
            const wsBase = API_BASE_URL.replace(/^https?:\/\//, '');
            const wsUrl = `${wsProtocol}://${wsBase}/ws/activity`;
            // Use local variable to avoid closure staleness on 'ws.current' if possible, 
            // but updating ref is standard pattern.
            const socket = new WebSocket(wsUrl);
            ws.current = socket;

            socket.onopen = () => {
                console.log('✅ WebSocket connected');
                setIsConnected(true);
                setLastSyncAt(Date.now());
            };

            socket.onmessage = (event) => {
                const message: WebSocketMessage = JSON.parse(event.data);

                if (['heartbeat', 'new_activity', 'new_activity_batch', 'initial_activity_batch'].includes(message.type)) {
                    setLastSyncAt(Date.now());
                }

                if (message.type === 'initial_activity_batch' && Array.isArray(message.data)) {
                    setActivities(prev => {
                        // Merge and sort
                        const existingIds = new Set(prev.map(a => a.id));
                        const newOnes = (message.data as Activity[]).filter(a => !existingIds.has(a.id));
                        if (newOnes.length === 0) return prev;

                        return [...newOnes, ...prev].sort((a, b) => b.timestamp - a.timestamp).slice(0, 2000);
                    });
                } else if (message.type === 'new_activity_batch' && Array.isArray(message.data)) {
                    setActivities(prev => {
                        const existingIds = new Set(prev.map(a => a.id));
                        const newOnes = (message.data as Activity[]).filter(a => !existingIds.has(a.id));
                        if (newOnes.length === 0) return prev;

                        return [...newOnes, ...prev].slice(0, 2000);
                    });
                } else if (message.type === 'new_activity' && message.data && !Array.isArray(message.data)) {
                    setActivities(prev => {
                        const act = message.data as Activity;
                        if (prev.some(a => a.id === act.id)) return prev;
                        return [act, ...prev].slice(0, 2000);
                    });
                }
            };

            socket.onerror = (error) => {
                // Log as info/warning instead of error since we have auto-reconnect
                console.log('⚠️ WebSocket connection issue (will retry):', error);
                setIsConnected(false);
            };

            socket.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                setIsConnected(false);
                // Aggressive reconnect for "always on" feel
                reconnectTimeout.current = setTimeout(() => connect(), 1000);
            };
        } catch (error) {
            console.error('Failed to connect:', error);
            setIsConnected(false);
        }
    }, []);

    useEffect(() => {
        connect();
        return () => {
            if (ws.current) {
                ws.current.close();
            }
            if (reconnectTimeout.current) {
                clearTimeout(reconnectTimeout.current);
            }
        };
    }, [connect]);

    return { activities, isConnected, lastSyncAt };
}
