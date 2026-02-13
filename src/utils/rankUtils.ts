
export interface VolumeRank {
    title: string;
    emoji: string;
    className: string;
    tooltip: string;
}

export const getVolumeRank = (volume: number): VolumeRank => {
    if (volume >= 100000000) return {
        title: 'Elite Whale',
        emoji: '🐋👑',
        className: 'bg-purple-900/40 text-purple-300 border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.6)]',
        tooltip: '$100M+ Volume',
    };
    if (volume >= 10000000) return {
        title: 'Mega Whale',
        emoji: '🐋🔥',
        className: 'bg-orange-900/40 text-orange-300 border-orange-400 shadow-[0_0_30px_rgba(249,115,22,0.6)]',
        tooltip: '$10M – $100M Volume',
    };
    if (volume >= 1000000) return {
        title: 'Whale',
        emoji: '🐋',
        className: 'bg-emerald-900/40 text-emerald-300 border-emerald-400 shadow-[0_0_30px_rgba(34,197,94,0.6)]',
        tooltip: '$1M – $10M Volume',
    };
    if (volume >= 500000) return {
        title: 'Shark',
        emoji: '🦈',
        className: 'bg-blue-900/40 text-blue-300 border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.6)]',
        tooltip: '$500K – $1M Volume',
    };
    if (volume >= 200000) return {
        title: 'Dolphin',
        emoji: '🐬',
        className: 'bg-cyan-900/40 text-cyan-300 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.6)]',
        tooltip: '$200K – $500K Volume',
    };
    if (volume >= 50000) return {
        title: 'Young Dolphin',
        emoji: '🐬',
        className: 'bg-cyan-900/20 text-cyan-200 border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.4)]',
        tooltip: '$50K – $200K Volume',
    };
    if (volume >= 20000) return {
        title: 'Fish',
        emoji: '🐟',
        className: 'bg-teal-900/20 text-teal-200 border-teal-300 shadow-[0_0_20px_rgba(45,212,191,0.4)]',
        tooltip: '$20K – $50K Volume',
    };
    if (volume >= 5000) return {
        title: 'Crab',
        emoji: '🦀',
        className: 'bg-red-900/20 text-red-300 border-red-400 shadow-[0_0_20px_rgba(248,113,113,0.4)]',
        tooltip: '$5K – $20K Volume',
    };
    return {
        title: 'Shrimp',
        emoji: '🦐',
        className: 'bg-slate-800/40 text-slate-300 border-slate-400',
        tooltip: 'Volume < $5K',
    };
};
