import { useState, useEffect, useMemo } from 'react';
import { useActivityWebSocket, Activity } from '../hooks/useActivityWebSocket';
import { Activity as ActivityIcon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export function ActivityFeed() {
    const { activities, isConnected } = useActivityWebSocket();
    const { theme } = useTheme();
    // Hardcoded to >$1000 as requested
    const minAmount = 1000;
    const [lastFlashedAt, setLastFlashedAt] = useState(0);
    const [tick, setTick] = useState(0);

    // localFeed holds items received during this session
    const [localFeed, setLocalFeed] = useState<Activity[]>([]);
    const [newIds, setNewIds] = useState<Set<string>>(new Set());

    // Update tick every second to force relative-time recalculation and retention
    useEffect(() => {
        const timer = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    // Synchronize local feed with incoming activities from WebSocket
    useEffect(() => {
        if (activities.length > 0) {
            setLocalFeed(prev => {
                const existingIds = new Set(prev.map(a => a.id));
                const added = activities.filter(a => !existingIds.has(a.id));

                if (added.length === 0) return prev;

                // Track new IDs for a brief highlight
                const incomingIds = new Set(added.map(a => a.id));
                setNewIds(incomingIds);
                setLastFlashedAt(Date.now());

                // Clear highlight after 1.5s
                setTimeout(() => setNewIds(new Set()), 1500);

                // Combine and sort
                const combined = [...added, ...prev]
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 2000);

                return combined;
            });
        }
    }, [activities]);

    // Filter logic
    const filteredList = useMemo(() => {
        const nowSec = Math.floor(Date.now() / 1000);

        return localFeed.filter(a => {
            const age = nowSec - a.timestamp;
            // User requested 5-minute retention (300s)
            // Removed amount check (show all > $0)
            return age >= -10 && age <= 300;
        });
    }, [localFeed, minAmount, tick]);

    const formatShortTime = (timestamp: number) => {
        const nowSec = Math.floor(Date.now() / 1000);
        const diff = Math.max(0, nowSec - timestamp);

        if (diff <= 3) return 'now';
        if (diff < 60) return `${diff}s`;
        if (diff < 300) return `${Math.floor(diff / 60)}m`;
        return '>5m';
    };

    const isSyncing = Date.now() - lastFlashedAt < 500;

    return (
        <div className={`flex flex-col h-full ${theme === 'dark' ? 'bg-[#141517] text-slate-200' : 'bg-white text-slate-900'} rounded-xl border ${theme === 'dark' ? 'border-[#2d2e33]' : 'border-slate-200'} shadow-sm overflow-hidden transition-all duration-300`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${theme === 'dark' ? 'border-[#2d2e33]' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3">
                    <h2 className="text-[20px] font-bold">Activity</h2>
                    <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isSyncing ? 'bg-blue-500 scale-150 shadow-[0_0_10px_#3b82f6]' : 'bg-slate-300 opacity-20'}`} />
                </div>

                <div className="flex items-center gap-2">
                    {/* Filter Removed as requested */}
                </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-25">
                        <div className="relative mb-3">
                            <ActivityIcon className="w-8 h-8 animate-pulse text-blue-500" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Monitoring Markets</p>
                        <p className="text-[9px] font-bold mt-0.5">Waiting for {`>$${minAmount}`} trades...</p>
                    </div>
                ) : (
                    <div className={`flex flex-col ${theme === 'dark' ? 'divide-y divide-[#1c1d21]' : 'divide-y divide-slate-50'}`}>
                        {filteredList.map((activity) => {
                            const outcome = (activity.outcome || "").toLowerCase();
                            const isPositive = outcome.includes('yes') || outcome.includes('up') || outcome.includes('buy');
                            const isNegative = outcome.includes('no') || outcome.includes('down') || outcome.includes('sell');

                            const marketTitle = activity.market || "Unknown Market";
                            const firstLetter = marketTitle.charAt(0).toUpperCase() || "?";
                            const isNew = newIds.has(activity.id);

                            return (
                                <div
                                    key={activity.id}
                                    // Removed cursor-pointer and hover effects for interactivity
                                    className={`group flex items-start gap-3.5 px-6 py-3 min-h-[64px] transition-all duration-500 relative ${theme === 'dark' ? 'hover:bg-[#1c1d21]' : 'hover:bg-slate-50'
                                        } ${isNew ? 'bg-blue-500/5' : ''}`}
                                >
                                    {/* Icon */}
                                    <div className={`w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center border ${theme === 'dark' ? 'bg-[#1c1d21] border-[#2d2e33]' : 'bg-slate-50 border-slate-100'
                                        } shadow-sm transition-transform duration-300 ${isNew ? 'scale-110' : ''}`}>
                                        <span className={`text-[13px] font-black ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                            {firstLetter}
                                        </span>
                                    </div>

                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <p className="text-[11px] font-bold leading-none mb-1 truncate text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">
                                            {marketTitle}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-x-1 text-[13px] leading-snug">
                                            <span className="font-bold text-inherit">
                                                {activity.user || "Trader"}
                                            </span>
                                            <span className="text-slate-500 font-medium lowercase">
                                                {activity.side === 'BUY' ? 'bought' : 'sold'}
                                            </span>
                                            <span className={`font-bold ${isPositive ? 'text-emerald-500' : isNegative ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {activity.outcome}
                                            </span>
                                            <span className="text-slate-500 font-medium">
                                                at {((activity.price || 0) * 100).toFixed(0)}¢
                                            </span>
                                            <span className="font-bold text-inherit">
                                                (${Math.floor(activity.amount_usd || 0).toLocaleString()})
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-1.5 min-w-[44px] pt-1">
                                        <span className="text-[11px] font-bold tabular-nums text-slate-400">
                                            {formatShortTime(activity.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className={`px-6 py-3 border-t ${theme === 'dark' ? 'border-[#2d2e33]' : 'border-slate-100'} bg-opacity-50`}>
                <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'} opacity-75`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                        {isConnected ? (filteredList.length > 0 ? 'Live Stream Active' : 'Live Syncing...') : 'Reconnecting...'}
                    </span>
                    <span className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        Last 5m Global Feed
                    </span>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { 
                    background: ${theme === 'dark' ? '#2d2e33' : '#e2e8f0'}; 
                    border-radius: 10px; 
                }
            `}</style>
        </div>
    );
}
