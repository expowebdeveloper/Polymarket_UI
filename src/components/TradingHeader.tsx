import { Search, Bell, Settings, User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface TradingHeaderProps {
  title?: string;
}

export function TradingHeader({ title = 'Dashboard' }: TradingHeaderProps) {
  const { theme } = useTheme();

  return (
    <header className={`${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-b mb-5`}>
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {title}
          </h1>
        </div>
        {/* <div className="flex-1 px-10">
          <div className="flex items-center gap-3 bg-slate-900/70 border border-emerald-500/30 rounded-full px-5 py-2 ">
            <Search className="h-4 w-4 text-emerald-400" />
            <input
              className="w-full bg-transparent outline-none text-sm placeholder:text-slate-500"
              placeholder="Enter wallet address (0x...)"
            // value={walletAddress}
            // onChange={(e) => setWalletAddress(e.target.value)}
            />
          </div>
        </div> */}

        <div className="flex items-center gap-4">
          {/* <div className={`hidden md:flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} rounded-lg px-3 py-2`}>
            <Search className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
            <input
              type="text"
              placeholder="Search markets..."
              className={`bg-transparent border-none outline-none text-sm w-48 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
            />
          </div> */}

          <button className={`p-2 ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition`}>
            <Bell className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
          </button>
          <button className={`p-2 ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition`}>
            <Settings className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
          </button>
          <button className={`p-2 ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition`}>
            <User className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
