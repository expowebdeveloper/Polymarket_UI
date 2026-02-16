import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Wallet, TrendingUp, TrendingDown, Trophy, ChevronDown, ChevronUp, Activity as ActivityIcon, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { BarChart, Bar, Cell, PieChart, Pie, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useProfileStat } from '../hooks/useProfileStat';
import { useTradeFilter, TradeFilter } from '../hooks/useTradeFilter';
import { resolveWalletOrUser, fetchUserLeaderboardData, fetchMarketDistribution, fetchRecentTrades, fetchTraderAutocomplete, type TraderAutocompleteItem } from '../services/api';
import { getVolumeRank } from '../utils/rankUtils';
import { getStreakBadge } from '../utils/streakUtils';
import type { UserLeaderboardData } from '../types/api';
import { MarketDistributionPanel } from '../components/MarketDistributionPanel';
import { SocialLinks } from '../components/SocialLinks';
import realizedPnlIcon from '../assets/realized_pnl.svg';
import unrealizedPnlIcon from '../assets/unr_pnl.svg';


// Helper function to format currency
const formatCurrency = (value: number | string | undefined): string => {
    if (!value && value !== 0) return '$0.00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0.00';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
};

// Helper function to format date
const formatDate = (date: string | number | undefined): string => {
    if (!date) return 'N/A';
    try {
        const d = typeof date === 'number' ? new Date(date * 1000) : new Date(date);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return 'N/A';
    }
};

// Helper function to format size (handles number, string, or undefined)
const formatSize = (size: number | string | undefined): string => {
    if (size === undefined || size === null) return '0.0000';
    const num = typeof size === 'string' ? parseFloat(size) : size;
    if (isNaN(num)) return '0.0000';
    return num.toFixed(4);
};

// Helper function to get badge info based on score
const getBadgeInfo = (score: number) => {
    const clampedScore = Math.min(100, Math.max(0, score));

    if (clampedScore >= 95) return {
        title: "👑⚡ Prediction God",
        style: "bg-amber-500/10 text-amber-300 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.5)]",
        tooltip: "Final score 95+",
    };
    if (clampedScore >= 90) return {
        title: "👑🔥 Prediction King",
        style: "bg-emerald-500/10 text-emerald-300 border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.5)]",
        tooltip: "Final score 90+",
    };
    if (clampedScore >= 80) return {
        title: "🚀🧠 Pro Predictor",
        style: "bg-blue-500/10 text-blue-300 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.5)]",
        tooltip: "Final score 80+",
    };
    if (clampedScore >= 70) return {
        title: "🎯📈 Skilled Predictor",
        style: "bg-teal-500/10 text-teal-300 border-teal-500/50 shadow-[0_0_20px_rgba(20,184,166,0.4)]",
        tooltip: "Final score 70+",
    };
    if (clampedScore >= 60) return {
        title: "🌱🚀 Rising Predictor",
        style: "bg-lime-500/10 text-lime-300 border-lime-500/50 shadow-[0_0_20px_rgba(132,204,22,0.4)]",
        tooltip: "Final score 60+",
    };
    if (clampedScore >= 50) return {
        title: "⚖️🙂 Average Predictor",
        style: "bg-yellow-500/10 text-yellow-300 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.4)]",
        tooltip: "Final score 50+",
    };
    if (clampedScore >= 40) return {
        title: "🔄📉 Inconsistent Predictor",
        style: "bg-orange-500/10 text-orange-300 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.4)]",
        tooltip: "Final score 40+",
    };
    if (clampedScore >= 30) return {
        title: "🤔📊 Low-Confidence Predictor",
        style: "bg-orange-800/20 text-orange-400 border-orange-700/50",
        tooltip: "Final score 30+",
    };
    if (clampedScore >= 20) return {
        title: "🧪📉 Experimental Predictor",
        style: "bg-red-500/10 text-red-300 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]",
        tooltip: "Final score 20+",
    };
    return {
        title: "⚠️🔥 Extreme-Risk Predictor",
        style: "bg-red-900/20 text-red-500 border-red-700/50 animate-pulse",
        tooltip: "Final score below 20",
    };
};

