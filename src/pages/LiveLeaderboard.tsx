import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    ChevronDown,
    Gift,
    Search,
    X,
    ArrowLeft,
    ArrowRight,
    Sun,
    Moon,
    Circle,
    Check,
} from "lucide-react";
import { fetchTradersAnalytics } from "../services/api";
import type { AllLeaderboardsResponse, LeaderboardEntry } from "../types/api";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ErrorMessage } from "../components/ErrorMessage";

// --------------------
// Types
// --------------------
type RankBy = "Score" | "Win Rate" | "Total Volume" | "ROI" | "PNL" | "Rewards";
type Range = "Last 7 days" | "Last 30 days" | "All time";

const RANGE_OPTIONS: Range[] = ["Last 7 days", "Last 30 days", "All time"];
const RANK_OPTIONS: RankBy[] = ["Win Rate", "ROI", "Total Volume", "PNL", "Score", "Rewards"];

const TAG_GROUPS: { title: string; options: string[] }[] = [
    {
        title: "Score",
        options: [
            "Prediction God",
            "Prediction King",
            "Pro Predictor",
            "Skilled Predictor",
            "Rising Predictor",
            "Average Predictor",
            "Inconsistent Predictor",
            "Low Confidence Predictor",
            "Extreme Risk Predictor",
        ],
    },
    {
        title: "Volume",
        options: [
            "Crabs",
            "Shrimp",
            "Fish",
            "Young Dolphin",
            "Dolphin",
            "Shark",
            "Whale",
            "Mega Whale",
            "Elite Whale",
        ],
    },
];

