"use client";


import {
    LayoutDashboard,
    Trophy,
    LineChart,
    ChevronLeft,
    Moon,
    Sun,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTheme } from '../contexts/ThemeContext';

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Profile Stat", href: "/profile-stat", icon: LayoutDashboard },
    { name: "Market", href: "/markets", icon: LineChart, badge: "Coming Soon", disabled: true },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy, badge: "Coming Soon", disabled: true },
];

interface SidebarProps {
    collapsed: boolean;
    onSetCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onSetCollapsed }: SidebarProps) {
    const { theme, toggleTheme } = useTheme();

    return (
        <div
            className={`fixed top-0 left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-screen p-4 transition-all duration-300 mt-4 rounded-lg
    ${collapsed ? "w-20" : "w-64"} 
  `}
        >

            {/* TOGGLE BUTTON */}
            <button
                onClick={() => onSetCollapsed(!collapsed)}
                className="absolute top-4 right-[-14px] bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white w-7 h-7 rounded-full flex items-center justify-center shadow hover:bg-slate-300 dark:hover:bg-slate-700 transition"
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
                    {navItems.map((item) => {
                        const content = (
                            <>
                                <item.icon className="w-5 h-5 shrink-0" />

                                {/* Hide text when collapsed */}
                                {!collapsed && (
                                    <div className="flex items-center justify-between w-full">
                                        <span className="text-sm font-medium">{item.name}</span>
                                        {item.badge && (
                                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-full whitespace-nowrap ml-2">
                                                {item.badge}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </>
                        );

                        if (/* @ts-ignore */ item.disabled) {
                            return (
                                <div
                                    key={item.name}
                                    className={`flex items-center gap-3 p-2 rounded-lg transition relative group cursor-not-allowed opacity-60 text-slate-400 dark:text-slate-500`}
                                >
                                    {content}
                                </div>
                            );
                        }

                        return (
                            <NavLink
                                key={item.name}
                                to={item.href}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 p-2 rounded-lg transition relative group
                ${isActive
                                        ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white"
                                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                                    }`
                                }
                            >
                                {content}
                            </NavLink>
                        );
                    })}
                </div>

                {/* Theme Toggle */}
                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={toggleTheme}
                        className="flex items-center gap-3 p-2 rounded-lg transition w-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                    >
                        {theme === 'dark' ? (
                            <>
                                <Sun className="w-5 h-5" />
                                {!collapsed && <span className="text-sm font-medium">Light Mode</span>}
                            </>
                        ) : (
                            <>
                                <Moon className="w-5 h-5" />
                                {!collapsed && <span className="text-sm font-medium">Dark Mode</span>}
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* WATCHLIST (optional future area) */}
        </div>
    );
}
