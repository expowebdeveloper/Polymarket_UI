import { useNavigate } from 'react-router-dom';
import { BarChart2, Gift, Bookmark } from 'lucide-react';
import type { Market } from '../types/api';

interface MarketCardProps {
    market: Market;
    onToggleFavorite?: (id: string, e: React.MouseEvent) => void;
    isFavorite?: boolean;
}

// Helper to format currency
const formatCurrency = (value: number | string | undefined): string => {
    if (!value) return '$0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}m`; // Lowercase m like screenshot
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}k`;
    return `$${num.toFixed(0)}`;
};

export function MarketCard({ market, onToggleFavorite, isFavorite }: MarketCardProps) {
    const navigate = useNavigate();

    // Determine market identity
    const marketSlug = (market.slug && market.slug.trim()) ||
        (market.market_slug && market.market_slug.trim()) ||
        market.id ||
        market.market_id;

    const marketId = marketSlug || market.id || String(Math.random());

    // Safe navigation handler
    const handleClick = () => {
        if (marketSlug) {
            navigate(`/markets/${encodeURIComponent(marketSlug)}`);
        }
    };

    // Advanced outcome detection
    const getMarketInfo = (): {
        isBinary: boolean;
        yesOutcome: { name: string; price: number } | null;
        displayOutcomesList: { name: string; price: number }[];
    } => {
        const prices = market.outcomePrices || {};
        const outcomesRaw = market.outcomes || [];

        let processedOutcomes: { name: string; price: number }[] = [];

        if (Array.isArray(prices)) {
            processedOutcomes = prices.map((price: any, idx: number) => ({
                name: outcomesRaw[idx] || (idx === 0 ? 'Yes' : 'No'),
                price: typeof price === 'string' ? parseFloat(price) : price
            }));
        } else {
            processedOutcomes = Object.entries(prices).map(([name, price]) => ({
                name,
                price: typeof price === 'string' ? parseFloat(price) : (price as number)
            }));
        }

        // Detect Binary (Yes/No)
        const isBinary = processedOutcomes.length === 2 &&
            processedOutcomes.some(o => o.name.toLowerCase() === 'yes') &&
            processedOutcomes.some(o => o.name.toLowerCase() === 'no');

        // Find "Yes" outcome for binary
        const yesOutcome = isBinary ? (processedOutcomes.find(o => o.name.toLowerCase() === 'yes') || null) : null;

        // Final outcomes to display in list (if not binary)
        const displayOutcomesList = [...processedOutcomes].sort((a, b) => b.price - a.price).slice(0, 2);

        return { isBinary, yesOutcome, displayOutcomesList };
    };

    const { isBinary, yesOutcome, displayOutcomesList } = getMarketInfo();

    return (
        <div
            className="bg-[#2C3F5E] hover:bg-[#374C6E] transition-all duration-300 rounded-xl border border-[#2C3F5E] hover:border-slate-500/30 overflow-hidden cursor-pointer flex flex-col h-full group shadow-lg"
            onClick={handleClick}
        >
            {/* Card Header: Icon + Title */}
            <div className="p-4 flex gap-3 items-start">
                <div className="relative flex-shrink-0">
                    {market.icon || market.image ? (
                        <img
                            src={market.icon || market.image}
                            alt={market.title}
                            className="w-12 h-12 rounded bg-slate-700 object-cover"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(market.title || 'M')}&background=random`;
                            }}
                        />
                    ) : (
                        <div className="w-12 h-12 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                            {market.title?.substring(0, 1) || 'M'}
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-[15px] leading-snug line-clamp-3 group-hover:text-emerald-400 transition-colors">
                        {market.question || market.title || 'Untitled Market'}
                    </h3>
                </div>
            </div>

            {/* Layout Switch: Binary vs List */}
            {isBinary ? (
                <div className="px-4 pb-4 mt-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col">
                            <span className="text-3xl font-bold text-white tracking-tight">
                                {Math.round((yesOutcome?.price || 0) * 100)}%
                            </span>
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                chance
                            </span>
                        </div>

                        {/* Binary Gauge Placeholder - Visual flair */}
                        <div className="w-12 h-12 relative flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-700" />
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={126} strokeDashoffset={126 - (126 * (yesOutcome?.price || 0))} className="text-emerald-500 transition-all duration-1000" />
                            </svg>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            className="bg-[#0E473E] hover:bg-emerald-600 text-emerald-400 hover:text-white text-sm font-bold py-2.5 rounded-lg transition-all duration-200"
                            onClick={(e) => { e.stopPropagation(); /* Buy Yes */ }}
                        >
                            Yes
                        </button>
                        <button
                            className="bg-[#482028] hover:bg-red-600 text-red-400 hover:text-white text-sm font-bold py-2.5 rounded-lg transition-all duration-200"
                            onClick={(e) => { e.stopPropagation(); /* Buy No */ }}
                        >
                            No
                        </button>
                    </div>
                </div>
            ) : (
                <div className="px-4 pb-4 mt-auto flex flex-col gap-2">
                    {displayOutcomesList.length > 0 ? displayOutcomesList.map((outcome, idx) => {
                        const percentage = Math.round(outcome.price * 100);
                        return (
                            <div key={idx} className="flex items-center justify-between group/row">
                                <span className="text-sm text-slate-300 truncate max-w-[120px]">{outcome.name}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-white w-8 text-right">{percentage}%</span>
                                    <div className="flex gap-1">
                                        <button className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white text-[10px] px-2 py-1 rounded font-bold transition-all" onClick={(e) => e.stopPropagation()}>Yes</button>
                                        <button className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white text-[10px] px-2 py-1 rounded font-bold transition-all" onClick={(e) => e.stopPropagation()}>No</button>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="text-slate-500 text-xs italic py-2 text-center border border-dashed border-slate-700 rounded">
                            No market data available
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-700/30 flex items-center justify-between text-xs text-slate-400 bg-slate-900/20">
                <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(market.volume)} Vol.</span>
                    {(market.liquidity || 0) > 0 && (
                        <>
                            <span className="text-slate-600">•</span>
                            <span>{formatCurrency(market.liquidity)} Liq.</span>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <BarChart2 className="w-3.5 h-3.5 hover:text-white transition-colors" />
                    <Gift className="w-3.5 h-3.5 hover:text-white transition-colors" />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleFavorite) onToggleFavorite(marketId, e);
                        }}
                        className={`hover:text-white transition-all transform hover:scale-110 ${isFavorite ? 'text-yellow-400' : ''}`}
                    >
                        <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                </div>
            </div>
        </div>
    );
}