// --------------------
// Helpers
// --------------------
function formatMoney(n: number) {
    const sign = n >= 0 ? "+" : "-";
    const abs = Math.abs(n);
    return `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatVolume(n: number) {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
}

function getVolumeTag(volume: number): string {
    if (volume >= 1000000) return "Elite Whale";
    if (volume >= 500000) return "Mega Whale";
    if (volume >= 100000) return "Whale";
    if (volume >= 50000) return "Shark";
    if (volume >= 10000) return "Dolphin";
    if (volume >= 5000) return "Young Dolphin";
    if (volume >= 1000) return "Fish";
    if (volume >= 100) return "Shrimp";
    return "Crabs";
}

function getScoreTag(score: number): string {
    if (score >= 95) return "Prediction God";
    if (score >= 90) return "Prediction King";
    if (score >= 80) return "Pro Predictor";
    if (score >= 70) return "Skilled Predictor";
    if (score >= 60) return "Rising Predictor";
    if (score >= 50) return "Average Predictor";
    if (score >= 40) return "Inconsistent Predictor";
    if (score >= 30) return "Low Confidence Predictor";
    return "Extreme Risk Predictor";
}

// --------------------
// UI atoms
// --------------------
function Pill({ value }: { value: string }) {
    return (
        <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white shadow-sm">
            {value}
        </span>
    );
}

function RewardPill({ amount }: { amount: number }) {
    return (
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">
            <Gift className="h-4 w-4" />
            ${amount}
        </span>
    );
}

function TagPill({ label }: { label: string }) {
    const META: Record<string, { emoji: string; cls: string }> = {
        Whale: {
            emoji: "🐋",
            cls: "bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/30",
        },
        "Mega Whale": {
            emoji: "🐳",
            cls: "bg-blue-100 text-blue-900 ring-blue-300 dark:bg-blue-500/15 dark:text-blue-100 dark:ring-blue-500/40",
        },
        "Elite Whale": {
            emoji: "👑🐋",
            cls: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white ring-blue-400 shadow dark:ring-blue-400/60",
        },
    };

    const meta = META[label] ?? {
        emoji: "🏷️",
        cls: "bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/30",
    };

    return (
        <span
            className={
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1 shadow-sm " +
                meta.cls
            }
        >
            <span aria-hidden>{meta.emoji}</span>
            {label}
        </span>
    );
}

function DropdownLike({
    label,
    onClick,
    active,
}: {
    label: string;
    onClick?: () => void;
    active?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className={
                "group inline-flex min-w-[220px] items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 " +
                (active
                    ? "border-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/40"
                    : "border-slate-200 dark:border-slate-800")
            }
            type="button"
        >
            <span className="truncate">{label}</span>
            <ChevronDown
                className={
                    "h-4 w-4 text-slate-400 transition group-hover:text-slate-500 dark:text-slate-500 " +
                    (active ? "rotate-180" : "")
                }
            />
        </button>
    );
}

// --------------------
// Popover menus
// --------------------
function useClickOutside(
    open: boolean,
    refs: React.RefObject<HTMLElement>[],
    onClose: () => void
) {
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            for (const r of refs) {
                if (r.current?.contains(t)) return;
            }
            onClose();
        };
        window.addEventListener("mousedown", onDown);
        return () => window.removeEventListener("mousedown", onDown);
    }, [open, onClose, refs]);
}

function Popover({
    open,
    anchorRef,
    children,
    width = 320,
}: {
    open: boolean;
    anchorRef: React.RefObject<HTMLDivElement>;
    children: React.ReactNode;
    width?: number;
}) {
    if (!open) return null;

    const left = anchorRef.current
        ? anchorRef.current.getBoundingClientRect().left
        : 24;
    const top = anchorRef.current
        ? anchorRef.current.getBoundingClientRect().bottom + 10
        : 80;

    return (
        <div className="fixed inset-0 z-40">
            <div className="absolute inset-0" />
            <div
                className="absolute z-50 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-900"
                style={{ left, top, width }}
            >
                {children}
            </div>
        </div>
    );
}

function RangeMenu({
    open,
    anchorRef,
    value,
    onChange,
    onApply,
    onClose,
}: {
    open: boolean;
    anchorRef: React.RefObject<HTMLDivElement>;
    value: Range;
    onChange: (v: Range) => void;
    onApply: () => void;
    onClose: () => void;
}) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    useClickOutside(open, [panelRef as any, anchorRef as any], onClose);

    return (
        <Popover open={open} anchorRef={anchorRef} width={320}>
            <div ref={panelRef}>
                <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Time range
                </div>

                <div className="space-y-2">
                    {RANGE_OPTIONS.map((opt) => {
                        const selected = value === opt;
                        return (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => onChange(opt)}
                                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/60"
                            >
                                <span className="relative inline-flex h-5 w-5 items-center justify-center">
                                    {selected ? (
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 dark:bg-blue-500">
                                            <Check className="h-3.5 w-3.5 text-white" />
                                        </span>
                                    ) : (
                                        <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                                    )}
                                </span>
                                <span className="font-medium">{opt}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-4 flex items-center justify-end">
                    <button
                        type="button"
                        onClick={onApply}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </Popover>
    );
}

function RankByMenu({
    open,
    anchorRef,
    value,
    onChange,
    onApply,
    onClose,
}: {
    open: boolean;
    anchorRef: React.RefObject<HTMLDivElement>;
    value: RankBy;
    onChange: (v: RankBy) => void;
    onApply: () => void;
    onClose: () => void;
}) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    useClickOutside(open, [panelRef as any, anchorRef as any], onClose);

    return (
        <Popover open={open} anchorRef={anchorRef} width={320}>
            <div ref={panelRef}>
                <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Metrics
                </div>

                <div className="space-y-2">
                    {RANK_OPTIONS.map((opt) => {
                        const selected = value === opt;
                        return (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => onChange(opt)}
                                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/60"
                            >
                                <span className="relative inline-flex h-5 w-5 items-center justify-center">
                                    {selected ? (
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 dark:bg-blue-500">
                                            <Check className="h-3.5 w-3.5 text-white" />
                                        </span>
                                    ) : (
                                        <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                                    )}
                                </span>
                                <span className="font-medium">{opt}</span>
                            </button>
                        );
                    })}
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => onChange("Score")}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                        Reset
                    </button>

                    <button
                        type="button"
                        onClick={onApply}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </Popover>
    );
}

function TagsMenu({
    open,
    anchorRef,
    values,
    onChange,
    onApply,
    onClose,
}: {
    open: boolean;
    anchorRef: React.RefObject<HTMLDivElement>;
    values: string[];
    onChange: (v: string[]) => void;
    onApply: () => void;
    onClose: () => void;
}) {
    const panelRef = useRef<HTMLDivElement | null>(null);
    useClickOutside(open, [panelRef as any, anchorRef as any], onClose);

    const allOptions = useMemo(() => TAG_GROUPS.flatMap((g) => g.options), []);

    const toggle = (tag: string) => {
        if (values.includes(tag)) onChange(values.filter((t) => t !== tag));
        else onChange([...values, tag]);
    };

    return (
        <Popover open={open} anchorRef={anchorRef} width={360}>
            <div ref={panelRef} className="max-h-[520px] overflow-auto">
                <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Tags
                </div>

                <div className="space-y-4">
                    {TAG_GROUPS.map((group) => (
                        <div key={group.title}>
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {group.title}
                            </div>

                            <div className="space-y-1">
                                {group.options.map((opt) => {
                                    const selected = values.includes(opt);
                                    return (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={() => toggle(opt)}
                                            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/60"
                                        >
                                            <span className="relative inline-flex h-5 w-5 items-center justify-center">
                                                {selected ? (
                                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 dark:bg-blue-500">
                                                        <Check className="h-3.5 w-3.5 text-white" />
                                                    </span>
                                                ) : (
                                                    <span className="h-5 w-5 rounded-md border border-slate-300 dark:border-slate-600" />
                                                )}
                                            </span>
                                            <span className="font-medium">{opt}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => onChange(allOptions)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                        Select All
                    </button>

                    <button
                        type="button"
                        onClick={onApply}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </Popover>
    );
}

// --------------------
// Main
// --------------------
export default function LiveLeaderboard() {
    const [darkMode, setDarkMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<AllLeaderboardsResponse | null>(null);

    const [category, setCategory] = useState("All Categories");
    const [range, setRange] = useState<Range>("All time");
    const [rankBy, setRankBy] = useState<RankBy>("Score");

    const [rankMenuOpen, setRankMenuOpen] = useState(false);
    const [rankDraft, setRankDraft] = useState<RankBy>("Score");
    const rankAnchorRef = useRef<HTMLDivElement | null>(null);

    const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
    const [rangeDraft, setRangeDraft] = useState<Range>("All time");
    const rangeAnchorRef = useRef<HTMLDivElement | null>(null);

    const [tagsMenuOpen, setTagsMenuOpen] = useState(false);
    const [tagsDraft, setTagsDraft] = useState<string[]>([]);
    const [activeTags, setActiveTags] = useState<string[]>([]);
    const tagsAnchorRef = useRef<HTMLDivElement | null>(null);

    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const itemsPerPage = 50;

    // Load data on mount
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await fetchTradersAnalytics(500, 0);
            setData(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load leaderboard data");
        } finally {
            setLoading(false);
        }
    };

    // Get the appropriate leaderboard based on rankBy
    const rawRows = useMemo(() => {
        if (!data) return [];

        let entries: LeaderboardEntry[] = [];

        if (rankBy === "Score") {
            entries = data.leaderboards.final_score || [];
        } else if (rankBy === "Win Rate") {
            entries = data.leaderboards.score_win_rate || [];
        } else if (rankBy === "ROI") {
            entries = data.leaderboards.score_roi || [];
        } else if (rankBy === "PNL") {
            entries = data.leaderboards.score_pnl || [];
        } else if (rankBy === "Total Volume") {
            // Sort by total_stakes
            entries = [...(data.leaderboards.final_score || [])].sort(
                (a, b) => (b.total_stakes || 0) - (a.total_stakes || 0)
            );
            // Re-rank
            entries = entries.map((e, i) => ({ ...e, rank: i + 1 }));
        } else if (rankBy === "Rewards") {
            // Placeholder: use final_score for now
            entries = data.leaderboards.final_score || [];
        }

        return entries;
    }, [data, rankBy]);

    // Filter and search
    const rows = useMemo(() => {
        let filtered = rawRows;

        // Search filter
        if (query.trim()) {
            const q = query.trim().toLowerCase();
            filtered = filtered.filter((r) => {
                const name = r.name || r.pseudonym || "";
                const wallet = r.wallet_address || "";
                return name.toLowerCase().includes(q) || wallet.toLowerCase().includes(q);
            });
        }

        // Tag filter
        if (activeTags.length > 0) {
            filtered = filtered.filter((r) => {
                const volumeTag = getVolumeTag(r.total_stakes || 0);
                const scoreTag = getScoreTag((r.final_score || 0) * 100);
                return activeTags.includes(volumeTag) || activeTags.includes(scoreTag);
            });
        }

        return filtered;
    }, [rawRows, query, activeTags]);

    // Paginate
    const paginatedRows = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        return rows.slice(start, end);
    }, [rows, page, itemsPerPage]);

    const totalPages = Math.ceil(rows.length / itemsPerPage);

    return (
        <div className={darkMode ? "dark" : ""}>
            <div className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
                <div className="mx-auto max-w-6xl">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight">Trader Leaderboard</h1>
                                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    Top performing traders ranked by consistency and returns
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 md:flex">
                                    <Search className="h-4 w-4 text-slate-400" />
                                    <input
                                        value={query}
                                        onChange={(e) => {
                                            setQuery(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Search trader…"
                                        className="w-56 bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                    />
                                    {query ? (
                                        <button
                                            onClick={() => setQuery("")}
                                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                            aria-label="Clear search"
                                            type="button"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    ) : null}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setDarkMode((v) => !v)}
                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                                    aria-label="Toggle dark mode"
                                >
                                    {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                                    {darkMode ? "Light" : "Dark"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="mb-6 flex flex-wrap items-center gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <DropdownLike label={category} onClick={() => setCategory("All Categories")} />

                            {/* Time range */}
                            <div ref={rangeAnchorRef} className="relative">
                                <DropdownLike
                                    label={range}
                                    active={rangeMenuOpen}
                                    onClick={() => {
                                        setRangeDraft(range);
                                        setRangeMenuOpen((v) => !v);
                                    }}
                                />
                            </div>

                            <RangeMenu
                                open={rangeMenuOpen}
                                anchorRef={rangeAnchorRef}
                                value={rangeDraft}
                                onChange={setRangeDraft}
                                onApply={() => {
                                    setRange(rangeDraft);
                                    setRangeMenuOpen(false);
                                }}
                                onClose={() => setRangeMenuOpen(false)}
                            />

                            {/* Rank by */}
                            <div ref={rankAnchorRef} className="relative">
                                <DropdownLike
                                    label={rankBy}
                                    active={rankMenuOpen}
                                    onClick={() => {
                                        setRankDraft(rankBy);
                                        setRankMenuOpen((v) => !v);
                                    }}
                                />
                            </div>

                            {/* Tags */}
                            <div ref={tagsAnchorRef} className="relative">
                                <DropdownLike
                                    label={activeTags.length ? `Tags (${activeTags.length})` : "Tags"}
                                    active={tagsMenuOpen}
                                    onClick={() => {
                                        setTagsDraft(activeTags);
                                        setTagsMenuOpen((v) => !v);
                                    }}
                                />
                            </div>

                            <RankByMenu
                                open={rankMenuOpen}
                                anchorRef={rankAnchorRef}
                                value={rankDraft}
                                onChange={setRankDraft}
                                onApply={() => {
                                    setRankBy(rankDraft);
                                    setRankMenuOpen(false);
                                    setPage(1);
                                }}
                                onClose={() => setRankMenuOpen(false)}
                            />

                            <TagsMenu
                                open={tagsMenuOpen}
                                anchorRef={tagsAnchorRef}
                                values={tagsDraft}
                                onChange={setTagsDraft}
                                onApply={() => {
                                    setActiveTags(tagsDraft);
                                    setTagsMenuOpen(false);
                                    setPage(1);
                                }}
                                onClose={() => setTagsMenuOpen(false)}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                                onClick={() => {
                                    setRankMenuOpen(false);
                                    setRangeMenuOpen(false);
                                    setTagsMenuOpen(false);
                                }}
                                type="button"
                            >
                                Apply Filters
                            </button>
                            <button
                                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                                onClick={() => {
                                    setCategory("All Categories");
                                    setRange("All time");
                                    setRangeDraft("All time");
                                    setRankBy("Score");
                                    setRankDraft("Score");
                                    setActiveTags([]);
                                    setTagsDraft([]);
                                    setQuery("");
                                    setPage(1);

                                    setRankMenuOpen(false);
                                    setRangeMenuOpen(false);
                                    setTagsMenuOpen(false);
                                }}
                                type="button"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <LoadingSpinner message="Loading leaderboard data..." />
                    ) : error ? (
                        <ErrorMessage message={error} onRetry={loadData} />
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1080px] border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                                            {[
                                                "Rank",
                                                "Trader",
                                                "Score",
                                                "Win Rate",
                                                "Total Volume",
                                                "ROI",
                                                "PNL",
                                                "Tags",
                                                "Rewards",
                                            ].map((h) => (
                                                <th
                                                    key={h}
                                                    className="px-6 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-300"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedRows.map((r) => {
                                            const volumeTag = getVolumeTag(r.total_stakes || 0);
                                            const displayScore = (r.final_score || 0) * 100;
                                            const rewardAmount = Math.floor(Math.random() * 50) + 10; // Placeholder

                                            return (
                                                <tr
                                                    key={r.wallet_address}
                                                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                                                >
                                                    <td className="px-6 py-5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                        {r.rank}
                                                    </td>

                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            {r.profile_image ? (
                                                                <img
                                                                    src={r.profile_image}
                                                                    alt={r.name || r.pseudonym || "Trader"}
                                                                    className="h-9 w-9 rounded-full"
                                                                />
                                                            ) : (
                                                                <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700" />
                                                            )}
                                                            <div>
                                                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                                    {r.name || r.pseudonym || "Anonymous"}
                                                                </div>
                                                                <div className="text-sm text-slate-500 dark:text-slate-400">
                                                                    {r.wallet_address.substring(0, 6)}...{r.wallet_address.substring(38)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-6 py-5">
                                                        <Pill value={displayScore.toFixed(1)} />
                                                    </td>

                                                    <td className="px-6 py-5 text-sm text-slate-700 dark:text-slate-200">
                                                        {((r.win_rate || 0) * 100).toFixed(1)}%
                                                    </td>
                                                    <td className="px-6 py-5 text-sm text-slate-700 dark:text-slate-200">
                                                        {formatVolume(r.total_stakes || 0)}
                                                    </td>

                                                    <td className="px-6 py-5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                                        +{((r.roi || 0) * 100).toFixed(1)}%
                                                    </td>

                                                    <td className="px-6 py-5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                                        {formatMoney(r.total_pnl || 0)}
                                                    </td>

                                                    <td className="px-6 py-5">
                                                        <TagPill label={volumeTag} />
                                                    </td>

                                                    <td className="px-6 py-5">
                                                        <RewardPill amount={rewardAmount} />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-center gap-4 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
                                <button
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    aria-label="Previous page"
                                    type="button"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </button>

                                <button
                                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm"
                                    type="button"
                                >
                                    {page}
                                </button>
                                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                    {page} / {totalPages || 1}
                                </span>

                                <button
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || totalPages === 0}
                                    aria-label="Next page"
                                    type="button"
                                >
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Mobile search */}
                    <div className="mt-4 md:hidden">
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search trader…"
                                className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                            {query ? (
                                <button
                                    onClick={() => setQuery("")}
                                    className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                    aria-label="Clear search"
                                    type="button"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div className="mt-6 text-xs text-slate-500 dark:text-slate-400">
                        Tip: Use <span className="font-semibold">Rank by</span>, <span className="font-semibold">Tags</span>, and
                        <span className="font-semibold"> Time range</span> filters to explore different rankings.
                    </div>
                </div>
            </div>
        </div>
    );
}
