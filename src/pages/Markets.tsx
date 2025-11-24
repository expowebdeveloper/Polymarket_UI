import { Search, Filter, TrendingUp, TrendingDown, Star } from 'lucide-react';
import { useState } from 'react';

const marketCategories = ['All', 'Politics', 'Sports', 'Crypto', 'Entertainment', 'Economics'];

const markets = [
  {
    id: 1,
    title: 'Will Bitcoin reach $100K by end of 2024?',
    category: 'Crypto',
    volume: '$2.4M',
    liquidity: '$1.8M',
    price: '0.72',
    change: '+5.2%',
    isUp: true,
    endDate: '2024-12-31',
    isFavorite: false,
  },
  {
    id: 2,
    title: 'Will Trump win the 2024 election?',
    category: 'Politics',
    volume: '$5.2M',
    liquidity: '$3.1M',
    price: '0.58',
    change: '-2.1%',
    isUp: false,
    endDate: '2024-11-05',
    isFavorite: true,
  },
  {
    id: 3,
    title: 'Will the Lakers win the NBA championship?',
    category: 'Sports',
    volume: '$1.8M',
    liquidity: '$1.2M',
    price: '0.35',
    change: '+8.7%',
    isUp: true,
    endDate: '2024-06-15',
    isFavorite: false,
  },
  {
    id: 4,
    title: 'Will AI replace 50% of jobs by 2025?',
    category: 'Economics',
    volume: '$3.1M',
    liquidity: '$2.4M',
    price: '0.68',
    change: '+3.4%',
    isUp: true,
    endDate: '2025-12-31',
    isFavorite: true,
  },
  {
    id: 5,
    title: 'Will Taylor Swift release a new album in 2024?',
    category: 'Entertainment',
    volume: '$890K',
    liquidity: '$650K',
    price: '0.82',
    change: '-1.2%',
    isUp: false,
    endDate: '2024-12-31',
    isFavorite: false,
  },
  {
    id: 6,
    title: 'Will Ethereum hit $5K before Bitcoin hits $100K?',
    category: 'Crypto',
    volume: '$1.5M',
    liquidity: '$1.1M',
    price: '0.45',
    change: '+12.3%',
    isUp: true,
    endDate: '2024-12-31',
    isFavorite: false,
  },
];

export function Markets() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMarkets = markets.filter((market) => {
    const matchesCategory = selectedCategory === 'All' || market.category === selectedCategory;
    const matchesSearch = market.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search markets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-slate-400" />
            {marketCategories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedCategory === category
                    ? 'bg-emerald-400/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Markets List */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
        <h2 className="text-2xl font-bold mb-6">Active Markets</h2>

        <div className="space-y-3">
          {filteredMarkets.map((market) => (
            <div
              key={market.id}
              className="bg-slate-800 rounded-lg p-4 hover:bg-slate-750 transition border border-slate-700/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <button className="hover:opacity-70 transition">
                      <Star
                        className={`w-5 h-5 ${market.isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`}
                      />
                    </button>
                    <span className="px-2 py-1 bg-slate-700 text-xs text-slate-300 rounded">
                      {market.category}
                    </span>
                    <span className="text-xs text-slate-500">Ends: {market.endDate}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">{market.title}</h3>
                  <div className="flex items-center gap-6 text-sm">
                    <div>
                      <span className="text-slate-400">Volume: </span>
                      <span className="text-white font-medium">{market.volume}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Liquidity: </span>
                      <span className="text-white font-medium">{market.liquidity}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 ml-4">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">{market.price}</div>
                    <div className={`text-sm font-medium flex items-center gap-1 ${market.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                      {market.isUp ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {market.change}
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-emerald-400 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition">
                    Trade
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


