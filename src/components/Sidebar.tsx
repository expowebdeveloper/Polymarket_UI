"use client";

import {
  LayoutDashboard,
  LineChart,
  ChevronLeft,
  ExternalLink,
  Star,
  CandlestickChart,
  Microscope,
  LayoutGrid
} from "lucide-react";
import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Predictor Rating/Stats", href: "/profile-stat", icon: Star },
  { name: "Markets", href: "/markets", icon: CandlestickChart, badge: "Coming Soon", disabled: true },
  // { name: "Live Rankings", href: "/leaderboard-new", icon: Trophy, badge: "New" },
  { name: "Leaderboard", href: "/leaderboard/all", icon: LayoutGrid, badge: "Coming Soon", disabled: true },
  { name: "Whale Tracker", href: "/whale-tracker", icon: Microscope, badge: "Coming Soon", disabled: true },
  { name: "Powly AI", href: "/reports", icon: LineChart, badge: "Coming Soon", disabled: true, useLogo: true },
];

interface SidebarProps {
  collapsed: boolean;
  onSetCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onSetCollapsed }: SidebarProps) {
  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen transition-all duration-300
      ${collapsed ? "w-20" : "w-64"}
      border border-white/10
      bg-white/5 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.35)]
      before:absolute before:inset-0 before:bg-gradient-to-br before:from-emerald-400/10 before:via-cyan-400/5 before:to-transparent before:pointer-events-none`}
    >
      {/* TOGGLE */}
      <button
        onClick={() => onSetCollapsed(!collapsed)}
        className="absolute top-6 -right-3 w-7 h-7 rounded-full flex items-center justify-center
        bg-white/10 backdrop-blur-md border border-white/20 text-white
        shadow-lg hover:bg-white/20 transition"
      >
        <ChevronLeft
          className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
        />
      </button>

      <div className="relative flex flex-col h-full p-4">
        {/* LOGO */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={logo}
            alt="Polyrating"
            className={`transition-all duration-300 drop-shadow-lg ${collapsed ? "w-10 h-10" : "w-28"}`}
          />
          {!collapsed && (
            <>
              <div className="flex gap-1 flex-col items-end">
                <h1 className="mt-3 text-xl mb-0 font-semibold tracking-wide text-white leading-none">
                  Poly<span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Rating</span>
                </h1>
                <p className="text-xs text-slate-400 text-right">BETA</p>
              </div>
            </>
          )}
        </div>

        {/* NAV */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const inner = (
              <>
                {item.useLogo ? (
                  <img src={logo} className="w-6 h-6 object-contain" />
                ) : (
                  <item.icon className="w-5 h-5" />
                )}

                {!collapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-medium">{item.name}</span>
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full
                        bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </>
            );

            if (item.disabled) {
              return (
                <div
                  key={item.name}
                  className="flex items-center gap-3 p-3 rounded-2xl
                  text-slate-400 opacity-60 cursor-not-allowed"
                >
                  {inner}
                </div>
              );
            }

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center gap-3 p-3 rounded-2xl transition-all
                  backdrop-blur-md border border-transparent
                  ${isActive
                    ? "bg-white/15 border-white/20 shadow-inner text-white"
                    : "text-slate-300 hover:bg-white/10 hover:border-white/10"}`
                }
              >
                {inner}
              </NavLink>
            );
          })}
        </nav>

        {/* FOOTER */}
        <div className="mt-auto pt-4 border-t border-white/10">
          <a
            href="https://x.com/poly_rating"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 rounded-2xl text-slate-300
            hover:bg-white/10 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {!collapsed && (
              <>
                <span className="text-sm font-medium">@poly_rating</span>
                <ExternalLink className="w-4 h-4 ml-auto opacity-60" />
              </>
            )}
          </a>
        </div>
      </div>
    </aside>
  );
}
