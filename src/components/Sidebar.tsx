"use client";


import {
    LayoutDashboard,
    Trophy,
    LineChart,
    Layers,
    Wallet,
    Activity,
    FileText,
    Settings,
    ChevronLeft,
    User,
    History as HistoryIcon,
    ScatterChart,
    Search,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Global Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "Live Leaderboard", href: "/leaderboard/live", icon: ScatterChart },
    { name: "Markets", href: "/markets", icon: LineChart },
    { name: "Wallet Dashboard", href: "/wallet-dashboard", icon: Search },
    { name: "Whale Tracker", href: "/whale-tracker", icon: Layers },
    { name: "Positions", href: "/positions", icon: Wallet },
    { name: "Activity", href: "/activity", icon: Activity },
    { name: "Trades", href: "/trades", icon: HistoryIcon },
    { name: "Profile Stats", href: "/profile-stats", icon: User },
    { name: "Reports", href: "/reports", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
    collapsed: boolean;
    onSetCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onSetCollapsed }: SidebarProps) {

    return (
        <div
            className={`fixed top-0 left-0 bg-slate-900 border border-slate-800 h-screen p-4 transition-all duration-300 mt-4 rounded-lg
    ${collapsed ? "w-20" : "w-64"} 
  `}
        >

            {/* TOGGLE BUTTON */}
            <button
                onClick={() => onSetCollapsed(!collapsed)}
                className="absolute top-4 right-[-14px] bg-slate-800 text-white w-7 h-7 rounded-full flex items-center justify-center shadow hover:bg-slate-700 transition"
            >
                <ChevronLeft
                    className={`w-4 h-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""
                        }`}
                />
            </button>

            {/* NAVIGATION */}
            <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-10">
                    Poly
                </h1>

                <div className="space-y-3">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.href}
                            className={({ isActive }) =>
                                `flex items-center gap-3 p-2 rounded-lg transition 
                ${isActive
                                    ? "bg-slate-800 text-white"
                                    : "text-slate-300 hover:bg-slate-800/40"
                                }`
                            }
                        >
                            <item.icon className="w-5 h-5" />

                            {/* Hide text when collapsed */}
                            {!collapsed && (
                                <span className="text-sm font-medium">{item.name}</span>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* WATCHLIST (optional future area) */}
        </div>
    );
}
