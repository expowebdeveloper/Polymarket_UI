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

    // Get top outcomes (limit to 2 for the card view)
    const getOutcomes = () => {
        if (!market.outcomePrices) return [];

        // Convert outcomes to array and sort by price (probability) descending
        return Object.entries(market.outcomePrices)
            .map(([name, price]) => ({ name, price }))
            .sort((a, b) => b.price - a.price)
            .slice(0, 2);
    };

    const outcomes = getOutcomes();
    // Default to dummy outcomes if none exist (for visual testing if API data is sparse)
    const displayOutcomes = outcomes.length > 0 ? outcomes : [
        { name: 'Yes', price: market.price || 0.5 },
        { name: 'No', price: 1 - (market.price || 0.5) }
    ];

    return (
        <div
            className="bg-[#2C3F5E] hover:bg-[#374C6E] transition-colors rounded-xl border border-[#2C3F5E] overflow-hidden cursor-pointer flex flex-col h-full group"
            onClick={handleClick}
        >
            {/* Card Header: Icon + Title */}
            <div className="p-4 flex gap-3 items-start">
                {market.icon || market.image ? (
                    <img
                        src={market.icon || market.image}
                        alt={market.title}
                        className="w-12 h-12 rounded bg-slate-700 object-cover flex-shrink-0"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(market.title || 'M')}&background=random`;
                        }}
                    />
                ) : (
                    <div className="w-12 h-12 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {market.title?.substring(0, 1) || 'M'}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-[15px] leading-snug line-clamp-3">
                        {market.question || market.title || 'Untitled Market'}
                    </h3>
                </div>

                {/* Mobile-only favorite for now, or unified approach */}
            </div>

            {/* Outcomes Grid */}
            <div className="px-4 pb-2 flex-1 flex flex-col gap-2">
                {displayOutcomes.map((outcome, idx) => {
                    const percentage = Math.round(outcome.price * 100);
                    return (
                        <div key={idx} className="flex items-center justify-between text-sm py-1">
                            <div className="flex-1 min-w-0 pr-4">
                                <span className="text-slate-300 truncate block">{outcome.name}</span>
                            </div>

                            <div className="flex items-center gap-4">
                                <span className={`font-medium w-8 text-right ${idx === 0 ? 'text-emerald-400' : 'text-slate-300'
                                    }`}>
                                    {percentage}%
                                </span>

                                <div className="flex gap-1.5 opacity-100 transition-opacity">
                                    <button
                                        className="bg-[#0E473E] hover:bg-[#136054] text-emerald-400 text-xs px-3 py-1.5 rounded font-medium transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Buy Yes logic
                                        }}
                                    >
                                        Yes
                                    </button>
                                    <button
                                        className="bg-[#482028] hover:bg-[#632833] text-red-400 text-xs px-3 py-1.5 rounded font-medium transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Buy No logic
                                        }}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer Details */}
            <div className="px-4 py-3 mt-auto border-t border-slate-700/30 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1">
                    <span>{formatCurrency(market.volume)} Vol.</span>
                </div>

                <div className="flex items-center gap-3">
                    {/* Action Icons */}
                    <BarChart2 className="w-3.5 h-3.5 hover:text-white transition-colors" />
                    <Gift className="w-3.5 h-3.5 hover:text-white transition-colors" />
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleFavorite) onToggleFavorite(marketId, e);
                        }}
                        className={`hover:text-white transition-colors ${isFavorite ? 'text-yellow-400' : ''}`}
                    >
                        <Bookmark className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                </div>
            </div>
        </div>
    );
}
