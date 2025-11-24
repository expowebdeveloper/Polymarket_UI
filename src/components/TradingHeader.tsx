import { Search, Bell, Settings, User } from 'lucide-react';

interface TradingHeaderProps {
  title?: string;
}

export function TradingHeader({ title = 'Dashboard' }: TradingHeaderProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 mb-5">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-white">
            {title}
          </h1>
{/* 
          <nav className="hidden md:flex items-center gap-6">
            <button className="text-sm font-medium text-emerald-400">Markets</button>
            <button className="text-sm font-medium text-slate-400 hover:text-white transition">Trade</button>
            <button className="text-sm font-medium text-slate-400 hover:text-white transition">Portfolio</button>
            <button className="text-sm font-medium text-slate-400 hover:text-white transition">Analytics</button>
          </nav> */}
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search markets..."
              className="bg-transparent border-none outline-none text-sm w-48"
            />
          </div>

          <button className="p-2 hover:bg-slate-800 rounded-lg transition">
            <Bell className="w-5 h-5 text-slate-400" />
          </button>
          <button className="p-2 hover:bg-slate-800 rounded-lg transition">
            <Settings className="w-5 h-5 text-slate-400" />
          </button>
          <button className="p-2 hover:bg-slate-800 rounded-lg transition">
            <User className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
}
