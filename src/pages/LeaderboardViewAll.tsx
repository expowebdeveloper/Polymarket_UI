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
    Loader2,
} from "lucide-react";
import {
    fetchDailyVolumeLeaderboard,
    fetchWeeklyVolumeLeaderboard,
    fetchMonthlyVolumeLeaderboard,
    fetchLeaderboardEntries
} from "../services/api";
import type { LeaderboardEntry } from "../types/api";

// --------------------
// Types
// --------------------
type RankBy = "Score" | "Win Rate" | "Total Volume" | "ROI" | "PNL" | "Rewards";
type Range = "Last 7 days" | "Last 30 days" | "All time" | "Last 24h";

interface TableRow {
    rank: number;
    name: string;
    handle: string;
    score: number;
    winRate: number;
    volume: string;
    roi: number;
    pnl: number;
    reward: number;
    profileImage?: string;
}



const RANGE_OPTIONS: Range[] = ["Last 24h", "Last 7 days", "Last 30 days", "All time"];
const RANK_OPTIONS: RankBy[] = ["Win Rate", "ROI", "Total Volume", "PNL", "Score"]; // Removed Rewards as not yet supported in DB sort

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
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    return `${sign}$${abs.toLocaleString("en-US")}`;
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
export default function LeaderboardViewAll() {
    // Expected behavior question (quick): should dark mode persist across refresh (localStorage) or per-session only?
    // Right now it's per-session only.
    const [darkMode, setDarkMode] = useState(false);

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
    const [rows, setRows] = useState<TableRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 50;

    // Fetch data from API
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let orderBy: 'PNL' | 'VOL' | 'ROI' | 'WIN_RATE' | 'SCORE' = 'VOL';
                switch (rankBy) {
                    case "Score": orderBy = 'SCORE'; break;
                    case "Win Rate": orderBy = 'WIN_RATE'; break;
                    case "ROI": orderBy = 'ROI'; break;
                    case "PNL": orderBy = 'PNL'; break;
                    case "Total Volume": orderBy = 'VOL'; break;
                    default: orderBy = 'VOL';
                }

                const offset = (page - 1) * LIMIT;
                let response;

                if (range === "Last 24h") {
                    response = await fetchDailyVolumeLeaderboard(LIMIT, offset, orderBy);
                } else if (range === "Last 7 days") {
                    response = await fetchWeeklyVolumeLeaderboard(LIMIT, offset, orderBy);
                } else if (range === "Last 30 days") {
                    response = await fetchMonthlyVolumeLeaderboard(LIMIT, offset, orderBy);
                } else {
                    // "All time" uses valid calculated entries from leaderboard_entries table
                    response = await fetchLeaderboardEntries(LIMIT, offset, orderBy);
                }

                // Transform API response to TableRow
                const transformedRows: TableRow[] = response.entries.map((entry: LeaderboardEntry) => ({
                    rank: entry.rank,
                    name: entry.name || "Unknown",
                    handle: entry.pseudonym ? `@${entry.pseudonym}` : (entry.wallet_address ? `${entry.wallet_address.slice(0, 6)}...` : "—"),
                    score: entry.final_score || 0,
                    winRate: entry.win_rate || 0,
                    volume: formatMoney(entry.total_stakes || 0).replace('+', ''), // Remove + sign for volume
                    roi: entry.roi || 0,
                    pnl: entry.total_pnl || 0,
                    reward: 0, // Placeholder
                    profileImage: entry.profile_image
                }));

                setRows(transformedRows);
                // Calculate total pages (approximate if count not returned, but response has count)
                setTotalPages(Math.ceil(response.count / LIMIT) || 1);

            } catch (error) {
                console.error("Failed to fetch leaderboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [range, rankBy, page]);

    // Local filter for search (since API doesn't support search yet easily on these endpoints without full scan)
    const displayRows = useMemo(() => {
        if (!query) return rows;
        return rows.filter((r) =>
            `${r.name} ${r.handle}`.toLowerCase().includes(query.trim().toLowerCase())
        );
    }, [rows, query]);

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
                                        onChange={(e) => setQuery(e.target.value)}
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
                                }}
                                onClose={() => setTagsMenuOpen(false)}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow"
                                onClick={() => {
                                    // Demo: menus apply inside their own Apply button
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
                                    setRange("Last 30 days");
                                    setRangeDraft("Last 30 days");
                                    setRankBy("Score");
                                    setRankDraft("Score");
                                    setActiveTags([]);
                                    setTagsDraft([]);
                                    setQuery("");

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
                                    {loading ? (
                                        <tr>
                                            <td colSpan={9} className="py-8 text-center text-slate-500">
                                                <div className="flex justify-center items-center gap-2">
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    Loading leaderboard...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : displayRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="py-8 text-center text-slate-500">
                                                No traders found
                                            </td>
                                        </tr>
                                    ) : (
                                        displayRows.map((r) => (
                                            <tr
                                                key={r.rank}
                                                className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                                            >
                                                <td className="px-6 py-5 text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                    {r.rank}
                                                </td>

                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                            {r.profileImage ? (
                                                                <img src={r.profileImage} alt={r.name} className="h-full w-full object-cover" />
                                                            ) : null}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                                {r.name}
                                                            </div>
                                                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                                                {r.handle}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-5">
                                                    <Pill value={r.score.toFixed(1)} />
                                                </td>

                                                <td className="px-6 py-5 text-sm text-slate-700 dark:text-slate-200">
                                                    {r.winRate.toFixed(1)}%
                                                </td>
                                                <td className="px-6 py-5 text-sm text-slate-700 dark:text-slate-200">
                                                    {r.volume}
                                                </td>

                                                <td className="px-6 py-5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                                    +{r.roi.toFixed(1)}%
                                                </td>

                                                <td className="px-6 py-5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                                    {formatMoney(r.pnl)}
                                                </td>

                                                <td className="px-6 py-5">
                                                    <TagPill label={r.rank <= 3 ? "Mega Whale" : "Whale"} />
                                                </td>

                                                <td className="px-6 py-5">
                                                    <RewardPill amount={r.reward} />
                                                </td>
                                            </tr>
                                        )))}
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
                                {page} / {totalPages}
                            </span>

                            <button
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                aria-label="Next page"
                                type="button"
                            >
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Mobile search */}
                    <div className="mt-4 md:hidden">
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
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
                        <span className="font-semibold"> Time range</span> popovers.
                    </div>
                </div>
            </div>
        </div>
    );
}
