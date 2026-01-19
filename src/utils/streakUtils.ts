
export interface StreakBadge {
    title: string;
    emoji: string;
    className: string;
}

export const getStreakBadge = (streak: number): StreakBadge | null => {
    if (streak >= 30) return {
        title: 'Legendary Streak',
        emoji: '🐉🔥',
        className: 'bg-indigo-900/40 text-indigo-300 border-indigo-400 shadow-[0_0_35px_rgba(99,102,241,0.8)]'
    };
    if (streak >= 20) return {
        title: 'Unstoppable Streak',
        emoji: '🧨👑',
        className: 'bg-fuchsia-900/40 text-fuchsia-300 border-fuchsia-400 shadow-[0_0_35px_rgba(232,121,249,0.8)]'
    };
    if (streak >= 15) return {
        title: 'Inferno Streak',
        emoji: '🌋🔥',
        className: 'bg-rose-900/40 text-rose-300 border-rose-400 shadow-[0_0_35px_rgba(251,113,133,0.8)]'
    };
    if (streak >= 10) return {
        title: 'Scorching Streak',
        emoji: '🔥⚡',
        className: 'bg-orange-900/40 text-orange-300 border-orange-400 shadow-[0_0_35px_rgba(249,115,22,0.8)]'
    };
    if (streak >= 8) return {
        title: 'Blazing Streak',
        emoji: '🔥🚀',
        className: 'bg-orange-900/30 text-orange-200 border-orange-300 shadow-[0_0_30px_rgba(251,146,60,0.6)]'
    };
    if (streak >= 5) return {
        title: 'Hot Streak',
        emoji: '🔥🔥',
        className: 'bg-amber-900/30 text-amber-200 border-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.5)]'
    };
    if (streak >= 3) return {
        title: 'Warm Streak',
        emoji: '🔥',
        className: 'bg-yellow-900/30 text-yellow-200 border-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.4)]'
    };

    return null;
};