export function ProfileStat() {
    const [searchParams] = useSearchParams();
    const [walletInput, setWalletInput] = useState('');
    const [activeWallet, setActiveWallet] = useState('');
    const [userProfile, setUserProfile] = useState<UserLeaderboardData | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    // First tab is Active Positions; Distribution and Activity fetch data only when user clicks that tab
    const [activeTab, setActiveTab] = useState<'history' | 'performance' | 'distribution' | 'activity' | 'active_positions' | 'closed_positions'>('distribution');
    const [distributionMetric, setDistributionMetric] = useState<'count' | 'capital'>('count');
    const [searchError, setSearchError] = useState<string | null>(null);

    // Pagination states
    const [historyPage, setHistoryPage] = useState(1);
    const [activePositionsPage, setActivePositionsPage] = useState(1);
    const [closedPositionsPage, setClosedPositionsPage] = useState(1);

    const itemsPerPage = 20;
    const activityFetchAttempted = useRef<string | null>(null);
    const distributionWalletRef = useRef<string>('');
    const [apiDistribution, setApiDistribution] = useState<any[]>([]);
    const [loadingDistribution, setLoadingDistribution] = useState(false);
    const [activityTabList, setActivityTabList] = useState<any[]>([]);
    const [activityTabLoading, setActivityTabLoading] = useState(false);
    const [recentTradesList, setRecentTradesList] = useState<Array<{ title: string; timestamp: number; side: string; price: number; size: number }>>([]);
    const [recentTradesLoading, setRecentTradesLoading] = useState(false);
    const [recentTradesError, setRecentTradesError] = useState<string | null>(null);
    // Autocomplete for username search
    const [suggestions, setSuggestions] = useState<TraderAutocompleteItem[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const autocompleteRef = useRef<HTMLDivElement>(null);
    const autocompleteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const portfolioAutoFetchedRef = useRef<string | null>(null);

    const {
        loading,
        error,
        metrics,
        positions,
        closedPositions,
        activities,
        userPnL,
        portfolioValue,
        dataOrigin,
        refresh,
        refreshWithTrades,
    } = useProfileStat(activeWallet);

    // Activity tab commented out – was: activityDisplayList / activitiesLast7Days for Wallet Activity (last 7 days)
    // const activityDisplayList = activityTabList.length > 0 ? activityTabList : (activities || []);
    // const activitiesLast7Days = useMemo(() => {
    //     if (!activityDisplayList.length) return [];
    //     const sevenDaysAgoSec = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    //     return [...activityDisplayList]
    //         .filter((a) => (a.timestamp ?? 0) >= sevenDaysAgoSec)
    //         .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    // }, [activityTabList, activities]);

    // Trade filtering with caching
    const {
        trades: filteredTrades,
        loading: tradesLoading,
        error: tradesError,
        currentFilter,
        fetchTrades,
        setFilterOnly,
    } = useTradeFilter(activeWallet);

    // Prefill wallet from URL ?wallet=0x... (e.g. from Dashboard biggest winner link)
    useEffect(() => {
        const walletFromUrl = searchParams.get('wallet');
        if (walletFromUrl && walletFromUrl.startsWith('0x') && walletFromUrl.length === 42) {
            setWalletInput(walletFromUrl);
            setActiveWallet(walletFromUrl);
        }
    }, [searchParams]);

    // Fetch user profile data when wallet changes (header only). Do NOT fetch trades here — trades are fetched only when user clicks a Performance filter (Recent 10, 7 Days, etc.).
    useEffect(() => {
        if (activeWallet) {
            fetchUserLeaderboardData(activeWallet, 'overall')
                .then(data => setUserProfile(data))
                .catch(err => console.error('Failed to fetch user profile:', err));
        }
    }, [activeWallet]);

    // Reset activity fetch flag, tab cache, portfolio auto-fetch, and recent trades when wallet changes
    useEffect(() => {
        activityFetchAttempted.current = null;
        setActivityTabList([]);
        portfolioAutoFetchedRef.current = null;
        setRecentTradesList([]);
        setRecentTradesError(null);
    }, [activeWallet]);

    // Clear API market distribution when profile/wallet changes so we refetch for the new profile
    useEffect(() => {
        setApiDistribution([]);
        setLoadingDistribution(false);
    }, [activeWallet]);

    // Auto-select "Recent 10" and fetch when profile is loaded (so graph shows without user clicking)
    useEffect(() => {
        if (!activeWallet || loading || tradesLoading) return;
        if (currentFilter != null) return; // User or auto already selected a filter
        if (portfolioAutoFetchedRef.current === activeWallet) return;
        portfolioAutoFetchedRef.current = activeWallet;
        fetchTrades('recent10');
    }, [activeWallet, loading, tradesLoading, currentFilter, fetchTrades]);

    // When "Recent 10 Trades" tab is selected, fetch full trade details (name, date, side, price)
    const recentTradesWalletRef = useRef<string | null>(null);
    useEffect(() => {
        if (!activeWallet || activeTab !== 'activity') return;
        const wallet = activeWallet;
        recentTradesWalletRef.current = wallet;
        setRecentTradesLoading(true);
        setRecentTradesError(null);
        fetchRecentTrades(wallet, 10)
            .then((data) => {
                if (recentTradesWalletRef.current !== wallet) return;
                setRecentTradesList(data.trades || []);
            })
            .catch((err) => {
                if (recentTradesWalletRef.current !== wallet) return;
                setRecentTradesError(err?.message || 'Failed to load recent trades');
                setRecentTradesList([]);
            })
            .finally(() => {
                if (recentTradesWalletRef.current === wallet) setRecentTradesLoading(false);
            });
    }, [activeWallet, activeTab]);

    // Activity tab commented out – replaced by "Recent 10 Trades" tab
    // const activityWalletRef = useRef<string | null>(null);
    // useEffect(() => {
    //     if (!activeWallet || activeTab !== 'activity') return;
    //     if (activityTabList.length > 0 || activityTabLoading) return;
    //     const wallet = activeWallet;
    //     activityWalletRef.current = wallet;
    //     setActivityTabLoading(true);
    //     fetchActivityForWallet(wallet, undefined, 1000)
    //         .then((data) => {
    //             if (activityWalletRef.current !== wallet) return;
    //             setActivityTabList(data.activities || []);
    //         })
    //         .catch((err) => console.error('Failed to fetch activity:', err))
    //         .finally(() => {
    //             if (activityWalletRef.current === wallet) setActivityTabLoading(false);
    //         });
    // }, [activeWallet, activeTab, activityTabList.length, activityTabLoading]);

    // Fetch API distribution when tab is active (no cache - always fetches)
    useEffect(() => {
        if (!activeWallet || activeTab !== 'distribution') return;
        const wallet = activeWallet;
        distributionWalletRef.current = wallet;
        setLoadingDistribution(true);
        fetchMarketDistribution(wallet)
            .then(data => {
                // Only apply if this response is for the current profile (avoid showing stale data when switching profiles)
                if (distributionWalletRef.current !== wallet) return;
                setApiDistribution(data.market_distribution || []);
            })
            .catch(err => console.error("Failed to fetch market distribution:", err))
            .finally(() => {
                if (distributionWalletRef.current === wallet) setLoadingDistribution(false);
            });
    }, [activeWallet, activeTab]);

    // Debounced autocomplete when user types (min 2 chars, not a wallet)
    useEffect(() => {
        const trimmed = walletInput.trim();
        if (trimmed.length < 2 || (trimmed.startsWith('0x') && trimmed.length >= 42)) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        if (autocompleteDebounceRef.current) clearTimeout(autocompleteDebounceRef.current);
        autocompleteDebounceRef.current = setTimeout(() => {
            setLoadingSuggestions(true);
            fetchTraderAutocomplete(trimmed, 12)
                .then((list) => {
                    setSuggestions(list);
                    setShowSuggestions(list.length > 0);
                    setHighlightedIndex(-1);
                })
                .catch(() => setSuggestions([]))
                .finally(() => setLoadingSuggestions(false));
        }, 280);
        return () => {
            if (autocompleteDebounceRef.current) clearTimeout(autocompleteDebounceRef.current);
        };
    }, [walletInput]);

    // Close autocomplete on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleWalletSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSearchError(null);
        setShowSuggestions(false);

        const trimmed = walletInput.trim();
        if (!trimmed) return;

        try {
            const resolution = await resolveWalletOrUser(trimmed);
            const resolvedAddress = resolution.wallet_address;

            setActiveWallet(resolvedAddress);
            setHistoryPage(1);
            setActivePositionsPage(1);
            setClosedPositionsPage(1);
        } catch (err: any) {
            const message = err?.message ?? "User or wallet not found. Try a full wallet address (0x...), or Polymarket username.";
            setSearchError(message);
        }
    };

    const selectSuggestion = (item: TraderAutocompleteItem) => {
        const display = item.username || item.pseudonym || item.wallet_address;
        setWalletInput(display);
        setActiveWallet(item.wallet_address);
        setShowSuggestions(false);
        setSuggestions([]);
        setSearchError(null);
        setHistoryPage(1);
        setActivePositionsPage(1);
        setClosedPositionsPage(1);
    };

    // Calculate detailed market distribution with ROI and Win Rate
    const marketDistribution = useMemo(() => {
        const categoryStats = new Map<string, {
            capital: number;
            totalPnl: number;
            wins: number;
            losses: number;
            trades: number;
            markets: Set<string>;
        }>();

        // Helper function to normalize category
        const normalizeCategory = (category: string, title: string, slug: string): string => {
            const lower = (category || title || slug || "").toLowerCase();
            const combined = `${lower} ${(title || "").toLowerCase()} ${(slug || "").toLowerCase()}`;

            // Elections (check first as it's more specific)
            if (combined.includes("election") || combined.includes("electoral") || combined.includes("vote") || combined.includes("voting") || combined.includes("ballot")) {
                return "Elections";
            }

            // Politics (check before geopolitics)
            if (combined.includes("politics") || combined.includes("political") || combined.includes("president") ||
                combined.includes("trump") || combined.includes("biden") || combined.includes("senate") ||
                combined.includes("congress") || combined.includes("democrat") || combined.includes("republican") ||
                combined.includes("party") || combined.includes("campaign")) {
                return "Politics";
            }

            // Geopolitics
            if (combined.includes("geopolitics") || combined.includes("geopolitical") || combined.includes("war") ||
                combined.includes("conflict") || combined.includes("military") || combined.includes("nato") ||
                combined.includes("alliance") || combined.includes("diplomacy") || combined.includes("sanctions")) {
                return "Geopolitics";
            }

            // Sports
            if (combined.includes("sports") || combined.includes("sport") || combined.includes("nfl") ||
                combined.includes("nba") || combined.includes("mlb") || combined.includes("soccer") ||
                combined.includes("football") || combined.includes("basketball") || combined.includes("baseball") ||
                combined.includes("hockey") || combined.includes("tennis") || combined.includes("golf") ||
                combined.includes("game") || combined.includes("match") || combined.includes("championship") ||
                combined.includes("super bowl") || combined.includes("world cup") || combined.includes("olympics") ||
                combined.includes("tournament") || combined.includes("league")) {
                return "Sports";
            }

            // Crypto
            if (combined.includes("crypto") || combined.includes("cryptocurrency") || combined.includes("bitcoin") ||
                combined.includes("btc") || combined.includes("ethereum") || combined.includes("eth") ||
                combined.includes("blockchain") || combined.includes("defi") || combined.includes("nft") ||
                combined.includes("token") || combined.includes("coin") || combined.includes("altcoin") ||
                combined.includes("dogecoin") || combined.includes("solana") || combined.includes("cardano")) {
                return "Crypto";
            }

            // Tech
            if (combined.includes("tech") || combined.includes("technology") || combined.includes("ai") ||
                combined.includes("artificial intelligence") || combined.includes("software") || combined.includes("hardware") ||
                combined.includes("startup") || combined.includes("silicon valley") || combined.includes("apple") ||
                combined.includes("google") || combined.includes("microsoft") || combined.includes("meta") ||
                combined.includes("amazon") || combined.includes("tesla") || combined.includes("nvidia") ||
                combined.includes("chip") || combined.includes("semiconductor")) {
                return "Tech";
            }

            // Finance
            if (combined.includes("finance") || combined.includes("financial") || combined.includes("bank") ||
                combined.includes("banking") || combined.includes("investment") || combined.includes("trading") ||
                combined.includes("stock") || combined.includes("market") || combined.includes("hedge fund") ||
                combined.includes("private equity") || combined.includes("venture capital")) {
                return "Finance";
            }

            // Economy
            if (combined.includes("economy") || combined.includes("economic") || combined.includes("gdp") ||
                combined.includes("unemployment") || combined.includes("inflation") || combined.includes("recession") ||
                combined.includes("growth") || combined.includes("productivity") || combined.includes("trade") ||
                combined.includes("commerce") || combined.includes("business cycle")) {
                return "Economy";
            }

            // Earnings
            if (combined.includes("earnings") || combined.includes("revenue") || combined.includes("profit") ||
                combined.includes("quarterly") || combined.includes("q1") || combined.includes("q2") ||
                combined.includes("q3") || combined.includes("q4") || combined.includes("eps") ||
                combined.includes("guidance") || combined.includes("beat") || combined.includes("miss")) {
                return "Earnings";
            }

            // Climate & Science
            if (combined.includes("climate") || combined.includes("environment") || combined.includes("environmental") ||
                combined.includes("science") || combined.includes("scientific") || combined.includes("research") ||
                combined.includes("global warming") || combined.includes("carbon") || combined.includes("emissions") ||
                combined.includes("renewable") || combined.includes("solar") || combined.includes("wind") ||
                combined.includes("energy") || combined.includes("green") || combined.includes("sustainability")) {
                return "Climate & Science";
            }

            // Culture
            if (combined.includes("culture") || combined.includes("cultural") || combined.includes("entertainment") ||
                combined.includes("movie") || combined.includes("film") || combined.includes("music") ||
                combined.includes("celebrity") || combined.includes("tv") || combined.includes("television") ||
                combined.includes("award") || combined.includes("oscar") || combined.includes("grammy") ||
                combined.includes("fashion") || combined.includes("art") || combined.includes("media")) {
                return "Culture";
            }

            // World
            if (combined.includes("world") || combined.includes("global") || combined.includes("international") ||
                combined.includes("country") || combined.includes("nation") || combined.includes("united nations") ||
                combined.includes("un") || combined.includes("eu") || combined.includes("european union")) {
                return "World";
            }

            // Use original category if it exists, otherwise "Other"
            return category || "Other";
        };

        // Process closed positions
        closedPositions.forEach(pos => {
            const title = pos.title || pos.slug || "Unknown Market";
            const originalCategory = (pos as any).category || "";
            const category = normalizeCategory(originalCategory, title, pos.slug || "");

            const stake = parseFloat(String((pos as any).total_bought || pos.size || 0)) * parseFloat(String(pos.avg_price || 0));
            const pnl = parseFloat(String(pos.realized_pnl || 0));

            if (!categoryStats.has(category)) {
                categoryStats.set(category, {
                    capital: 0,
                    totalPnl: 0,
                    wins: 0,
                    losses: 0,
                    trades: 0,
                    markets: new Set()
                });
            }

            const stats = categoryStats.get(category)!;
            stats.capital += stake;
            stats.totalPnl += pnl;
            stats.trades += 1;
            stats.markets.add(pos.slug || title);

            if (pnl > 0) {
                stats.wins += 1;
            } else if (pnl < 0) {
                stats.losses += 1;
            }
        });

        // Process active positions for capital
        positions.forEach(pos => {
            const title = pos.title || pos.slug || "Unknown Market";
            const originalCategory = (pos as any).category || "";
            const category = normalizeCategory(originalCategory, title, pos.slug || "");

            const capital = parseFloat(String(pos.initial_value || 0));

            if (!categoryStats.has(category)) {
                categoryStats.set(category, {
                    capital: 0,
                    totalPnl: 0,
                    wins: 0,
                    losses: 0,
                    trades: 0,
                    markets: new Set()
                });
            }

            categoryStats.get(category)!.capital += capital;
            categoryStats.get(category)!.markets.add(pos.slug || title);
        });

        // Calculate totals and percentages
        const totalCapital = Array.from(categoryStats.values()).reduce((sum, s) => sum + s.capital, 0);

        const distribution = Array.from(categoryStats.entries()).map(([category, stats]) => {
            const roiPercent = stats.capital > 0 ? (stats.totalPnl / stats.capital * 100) : 0;
            const winRatePercent = stats.trades > 0 ? (stats.wins / stats.trades * 100) : 0;
            const capitalPercent = totalCapital > 0 ? (stats.capital / totalCapital * 100) : 0;
            const riskScore = stats.capital > 0 ? (Math.abs(stats.totalPnl < 0 ? stats.totalPnl : 0) / stats.capital) : 0;

            return {
                category,
                market: category,
                capital: stats.capital,
                capital_percent: capitalPercent,
                roi_percent: roiPercent,
                win_rate_percent: winRatePercent,
                trades_count: stats.trades,
                wins: stats.wins,
                losses: stats.losses,
                total_pnl: stats.totalPnl,
                risk_score: riskScore,
                unique_markets: stats.markets.size
            };
        });

        // Filter out Uncategorized and Other, then sort based on selected metric and take top 10
        return distribution
            .filter(item => {
                const cat = item.category.toLowerCase();
                return cat !== 'uncategorized' && cat !== 'other';
            })
            .sort((a, b) => {
                if (distributionMetric === 'count') {
                    return b.trades_count - a.trades_count;
                }
                return b.capital - a.capital;
            })
            .slice(0, 10);
    }, [closedPositions, positions, distributionMetric]);

    // Calculate primary edge
    const primaryEdge = useMemo(() => {
        if (marketDistribution.length === 0) return "No trading data available.";

        const primary = marketDistribution[0];
        let edge = `Primary edge in ${primary.category} markets with `;

        if (primary.roi_percent > 0) {
            edge += primary.roi_percent > 50 ? "high ROI " : "consistent ROI ";
        } else {
            edge += "moderate ROI ";
        }

        if (primary.risk_score < 0.1) {
            edge += "and low risk.";
        } else if (primary.risk_score < 0.3) {
            edge += "and moderate risk.";
        } else {
            edge += "and high risk.";
        }

        return edge;
    }, [marketDistribution]);

    // Calculate profit trend for last 7 days
    const profitTrend = useMemo(() => {
        const days: { [key: string]: { day: string; profit: number } } = {};
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayKey = date.toISOString().split('T')[0];
            const dayName = dayNames[date.getDay()];
            days[dayKey] = { day: dayName, profit: 0 };
        }

        // Aggregate PnL by day from closed positions
        closedPositions.forEach(pos => {
            if (pos.created_at) {
                const tradeDate = new Date(pos.created_at);
                const dayKey = tradeDate.toISOString().split('T')[0];

                if (days[dayKey]) {
                    days[dayKey].profit += parseFloat(String(pos.realized_pnl || 0));
                }
            }
        });

        // Convert to array and calculate cumulative
        let cumulative = 0;
        return Object.keys(days).sort().map(dayKey => {
            cumulative += days[dayKey].profit;
            return {
                day: days[dayKey].day,
                date: dayKey,
                profit: days[dayKey].profit,
                cumulative_profit: cumulative
            };
        });
    }, [closedPositions]);

    // Build chart data from closed positions for "All Trades" (no extra fetch when we already have profile data)
    const allTradesGraphFromClosed = useMemo(() => {
        if (!closedPositions?.length) return [];
        const withTs = closedPositions
            .map((cp) => {
                const row = cp as unknown as Record<string, unknown>;
                const ts = row.timestamp ?? row.time ?? row.closedAt ?? row.updated_at ?? cp.updated_at ?? cp.created_at ?? cp.end_date;
                let tSec = 0;
                if (typeof ts === 'number') tSec = ts > 1e12 ? Math.floor(ts / 1000) : Math.floor(ts);
                else if (typeof ts === 'string') {
                    const d = new Date(ts.replace('Z', '+00:00'));
                    tSec = Number.isNaN(d.getTime()) ? 0 : Math.floor(d.getTime() / 1000);
                }
                const pnl = parseFloat(String(row.realizedPnl ?? cp.realized_pnl ?? 0));
                return { tSec, pnl };
            })
            .filter((x) => x.tSec > 0);
        withTs.sort((a, b) => a.tSec - b.tSec);
        let cumulative = 0;
        const result: Array<{ date: string; dateShort: string; timestamp: number; cumulativePnl: number }> = [];
        for (const { tSec, pnl } of withTs) {
            cumulative += pnl;
            const d = new Date(tSec * 1000);
            result.push({
                date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                dateShort: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                timestamp: tSec,
                cumulativePnl: Math.round(cumulative * 100) / 100,
            });
        }
        return result;
    }, [closedPositions]);

    const performanceGraphData = useMemo(() => {
        // "All Trades": use existing closed positions when available (no API call)
        if (currentFilter === 'all' && allTradesGraphFromClosed.length > 0) {
            return allTradesGraphFromClosed;
        }
        const tradesData = filteredTrades.length > 0 ? filteredTrades : [];
        if (!tradesData || tradesData.length === 0) return [];

        // Sort by timestamp; API/backend returns points with p = cumulative PnL at that time.
        const sorted = [...tradesData].sort((a, b) => (a.t || 0) - (b.t || 0));
        const result: Array<{ date: string; dateShort: string; timestamp: number; cumulativePnl: number }> = [];
        for (const point of sorted) {
            const tRaw = point.t ?? 0;
            const tSec = tRaw > 1e12 ? Math.floor(tRaw / 1000) : Math.floor(tRaw);
            if (!Number.isFinite(tSec) || tSec <= 0) continue;
            const p = typeof point.p === 'number' ? point.p : parseFloat(String(point.p || 0));
            const d = new Date(tSec * 1000);
            if (Number.isNaN(d.getTime())) continue;
            result.push({
                date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                dateShort: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                timestamp: tSec,
                cumulativePnl: Math.round(p * 100) / 100,
            });
        }
        return result;
    }, [currentFilter, allTradesGraphFromClosed, filteredTrades]);

    // Actual date range of the graph data (for labeling — real data only)
    const performanceGraphRange = useMemo(() => {
        if (performanceGraphData.length === 0) return null;
        const first = performanceGraphData[0] as { timestamp?: number };
        const last = performanceGraphData[performanceGraphData.length - 1] as { timestamp?: number };
        const firstTs = first?.timestamp ?? 0;
        const lastTs = last?.timestamp ?? 0;
        const firstDate = new Date(firstTs * 1000);
        const lastDate = new Date(lastTs * 1000);
        const sameYear = firstDate.getFullYear() === lastDate.getFullYear();
        const firstStr = firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' });
        const lastStr = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return { firstStr, lastStr, firstDate, lastDate };
    }, [performanceGraphData]);



    // Calculate badge info safely
    const badgeInfo = metrics ? getBadgeInfo(metrics.final_score) : null;

    // Calculate active positions value
    const activePositionsValue = useMemo(() => {
        return positions.reduce((sum, pos) => {
            return sum + (parseFloat(String(pos.initial_value || 0)));
        }, 0);
    }, [positions]);

    // Total Gains / Total Losses: use API values from Polymarket closed positions (single source of truth)
    const totalGains = useMemo(() => {
        if (metrics?.total_gains !== undefined && metrics.total_gains !== null) return metrics.total_gains;
        return closedPositions.reduce((sum, pos) => {
            const pnl = parseFloat(String(pos.realized_pnl || 0));
            return sum + (pnl > 0 ? pnl : 0);
        }, 0);
    }, [metrics?.total_gains, closedPositions]);

    const totalLosses = useMemo(() => {
        if (metrics?.total_losses !== undefined && metrics.total_losses !== null) return metrics.total_losses;
        return Math.abs(closedPositions.reduce((sum, pos) => {
            const pnl = parseFloat(String(pos.realized_pnl || 0));
            return sum + (pnl < 0 ? pnl : 0);
        }, 0));
    }, [metrics?.total_losses, closedPositions]);

    // Balance = portfolio value from Polymarket Data API (/value?user=...) — total wallet value
    const balance = useMemo(() => {
        if (portfolioValue !== undefined && portfolioValue !== null) return portfolioValue;
        return positions.reduce((sum, pos) => parseFloat(String(pos.current_value || 0)) + sum, 0);
    }, [positions, portfolioValue]);

    // Calculate total predictions (unique positions/markets)
    const totalPredictions = useMemo(() => {
        return closedPositions.length + positions.length;
    }, [closedPositions.length, positions.length]);

    const [showCopied, setShowCopied] = useState(false);

    return (
        <div className="min-h-screen text-white">
            {/* Ambient liquid glow background – matches Dashboard */}
            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_20%_10%,rgba(56,189,248,0.12),transparent_55%),radial-gradient(1000px_600px_at_80%_0%,rgba(99,102,241,0.10),transparent_55%),radial-gradient(900px_600px_at_50%_90%,rgba(16,185,129,0.08),transparent_60%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),transparent_30%,transparent_70%,rgba(255,255,255,0.04))] opacity-40" />
                <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.06]" />
            </div>

            {/* TOP NAV */}
            <div className="sticky top-0 z-30 border-b border-white/10">
                <div className="flex items-center justify-center px-6 py-6">
                    <div className="w-full max-w-7xl">
                        <form onSubmit={handleWalletSubmit} className="flex items-center gap-6 bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 rounded-3xl px-8 py-5 shadow-[0_16px_60px_-24px_rgba(0,0,0,0.9)] backdrop-blur-2xl transition-all duration-300 hover:border-white/15 hover:shadow-[0_24px_64px_-24px_rgba(0,0,0,0.95)]">
                            {/* Profile Picture */}
                            {activeWallet && userProfile?.profileImage && (
                                <img
                                    src={userProfile.profileImage}
                                    alt={userProfile.userName || activeWallet}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/50 cursor-pointer hover:scale-105 transition-transform"
                                    onClick={() => window.open(userProfile.profileImage, '_blank')}
                                    title="Click to view full image"
                                />
                            )}

                            {/* Username, X handle, Verified badge and Wallet Address */}
                            {activeWallet && (
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {userProfile?.userName && (
                                            <span className="text-lg font-bold text-white truncate">
                                                {userProfile.userName}
                                            </span>
                                        )}
                                        {userProfile?.xUsername && (
                                            <span className="text-slate-400 text-sm truncate">
                                                @{userProfile.xUsername.replace(/^@/, '')}
                                            </span>
                                        )}
                                        <SocialLinks
                                            xUsername={userProfile?.xUsername}
                                            polymarketWallet={userProfile?.proxyWallet || activeWallet}
                                            iconSize={18}
                                            variant="light"
                                        />
                                        {userProfile?.verifiedBadge && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/40" title="In X user list / Verified">
                                                <span className="text-blue-400">✓</span>
                                                Verified
                                            </span>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(activeWallet);
                                                setShowCopied(true);
                                                setTimeout(() => setShowCopied(false), 2000);
                                            }}
                                            className="text-sm text-slate-400 hover:text-emerald-400 transition text-left truncate flex items-center gap-1"
                                            title="Click to copy wallet address"
                                        >
                                            {activeWallet.slice(0, 6)}...{activeWallet.slice(-4)}
                                        </button>

                                        {/* Copied Tooltip */}
                                        <div className={`absolute top-full mt-1 left-0 bg-emerald-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded shadow-lg transition-all duration-200 ${showCopied ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'}`}>
                                            Copied!
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Search Icon and Input with Autocomplete */}
                            <div className="flex items-center gap-3 flex-1 relative" ref={autocompleteRef}>
                                <Search className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                                <div className="flex-1 relative">
                                    <input
                                        className="w-full bg-transparent outline-none text-sm placeholder:text-slate-500"
                                        placeholder="Search by wallet (0x...), or Polymarket username"
                                        value={walletInput}
                                        onChange={(e) => { setWalletInput(e.target.value); setSearchError(null); }}
                                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                        onKeyDown={(e) => {
                                            if (!showSuggestions || suggestions.length === 0) return;
                                            if (e.key === 'ArrowDown') {
                                                e.preventDefault();
                                                setHighlightedIndex((i) => (i < suggestions.length - 1 ? i + 1 : i));
                                            } else if (e.key === 'ArrowUp') {
                                                e.preventDefault();
                                                setHighlightedIndex((i) => (i > 0 ? i - 1 : -1));
                                            } else if (e.key === 'Enter' && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
                                                e.preventDefault();
                                                selectSuggestion(suggestions[highlightedIndex]);
                                            } else if (e.key === 'Escape') {
                                                setShowSuggestions(false);
                                                setHighlightedIndex(-1);
                                            }
                                        }}
                                        autoComplete="off"
                                        aria-autocomplete="list"
                                        aria-expanded={showSuggestions && suggestions.length > 0}
                                    />
                                    {showSuggestions && (
                                        <ul
                                            className="absolute top-full left-0 right-0 mt-1 z-50 max-h-64 overflow-auto rounded-lg border border-white/10 bg-slate-900/95 backdrop-blur shadow-xl py-1"
                                            role="listbox"
                                        >
                                            {loadingSuggestions ? (
                                                <li className="px-3 py-2 text-sm text-slate-400">Searching...</li>
                                            ) : suggestions.length === 0 ? null : (
                                                suggestions.map((item, i) => {
                                                    const label = item.username || item.pseudonym || item.wallet_address;
                                                    const sub = item.pseudonym && item.username ? `@${item.pseudonym}` : null;
                                                    return (
                                                        <li
                                                            key={item.wallet_address}
                                                            role="option"
                                                            aria-selected={i === highlightedIndex}
                                                            className={`px-3 py-2 cursor-pointer text-sm flex items-center gap-2 ${i === highlightedIndex ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-200 hover:bg-white/5'}`}
                                                            onClick={() => selectSuggestion(item)}
                                                            onMouseEnter={() => setHighlightedIndex(i)}
                                                        >
                                                            {item.profile_image && (
                                                                <img src={item.profile_image} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                            )}
                                                            <span className="truncate">{label}</span>
                                                            {sub && <span className="text-slate-500 truncate">{sub}</span>}
                                                        </li>
                                                    );
                                                })
                                            )}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            {/* Refresh Button */}
                            {activeWallet && (
                                <button type="button" onClick={() => refresh()} disabled={loading} className="p-1 hover:text-emerald-400 disabled:opacity-50 flex-shrink-0">
                                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                </button>
                            )}
                        </form>
                    </div>
                    {searchError && (
                        <p className="mt-2 text-sm text-rose-400" role="alert">{searchError}</p>
                    )}
                </div>
            </div>

            {!activeWallet && (
                <div className="flex flex-col items-center justify-center p-20 text-center">
                    <Wallet className="h-20 w-20 text-emerald-500/20 mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Live Polyrating Dashboard</h2>
                    <p className="text-slate-400 max-w-md">Analyze any trader instantly. Enter a wallet or Polymarket username to unlock real-time performance metrics, trader ratings, and behavioral insights</p>
                </div>
            )}

            {loading && activeWallet && <div className="p-8"><LoadingSpinner message="Calculating live metrics..." /></div>}
            {error && <div className="p-8"><ErrorMessage message={error} onRetry={refresh} /></div>}

            {/* CONTENT */}
            {!loading && activeWallet && metrics && (
                <div className="px-8 py-6 space-y-6">
                    {/* Data origin: confirm data is real from Polymarket */}
                    {dataOrigin?.live && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 text-emerald-400/90">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Real data
                            </span>
                            <span>from Polymarket API</span>
                        </div>
                    )}

                    {/* FINAL RATING */}
                    <div className="relative overflow-hidden bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 rounded-3xl shadow-[0_16px_60px_-24px_rgba(0,0,0,0.9)] backdrop-blur-2xl p-6">
                        {/* Liquid glow blob */}
                        <div className="pointer-events-none absolute -top-24 left-1/2 h-40 w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
                        <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]" />
                        <p className="text-sm uppercase tracking-widest text-emerald-300/80">Final Rating (Live)</p>
                        <div className="flex items-end gap-6">
                            <p className="text-[60px] leading-none font-extrabold bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                                {Math.min(100, Math.max(0, metrics.final_score)).toFixed(1)}
                            </p>
                            <div className="flex gap-3 pb-2">
                                {badgeInfo && (
                                    <span className={`px-6 py-2 rounded-full text-sm border font-bold ${badgeInfo.style}`}>
                                        {badgeInfo.title}
                                    </span>
                                )}
                                {(() => {
                                    const rank = getVolumeRank(metrics.total_volume);
                                    return (
                                        <span className={`px-6 py-2 rounded-full text-sm border font-bold ${rank.className}`} title={rank.tooltip}>
                                            {rank.emoji} {rank.title}
                                        </span>
                                    );
                                })()}
                                {(() => {
                                    const streakBadge = getStreakBadge(metrics.streaks.current_streak);
                                    if (streakBadge) {
                                        return (
                                            <span className={`px-6 py-2 rounded-full text-sm border font-bold ${streakBadge.className}`} title={streakBadge.tooltip}>
                                                {streakBadge.emoji} {streakBadge.title}
                                            </span>
                                        );
                                    }
                                    return null;
                                })()}
                                {/* {(metrics.is_badge_holder || userProfile?.verifiedBadge) && (
                                    <span className="px-6 py-2 rounded-full text-sm border font-bold bg-gradient-to-r from-purple-500/10 to-amber-500/10 text-transparent bg-clip-text border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.4)] animate-pulse">
                                        <span className="bg-gradient-to-r from-purple-400 to-amber-400 bg-clip-text">
                                            🏅 Polymarket Badge Holder
                                        </span>
                                    </span>
                                )} */}
                                {metrics.user_tag && (
                                    <span className={`px-6 py-2 rounded-full text-sm border font-bold ${metrics.user_tag.style}`}>
                                        <span className="bg-gradient-to-r from-current to-current bg-clip-text">
                                            {metrics.user_tag.emoji} {metrics.user_tag.title}
                                        </span>
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-6">
                            <div className="relative overflow-hidden bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl px-2 py-3 min-h-[72px] flex flex-col justify-center items-center text-center hover:border-white/15 transition-all">
                                <p className="text-xs text-slate-300 mb-0.5">Active Position Value</p>
                                <p className="text-base font-bold text-emerald-300">{formatCurrency(balance)}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">Portfolio value </p>
                            </div>
                            <div className="relative overflow-hidden bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl px-2 py-3 min-h-[72px] flex flex-col justify-center items-center text-center hover:border-white/15 transition-all">
                                <p className="text-xs text-slate-300 mb-0.5">Total PNL</p>
                                <p className={`text-base font-bold ${metrics.total_pnl >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>{formatCurrency(metrics.total_pnl)}</p>
                            </div>
                            <div className="relative overflow-hidden bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl px-2 py-3 min-h-[72px] flex flex-col justify-center items-center text-center hover:border-white/15 transition-all">
                                <p className="text-xs text-slate-300 mb-0.5">Volume Traded</p>
                                <p className="text-base font-bold text-emerald-300">{formatCurrency(metrics.total_volume)}</p>
                            </div>
                            <div className="relative overflow-hidden bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl px-2 py-3 min-h-[72px] flex flex-col justify-center items-center text-center hover:border-white/15 transition-all">
                                <p className="text-xs text-slate-300 mb-0.5">Predictions</p>
                                <p className="text-base font-bold text-emerald-300">{metrics.total_trades}</p>
                            </div>
                            <div className="relative overflow-hidden bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl px-2 py-3 min-h-[72px] flex flex-col justify-center items-center text-center hover:border-white/15 transition-all">
                                <p className="text-xs text-slate-300 mb-0.5">Total Trades</p>
                                <p className="text-base font-bold text-emerald-300">{totalPredictions}</p>
                            </div>
                            <div className="relative overflow-hidden bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl px-2 py-3 min-h-[72px] flex flex-col justify-center items-center text-center hover:border-white/15 transition-all">
                                <p className="text-xs text-slate-300 mb-0.5">Biggest Win</p>
                                <p className="text-base font-bold text-emerald-300">{formatCurrency(metrics.largest_win)}</p>
                            </div>
                            <div className="relative overflow-hidden bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 backdrop-blur-xl rounded-2xl px-2 py-3 min-h-[72px] flex flex-col justify-center items-center text-center hover:border-white/15 transition-all">
                                <p className="text-xs text-slate-300 mb-0.5">Worst Loss</p>
                                <p className="text-base font-bold text-red-400">{formatCurrency(metrics.worst_loss || 0)}</p>
                            </div>
                        </div>

                        <div className="relative mt-6 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 shadow-[0_16px_60px_-24px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
                            <div className="pointer-events-none absolute -top-16 left-1/2 h-28 w-[420px] -translate-x-1/2 rounded-full bg-emerald-500/8 blur-3xl" />
                            <div className="flex items-center justify-between text-center divide-x divide-slate-800">
                                <div className="flex-1 px-4">
                                    <p className="text-xs text-slate-400 font-medium mb-1 flex items-center justify-center gap-1">
                                        <span className="text-orange-500">🔥</span> Longest Win Streak
                                    </p>
                                    <p className="text-3xl font-black text-white tracking-tight">{metrics.streaks.longest_streak}</p>
                                </div>
                                <div className="flex-1 px-4">
                                    <p className="text-xs text-slate-400 font-medium mb-1 flex items-center justify-center gap-1">
                                        <span className="text-purple-400">⚡</span> Current Win Streak
                                    </p>
                                    <p className="text-3xl font-black text-white tracking-tight">{metrics.streaks.current_streak}</p>
                                </div>
                                <div className="flex-1 px-4">
                                    <p className="text-xs text-slate-400 font-medium mb-1 flex items-center justify-center gap-1">
                                        <span className="text-yellow-400">👍</span> Winning Trades
                                    </p>
                                    <p className="text-3xl font-black text-emerald-400 tracking-tight">{metrics.streaks.total_wins}</p>
                                </div>
                                <div className="flex-1 px-4">
                                    <p className="text-xs text-slate-400 font-medium mb-1 flex items-center justify-center gap-1">
                                        <span className="text-red-400">👎</span> Losing Trades
                                    </p>
                                    <p className="text-3xl font-black text-slate-300 tracking-tight">{metrics.streaks.total_losses}</p>
                                </div>
                                <div className="flex-1 px-4">
                                    <p className="text-xs text-slate-400 font-medium mb-1 flex items-center justify-center gap-1">
                                        <span className="text-amber-400">🏆</span> Top Category
                                    </p>
                                    <p className="text-2xl font-black text-emerald-400 tracking-tight leading-none" title={marketDistribution[0]?.category}>
                                        {(() => {
                                            // Find first category that's not Uncategorized or Other
                                            const topCategory = marketDistribution.find(item => {
                                                const cat = item.category.toLowerCase();
                                                return cat !== 'uncategorized' && cat !== 'other';
                                            });
                                            return topCategory?.category || 'N/A';
                                        })()}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PRIMARY METRICS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="relative overflow-hidden bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-2xl p-4 hover:border-white/15 transition-all group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                                    <Trophy className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Win Rate</p>
                            </div>
                            <p className="text-xl font-bold text-white">{metrics.win_rate.toFixed(1)}%</p>
                            <p className="text-xs text-slate-500 mt-1">{metrics.streaks.total_wins}W / {metrics.streaks.total_losses}L</p>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 hover:border-emerald-500/30 transition-colors group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Stake yield</p>
                            </div>
                            <p className={`text-xl font-bold ${metrics.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {metrics.roi >= 0 ? '+' : ''}{metrics.roi.toFixed(2)}%
                            </p>
                            <p className="text-xs text-slate-500 mt-1">All-time</p>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 hover:border-emerald-500/30 transition-colors group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                                    <ActivityIcon className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Stake-Weighted Win Rate</p>
                            </div>
                            <p className="text-xl font-bold text-white">
                                {((metrics.stake_weighted_win_rate || metrics.w_stake * 100) || 0).toFixed(1)}%
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Weighted by stake size</p>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 hover:border-emerald-500/30 transition-colors group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                                    <img src={unrealizedPnlIcon} alt="Unrealized PnL" className="h-6 w-6 object-contain" />
                                </div>
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Unrealized PnL</p>
                            </div>
                            <p className={`text-xl font-bold ${(metrics.unrealized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCurrency(metrics.unrealized_pnl)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Paper PnL</p>
                        </div>

                        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 hover:border-emerald-500/30 transition-colors group">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-red-500/10 text-red-400 group-hover:scale-110 transition-transform">
                                    <img src={realizedPnlIcon} alt="Realized PnL" className="h-5 w-5 object-contain" />
                                </div>
                                <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">Realized PnL</p>
                            </div>
                            <p className={`text-xl font-bold ${(metrics.realized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatCurrency(metrics.realized_pnl)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Banked PnL</p>
                        </div>
                    </div>

                    {/* ADVANCED METRICS TOGGLE */}
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center justify-between w-full px-6 py-3 bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl hover:bg-white/[0.08] transition-all group"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-slate-300">Advanced Scoring & Metrics</span>
                            </div>
                            {showAdvanced ? <ChevronUp className="h-5 w-5 text-slate-500 group-hover:text-emerald-400" /> : <ChevronDown className="h-5 w-5 text-slate-500 group-hover:text-emerald-400" />}
                        </button>

                        {showAdvanced && (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl p-4">
                                    <p className="text-xs text-slate-400 uppercase mb-1">Most Traded Category</p>
                                    <p className="text-lg font-bold text-white truncate">{marketDistribution[0]?.category || 'N/A'}</p>
                                </div>
                                <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl p-4">
                                    <p className="text-xs text-slate-400 uppercase mb-1">Active Positions</p>
                                    <p className="text-lg font-bold text-white">{metrics.open_positions || 0}</p>
                                </div>
                                <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl p-4">
                                    <p className="text-xs text-slate-400 uppercase mb-1">Closed Positions</p>
                                    <p className="text-lg font-bold text-white">{metrics.closed_positions || 0}</p>
                                </div>
                                <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl p-4">
                                    <p className="text-xs text-slate-400 uppercase mb-1">All-time PnL Rank</p>
                                    <p className="text-lg font-bold text-emerald-400">
                                        {metrics.pnl_rank ? `#${metrics.pnl_rank}` : 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl p-4">
                                    <p className="text-xs text-slate-400 uppercase mb-1">All-time Volume Rank</p>
                                    <p className="text-lg font-bold text-white">
                                        {metrics.volume_rank ? `#${metrics.volume_rank}` : 'N/A'}
                                    </p>
                                </div>
                                <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl p-4">
                                    <p className="text-xs text-slate-400 uppercase mb-1">Total Buy Stake</p>
                                    <p className="text-lg font-bold text-white">{formatCurrency(metrics.total_stakes || metrics.buy_volume || 0)}</p>
                                </div>
                                <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl p-4">
                                    <p className="text-xs text-slate-400 uppercase mb-1">Max Stake</p>
                                    <p className="text-lg font-bold text-white">{formatCurrency(metrics.max_stake)}</p>
                                </div>
                                <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl p-4">
                                    <p className="text-xs text-slate-400 uppercase mb-1">Winning Stake</p>
                                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(metrics.winning_stakes)}</p>
                                </div>
                                <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl p-4">
                                    <p className="text-xs text-slate-400 uppercase mb-1">Losing Stake</p>
                                    <p className="text-lg font-bold text-red-400">{formatCurrency(metrics.losing_stakes)}</p>
                                </div>
                                <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl p-4">
                                    <p className="text-xs text-slate-400 uppercase mb-1">Average Stake</p>
                                    <p className="text-lg font-bold text-white">
                                        {formatCurrency((metrics.total_stakes || 0) / (metrics.total_trades || 1))}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* PERFORMANCE CHART */}
                        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-3xl p-6">
                            <div className="pointer-events-none absolute -top-20 left-1/3 h-32 w-[400px] -translate-x-1/2 rounded-full bg-indigo-500/8 blur-3xl" />
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold">Portfolio Performance</h3>
                                    <p className="text-sm text-slate-400">
                                        {currentFilter
                                            ? (currentFilter === 'all'
                                                ? (performanceGraphRange
                                                    ? `All Trades · ${performanceGraphRange.firstStr} – ${performanceGraphRange.lastStr}`
                                                    : 'All Trades')
                                                : `Showing ${currentFilter === 'recent10' ? 'Recent 10' : currentFilter === '7days' ? '7 Days' : '30 Days'} trades${performanceGraphRange ? ` · ${performanceGraphRange.firstStr} – ${performanceGraphRange.lastStr}` : ''}`)
                                            : 'Click a filter below to load trade performance (data loads only when you select a filter, not on search)'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                                        <TrendingUp className="h-3 w-3" />
                                        Live Data
                                    </span>
                                </div>
                            </div>

                            {/* Filter Buttons */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {(['recent10', '7days', '30days', 'all'] as TradeFilter[]).map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => {
                                            if (filter === 'all' && closedPositions.length > 0) {
                                                setFilterOnly('all');
                                            } else {
                                                fetchTrades(filter);
                                            }
                                        }}
                                        disabled={tradesLoading}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentFilter === filter
                                            ? 'bg-emerald-500 text-white shadow-lg'
                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {filter === 'recent10' ? 'Recent 10' :
                                            filter === '7days' ? '7 Days' :
                                                filter === '30days' ? '30 Days' : 'All Trades'}
                                    </button>
                                ))}
                            </div>

                            {/* Loading State */}
                            {tradesLoading && (
                                <div className="h-[300px] flex items-center justify-center">
                                    <LoadingSpinner message="Loading trades..." />
                                </div>
                            )}

                            {/* Error State */}
                            {tradesError && (
                                <div className="h-[300px] flex items-center justify-center">
                                    <p className="text-red-400">{tradesError}</p>
                                </div>
                            )}

                            {/* Empty State — data fetches only on filter click, not when user searches */}
                            {!tradesLoading && !tradesError && !currentFilter && (
                                <div className="h-[300px] flex items-center justify-center">
                                    <p className="text-slate-400 text-center max-w-sm">Click a filter above to view trade performance. Data is loaded only when you select a filter, not when you search for a wallet.</p>
                                </div>
                            )}

                            {/* Graph — only real data from Polymarket API, no placeholder */}
                            {!tradesLoading && !tradesError && currentFilter && performanceGraphData.length > 0 && (
                                <>
                                    <div className="h-[300px] w-full mt-4">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={performanceGraphData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                                                <defs>
                                                    <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                                <XAxis
                                                    dataKey="dateShort"
                                                    stroke="#64748b"
                                                    fontSize={11}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    interval="preserveStartEnd"
                                                />
                                                <YAxis
                                                    stroke="#64748b"
                                                    fontSize={12}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickFormatter={(value) => {
                                                        if (value == null || Number.isNaN(Number(value))) return '';
                                                        const n = Number(value);
                                                        if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
                                                        if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
                                                        return `$${Math.round(n)}`;
                                                    }}
                                                />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                                                    itemStyle={{ color: '#10b981' }}
                                                    labelFormatter={(label) => label}
                                                    formatter={(value: number) => ['Cumulative PnL: ' + formatCurrency(Number(value)), '']}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="cumulativePnl"
                                                    stroke="#10b981"
                                                    strokeWidth={3}
                                                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#0f172a' }}
                                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">Source: Polymarket API (real data only)</p>
                                </>
                            )}
                            {!tradesLoading && !tradesError && currentFilter && performanceGraphData.length === 0 && filteredTrades.length === 0 && (
                                <div className="h-[300px] flex flex-col items-center justify-center text-center px-4 mt-4 rounded-2xl border border-slate-800 bg-slate-900/30">
                                    <p className="text-slate-400 font-medium">No trade data from Polymarket</p>
                                    <p className="text-sm text-slate-500 mt-1">This wallet has no PnL history in the API. Chart shows only real data.</p>
                                </div>
                            )}
                        </div>

                        {/* QUICK STATS */}
                        <div className="relative overflow-hidden bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-3xl p-6">
                            <div className="pointer-events-none absolute -top-16 right-1/4 h-28 w-[320px] rounded-full bg-emerald-500/8 blur-3xl" />
                            <h3 className="text-lg font-bold mb-4">Quick Insights</h3>
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm text-slate-400">Total Gains</p>
                                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <p className="text-xl font-bold text-emerald-400">{formatCurrency(totalGains)}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm text-slate-400">Total Losses</p>
                                        <TrendingDown className="h-4 w-4 text-red-400" />
                                    </div>
                                    <p className="text-xl font-bold text-red-400">{formatCurrency(totalLosses)}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm text-slate-400">Balance</p>
                                        <Wallet className="h-4 w-4 text-blue-400" />
                                    </div>
                                    <p className="text-xl font-bold text-white">{formatCurrency(balance)}</p>
                                    <p className="text-xs text-slate-500 mt-1">Portfolio value (Polymarket API)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TABS SECTION */}
                    <div className="relative overflow-hidden bg-gradient-to-b from-white/[0.07] to-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-3xl overflow-hidden mb-12">
                        <div className="pointer-events-none absolute -top-16 left-1/2 h-28 w-[420px] -translate-x-1/2 rounded-full bg-cyan-500/8 blur-3xl" />
                        <div className="flex border-b border-white/10 p-2 gap-2 overflow-x-auto scrollbar-hide">
                            {[
                                { id: 'distribution', label: 'Distribution' },
                                { id: 'active_positions', label: 'Active Positions' },
                                { id: 'closed_positions', label: 'Closed Positions' },
                                { id: 'activity', label: 'Recent 10 Trades' },
                                // { id: 'history', label: 'Trade History' } // Hidden: trade history tab
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-6 py-3 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.id
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-6">
                            {/* Trade History tab – commented out, tab hidden above
                            {activeTab === 'history' && (
                                <div>
                                    <div className="flex flex-wrap gap-2 mb-6">
                                        {(['recent10', '7days', '30days', 'all'] as TradeFilter[]).map((filter) => (
                                            <button
                                                key={filter}
                                                onClick={() => fetchTrades(filter)}
                                                disabled={tradesLoading}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${currentFilter === filter
                                                    ? 'bg-emerald-500 text-white shadow-lg'
                                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {filter === 'recent10' ? 'Recent 10' :
                                                    filter === '7days' ? '7 Days' :
                                                        filter === '30days' ? '30 Days' : 'All Trades'}
                                            </button>
                                        ))}
                                    </div>
                                    {tradesLoading && (
                                        <div className="h-[300px] flex items-center justify-center">
                                            <LoadingSpinner message="Loading trades..." />
                                        </div>
                                    )}
                                    {tradesError && (
                                        <div className="h-[300px] flex items-center justify-center">
                                            <p className="text-red-400">{tradesError}</p>
                                        </div>
                                    )}
                                    {!tradesLoading && !tradesError && !currentFilter && (
                                        <div className="h-[300px] flex items-center justify-center">
                                            <p className="text-slate-400">Select a filter above to view trade history</p>
                                        </div>
                                    )}
                                    {!tradesLoading && !tradesError && currentFilter && filteredTrades.length > 0 && (
                                        <>
                                            <div className="overflow-x-auto mb-4">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="border-b border-slate-800 text-slate-400 text-sm">
                                                            <th className="text-left py-3 px-4 font-medium">Date</th>
                                                            <th className="text-left py-3 px-4 font-medium">PnL</th>
                                                            <th className="text-left py-3 px-4 font-medium">Cumulative PnL</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/50">
                                                        {filteredTrades
                                                            .slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage)
                                                            .map((trade, idx) => (
                                                                <tr key={idx} className="hover:bg-slate-800/30">
                                                                    <td className="py-3 px-4 text-slate-300">
                                                                        {new Date(trade.t * 1000).toLocaleDateString('en-US', {
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                    </td>
                                                                    <td className={`py-3 px-4 font-medium ${trade.p > 0 ? 'text-emerald-400' : trade.p < 0 ? 'text-rose-400' : 'text-slate-300'
                                                                        }`}>
                                                                        {formatCurrency(trade.p)}
                                                                    </td>
                                                                    <td className="py-3 px-4 text-white font-medium">
                                                                        {formatCurrency(trade.p)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="flex items-center justify-between mt-4">
                                                <div className="text-slate-400 text-sm">
                                                    Showing {(historyPage - 1) * itemsPerPage + 1} to {Math.min(historyPage * itemsPerPage, filteredTrades.length)} of {filteredTrades.length} trades
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setHistoryPage(prev => Math.max(1, prev - 1))}
                                                        disabled={historyPage === 1}
                                                        className={`px-4 py-2 rounded text-sm font-medium transition ${historyPage === 1 ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'
                                                            }`}
                                                    >
                                                        Previous
                                                    </button>
                                                    <span className="px-4 py-2 text-slate-300 text-sm">
                                                        Page {historyPage} of {Math.ceil(filteredTrades.length / itemsPerPage) || 1}
                                                    </span>
                                                    <button
                                                        onClick={() => setHistoryPage(prev => Math.min(Math.ceil(filteredTrades.length / itemsPerPage), prev + 1))}
                                                        disabled={historyPage >= Math.ceil(filteredTrades.length / itemsPerPage)}
                                                        className={`px-4 py-2 rounded text-sm font-medium transition ${historyPage >= Math.ceil(filteredTrades.length / itemsPerPage) ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'
                                                            }`}
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            */}

                            {/* Recent 10 Trades tab – full details: trade name, date, buy/sell, price */}
                            {activeTab === 'activity' && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4">Recent 10 Trades</h3>
                                    {recentTradesLoading ? (
                                        <div className="h-[300px] flex items-center justify-center">
                                            <LoadingSpinner message="Loading recent trades..." />
                                        </div>
                                    ) : recentTradesError ? (
                                        <p className="text-red-400 text-center py-8">{recentTradesError}</p>
                                    ) : recentTradesList.length > 0 ? (
                                        <>
                                            <div className="overflow-x-auto mb-4">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="border-b border-slate-800 text-slate-400 text-sm">
                                                            <th className="text-left py-3 px-4 font-medium">Trade name</th>
                                                            <th className="text-left py-3 px-4 font-medium">Date of purchase</th>
                                                            <th className="text-left py-3 px-4 font-medium">Buy / Sell</th>
                                                            <th className="text-right py-3 px-4 font-medium">Price</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/50">
                                                        {recentTradesList.map((trade, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-800/30">
                                                                <td className="py-3 px-4 text-slate-200 max-w-[280px] truncate" title={trade.title}>
                                                                    {trade.title || '—'}
                                                                </td>
                                                                <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                                                                    {trade.timestamp
                                                                        ? new Date(trade.timestamp * 1000).toLocaleDateString('en-US', {
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                          })
                                                                        : '—'}
                                                                </td>
                                                                <td className="py-3 px-4">
                                                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${(trade.side || '').toUpperCase() === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                                                        {(trade.side || '—').toUpperCase()}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 px-4 text-right font-medium text-white">
                                                                    {formatCurrency(trade.price)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <p className="text-slate-400 text-sm">Showing {recentTradesList.length} recent trades (Polymarket Data API)</p>
                                        </>
                                    ) : (
                                        <p className="text-slate-400 text-center py-8">No recent trades for this wallet.</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'active_positions' && (
                                <div>
                                    <div className="overflow-x-auto mb-4">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-800 text-slate-400 text-sm">
                                                    <th className="text-left py-3 px-4 font-medium">Market</th>
                                                    <th className="text-left py-3 px-4 font-medium">Outcome</th>
                                                    <th className="text-left py-3 px-4 font-medium">Size</th>
                                                    <th className="text-left py-3 px-4 font-medium">Avg Price</th>
                                                    <th className="text-left py-3 px-4 font-medium">Cur Price</th>
                                                    <th className="text-left py-3 px-4 font-medium">Unrealized PnL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {positions
                                                    .slice((activePositionsPage - 1) * itemsPerPage, activePositionsPage * itemsPerPage)
                                                    .map((position, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-800/30">
                                                            <td className="py-3 px-4 text-white font-medium max-w-xs truncate">
                                                                {position.title || position.slug || 'Market'}
                                                            </td>
                                                            <td className="py-3 px-4 text-slate-300 text-sm">{position.outcome || 'N/A'}</td>
                                                            <td className="py-3 px-4 text-white font-medium">{formatSize(position.size)}</td>
                                                            <td className="py-3 px-4 text-slate-300">{formatCurrency(position.avg_price || 0)}</td>
                                                            <td className="py-3 px-4 text-slate-300">{formatCurrency(position.cur_price || 0)}</td>
                                                            <td className={`py-3 px-4 font-bold ${(position.cash_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                {formatCurrency(position.cash_pnl || 0)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Active Positions Pagination */}
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-slate-400 text-sm">
                                            Showing {(activePositionsPage - 1) * itemsPerPage + 1} to {Math.min(activePositionsPage * itemsPerPage, positions.length)} of {positions.length} positions
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setActivePositionsPage(prev => Math.max(1, prev - 1))}
                                                disabled={activePositionsPage === 1}
                                                className={`px-4 py-2 rounded text-sm font-medium transition ${activePositionsPage === 1 ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                            >
                                                Previous
                                            </button>
                                            <span className="px-4 py-2 text-slate-300 text-sm">
                                                Page {activePositionsPage} of {Math.ceil(positions.length / itemsPerPage) || 1}
                                            </span>
                                            <button
                                                onClick={() => setActivePositionsPage(prev => Math.min(Math.ceil(positions.length / itemsPerPage), prev + 1))}
                                                disabled={activePositionsPage >= Math.ceil(positions.length / itemsPerPage)}
                                                className={`px-4 py-2 rounded text-sm font-medium transition ${activePositionsPage >= Math.ceil(positions.length / itemsPerPage) ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'closed_positions' && (
                                <div>
                                    <div className="overflow-x-auto mb-4">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-slate-800 text-slate-400 text-sm">
                                                    <th className="text-left py-3 px-4 font-medium">Date</th>
                                                    <th className="text-left py-3 px-4 font-medium">Market</th>
                                                    <th className="text-left py-3 px-4 font-medium">Outcome</th>
                                                    <th className="text-left py-3 px-4 font-medium">Size</th>
                                                    <th className="text-left py-3 px-4 font-medium">Avg Price</th>
                                                    <th className="text-left py-3 px-4 font-medium">Exit Price</th>
                                                    <th className="text-left py-3 px-4 font-medium">Realized PnL</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800/50">
                                                {closedPositions
                                                    .slice((closedPositionsPage - 1) * itemsPerPage, closedPositionsPage * itemsPerPage)
                                                    .map((position, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-800/30">
                                                            <td className="py-3 px-4 text-slate-300 text-sm whitespace-nowrap">
                                                                {formatDate((position as any).timestamp || (position as any).created_at)}
                                                            </td>
                                                            <td className="py-3 px-4 text-white font-medium max-w-xs truncate">
                                                                {position.title || position.slug || 'Market'}
                                                            </td>
                                                            <td className="py-3 px-4 text-slate-300 text-sm">{position.outcome || 'N/A'}</td>
                                                            <td className="py-3 px-4 text-white font-medium">{formatSize(position.size)}</td>
                                                            <td className="py-3 px-4 text-slate-300">{formatCurrency(position.avg_price || 0)}</td>
                                                            <td className="py-3 px-4 text-slate-300">{formatCurrency(position.cur_price || 0)}</td>
                                                            <td className={`py-3 px-4 font-bold ${(position.realized_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                {formatCurrency(position.realized_pnl || 0)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {/* Closed Positions Pagination */}
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="text-slate-400 text-sm">
                                            Showing {(closedPositionsPage - 1) * itemsPerPage + 1} to {Math.min(closedPositionsPage * itemsPerPage, closedPositions.length)} of {closedPositions.length} positions
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setClosedPositionsPage(prev => Math.max(1, prev - 1))}
                                                disabled={closedPositionsPage === 1}
                                                className={`px-4 py-2 rounded text-sm font-medium transition ${closedPositionsPage === 1 ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                            >
                                                Previous
                                            </button>
                                            <span className="px-4 py-2 text-slate-300 text-sm">
                                                Page {closedPositionsPage} of {Math.ceil(closedPositions.length / itemsPerPage) || 1}
                                            </span>
                                            <button
                                                onClick={() => setClosedPositionsPage(prev => Math.min(Math.ceil(closedPositions.length / itemsPerPage), prev + 1))}
                                                disabled={closedPositionsPage >= Math.ceil(closedPositions.length / itemsPerPage)}
                                                className={`px-4 py-2 rounded text-sm font-medium transition ${closedPositionsPage >= Math.ceil(closedPositions.length / itemsPerPage) ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'performance' && (
                                <div className="space-y-6">
                                    <div className="bg-slate-800/30 border border-emerald-500/20 rounded-2xl p-6">
                                        <h4 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4" />
                                            7-Day Profit Trend
                                        </h4>
                                        <div className="h-[200px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={profitTrend} margin={{ top: 8, right: 8, left: 8, bottom: 28 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                                    <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickMargin={8} />
                                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                                                        formatter={(value: any) => [formatCurrency(value), 'Daily PnL']}
                                                    />
                                                    <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                                                        {profitTrend.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#f43f5e'} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                                            <p className="text-sm text-slate-400 mb-1">Primary Edge</p>
                                            <p className="text-lg font-medium text-white">{primaryEdge}</p>
                                        </div>
                                        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
                                            <p className="text-sm text-slate-400 mb-1">Trading Efficiency</p>
                                            <p className="text-lg font-medium text-white">
                                                {((metrics.streaks.total_wins / (metrics.total_trades || 1)) * 100).toFixed(1)}% hit rate
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'distribution' && (
                                loadingDistribution ? (
                                    <div className="h-[300px] flex items-center justify-center">
                                        <LoadingSpinner message="Fetching market distribution from API..." />
                                    </div>
                                ) : (
                                    <MarketDistributionPanel
                                        marketDistribution={apiDistribution.length > 0 ? apiDistribution : []}
                                        activities={activities}
                                        positions={positions}
                                        closedPositions={closedPositions}
                                    />
                                )
                            )}


                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
