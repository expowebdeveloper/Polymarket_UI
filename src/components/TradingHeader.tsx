import { Bell, Settings, User, LogOut, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

interface TradingHeaderProps {
  title?: string;
}

export function TradingHeader({ title = 'Dashboard' }: TradingHeaderProps) {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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

          {/* Profile dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={`p-2 ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-lg transition flex items-center gap-2`}
            >
              <User className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
              <ChevronDown className={`w-4 h-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {showProfileMenu && (
              <div className={`absolute right-0 mt-2 w-64 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg shadow-lg z-50`}>
                {/* User info */}
                <div className={`px-4 py-3 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'} flex items-center justify-center`}>
                      <User className={`w-5 h-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {user?.name || 'User'}
                      </p>
                      <p className={`text-xs truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                        {user?.email || 'user@example.com'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Logout button */}
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition ${theme === 'dark'
                      ? 'hover:bg-slate-700 text-red-400'
                      : 'hover:bg-red-50 text-red-600'
                      }`}
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
