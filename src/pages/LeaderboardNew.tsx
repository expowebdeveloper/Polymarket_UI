import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Activity, Info, ArrowUpRight, Copy, Check, Star } from 'lucide-react';
import { fetchNewLeaderboard } from '../services/api';
import { API_BASE_URL } from '../config';
import type { LeaderboardEntry } from '../types/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useTheme } from '../contexts/ThemeContext';

export const LeaderboardNew: React.FC = () => {
  const { theme } = useTheme();
  const [traders, setTraders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [updatedWallets, setUpdatedWallets] = useState<Set<string>>(new Set());
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

  // Initial Data Fetch
  const loadInitialData = async () => {
    try {
      const response = await fetchNewLeaderboard(100, 0);
      setTraders(response.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  // WebSocket Connection
  const connect = useCallback(() => {
    if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);

    const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
    const wsBase = API_BASE_URL.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}://${wsBase}/ws/activity`;

    try {
      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        console.log('✅ Leaderboard WS Connected');
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'leaderboard_update') {
          handleUpdate(message.data);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        reconnectTimeout.current = setTimeout(connect, 2000);
      };

      socket.onerror = () => setIsConnected(false);
    } catch (e) {
      console.error('WS Connection error', e);
    }
  }, []);

  const handleUpdate = (updatedTrader: any) => {
    setTraders((prev) => {
      const index = prev.findIndex(t => t.wallet_address === updatedTrader.wallet_address);
      let newTraders = [...prev];
      
      if (index !== -1) {
        newTraders[index] = { ...newTraders[index], ...updatedTrader };
      } else {
        newTraders.push(updatedTrader as LeaderboardEntry);
      }

      // Sort by final_score descending
      return newTraders.sort((a, b) => (b.final_score || 0) - (a.final_score || 0));
    });

    // Flash Highlight
    setUpdatedWallets(prev => new Set(prev).add(updatedTrader.wallet_address));
    setTimeout(() => {
      setUpdatedWallets(prev => {
        const next = new Set(prev);
        next.delete(updatedTrader.wallet_address);
        return next;
      });
    }, 2000);
  };

  useEffect(() => {
    loadInitialData();
    connect();
    return () => {
      ws.current?.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);

  const copyToClipboard = (wallet: string) => {
    navigator.clipboard.writeText(wallet);
    setCopiedWallet(wallet);
    setTimeout(() => setCopiedWallet(null), 2000);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading) return <LoadingSpinner message="Fetching live leaderboard..." />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center max-w-md">
          <Info className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Data</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button 
            onClick={() => { setError(null); loadInitialData(); }}
            className="bg-white text-black px-6 py-2 rounded-xl font-bold hover:bg-slate-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-transparent' : 'bg-slate-50'} p-4 lg:p-8`}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 rounded-2xl">
                <Trophy className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-white">
                Live <span className="text-emerald-400">Rankings</span>
              </h1>
            </div>
            <p className="text-slate-400 text-lg flex items-center gap-2">
              <Activity className={`w-4 h-4 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-red-400'}`} />
              {isConnected ? 'Real-time sync active' : 'Connecting to live feed...'}
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl">
            <div className="text-right">
              <p className="text-slate-400 text-xs uppercase tracking-wider font-bold">Total Analyzed</p>
              <p className="text-2xl font-mono text-white">{traders.length.toLocaleString()}</p>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <Users className="w-6 h-6 text-emerald-400" />
          </div>
        </div>

        {/* Info Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-6 rounded-3xl flex items-start gap-4"
        >
          <div className="p-2 bg-emerald-500/20 rounded-xl">
            <Info className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-emerald-400 font-bold mb-1">How it works</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              This leaderboard updates in real-time as our sync engine processes Polymarket data. 
              The <span className="font-bold text-white uppercase italic">Rating</span> is calculated using a multi-factor Bayesian model considering ROI, PnL volume, win rate, and risk metrics.
            </p>
          </div>
        </motion.div>

        {/* Leaderboard Table */}
        <div className="relative overflow-hidden bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-2 px-4 pb-4">
              <thead>
                <tr className="text-slate-400 uppercase text-[10px] tracking-[0.2em] font-black">
                  <th className="py-6 px-6">Rank</th>
                  <th className="py-6 px-4">Predictor</th>
                  <th className="py-6 px-4">Total PnL</th>
                  <th className="py-6 px-4">ROI</th>
                  <th className="py-6 px-4">Win Rate</th>
                  <th className="py-6 px-4 text-emerald-400">Rating</th>
                  <th className="py-6 px-4"></th>
                </tr>
              </thead>
              <tbody className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {traders.map((trader, index) => (
                    <motion.tr
                      key={trader.wallet_address}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1,
                        backgroundColor: updatedWallets.has(trader.wallet_address) 
                          ? 'rgba(16, 185, 129, 0.15)' 
                          : 'rgba(255, 255, 255, 0.03)'
                      }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ 
                         layout: { duration: 0.5, type: 'spring', stiffness: 300, damping: 30 },
                         backgroundColor: { duration: 0.3 }
                      }}
                      className={`group transition-all duration-300 hover:bg-white/10 ${updatedWallets.has(trader.wallet_address) ? 'ring-2 ring-emerald-500/50' : ''} rounded-2xl`}
                    >
                      <td className="py-4 px-6">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                          ${index === 0 ? 'bg-yellow-400 text-black shadow-[0_0_20px_rgba(250,204,21,0.4)]' : 
                            index === 1 ? 'bg-slate-300 text-black' :
                            index === 2 ? 'bg-orange-400 text-black' :
                            'bg-white/5 text-slate-400'}`}
                        >
                          {index + 1}
                        </div>
                      </td>
                      <td className="py-4 px-4 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img 
                              src={trader.profile_image || `https://api.dicebear.com/7.x/identicon/svg?seed=${trader.wallet_address}`} 
                              alt="" 
                              className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10"
                            />
                            {updatedWallets.has(trader.wallet_address) && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-ping" />
                            )}
                          </div>
                          <div>
                            <p className="text-white font-bold tracking-tight">
                              {trader.name || trader.pseudonym || `${trader.wallet_address.slice(0, 6)}...${trader.wallet_address.slice(-4)}`}
                            </p>
                            <button 
                              onClick={() => copyToClipboard(trader.wallet_address)}
                              className="text-[10px] text-slate-500 hover:text-emerald-400 font-mono transition-colors flex items-center gap-1"
                            >
                              {copiedWallet === trader.wallet_address ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              {trader.wallet_address.slice(0, 10)}...
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className={`font-mono font-bold ${trader.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {formatCurrency(trader.total_pnl)}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <p className={`font-mono text-sm ${trader.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {trader.roi?.toFixed(2)}%
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <p className="font-mono text-sm text-white">
                            {trader.win_rate?.toFixed(1)}%
                          </p>
                          <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-400" 
                              style={{ width: `${trader.win_rate}%` }} 
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 inline-block">
                          <p className="text-xl font-black text-emerald-400 font-mono italic">
                            {trader.final_score?.toFixed(1)}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-500 hover:text-white">
                          <ArrowUpRight className="w-5 h-5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          
          {!traders.length && !loading && (
            <div className="py-20 text-center space-y-4">
              <Star className="w-12 h-12 text-slate-700 mx-auto" />
              <p className="text-slate-500 font-medium">Waiting for sync data...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
