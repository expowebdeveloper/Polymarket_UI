"use client";


import {
    LayoutDashboard,
    Trophy,
    LineChart,
    ChevronLeft,
    Moon,
    Sun,
    ExternalLink,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTheme } from '../contexts/ThemeContext';
import logo from '../assets/logo.png';

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Predictor Rating/Stat", href: "/profile-stat", icon: LayoutDashboard },
    { name: "Market", href: "/markets", icon: LineChart, badge: "Coming Soon", disabled: true },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy, badge: "Coming Soon", disabled: true },
    { name: "Whales/insiders", href: "/Whales/insiders", icon: LineChart, badge: "Coming Soon", disabled: true },
    { name: "Powly AI", href: "/reports", icon: LineChart, badge: "Coming Soon", disabled: true, useLogo: true },
];

interface SidebarProps {
    collapsed: boolean;
    onSetCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onSetCollapsed }: SidebarProps) {
    const { theme, toggleTheme } = useTheme();

    return (
        <div
            className={`fixed top-0 left-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 transition-all duration-300 rounded-lg top-4 h-[calc(100vh-32px)]
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
            <div className="flex flex-col h-full">
                <div className="mb-2 flex items-center justify-center">
                    <img
                        src={logo}
                        alt="Polyrating Logo"
                        className={`transition-all duration-300 ${collapsed ? 'w-10 h-10' : 'w-32 h-auto'}`}
                    />

                </div>
                <h1 className="text-2xl font-bold text-white text-center mb-10">
                {collapsed ? <span>P<span className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-transparent bg-clip-text">R</span></span> : <span className="text-white">Poly<span className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-transparent bg-clip-text">Rating</span></span>} 
                    
                </h1>

                <div className="space-y-3">
                    {navItems.map((item) => {
                        const content = (
                            <>
                                {/* @ts-ignore */}
                                {item.useLogo ? (
                                    <img src={logo} alt="" className="w-7 h-7 shrink-0 object-contain" />
                                ) : (
                                    <item.icon className="w-5 h-5 shrink-0" />
                                )}

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
                {/* <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
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
                </div> */}

                {/* Poly Rating on X */}
                <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-800">
                    <a
                        href="https://x.com/poly_rating"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 p-2 rounded-lg transition  text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40"
                    >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        {!collapsed && (
                            <>
                                <span className="text-sm font-medium">@poly_rating</span>
                                <ExternalLink className="w-4 h-2 ml-auto opacity-60" />
                            </>
                        )}
                    </a>
                </div>
            </div>

            {/* WATCHLIST (optional future area) */}
        </div>
    );
}
