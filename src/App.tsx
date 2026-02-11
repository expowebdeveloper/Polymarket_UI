import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TradingHeader } from './components/TradingHeader';
import { Footer } from './components/Footer';
import { Dashboard } from './pages/Dashboard';
import { Leaderboard } from './pages/Leaderboard';
import { Markets } from './pages/Markets';
import { WhaleTracker } from './pages/WhaleTracker';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import LeaderboardViewAll from './pages/LeaderboardViewAll';
import { WalletDashboard } from './pages/WalletDashboard';
import { MarketDetailPage } from './pages/MarketDetail';
import { Traders } from './pages/Traders';
import { TraderProfile } from './pages/TraderProfile';
import { DatabaseLeaderboard } from './pages/DatabaseLeaderboard';
import { DBWalletDashboard } from './pages/DBWalletDashboard';
import LiveLeaderboard from './pages/LiveLeaderboard';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ProfileStat } from './pages/ProfileStat';
import { useTheme } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';

// Defined outside App so it's stable across re-renders — toggling sidebar no longer remounts route content
function ProtectedLayout({
  collapsed,
  onSetCollapsed,
  onSelectSymbol,
}: {
  collapsed: boolean;
  onSetCollapsed: (collapsed: boolean) => void;
  onSelectSymbol: (symbol: string) => void;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} onSetCollapsed={onSetCollapsed} />
      <div className={`${collapsed ? 'pl-[100px]' : 'pl-[264px]'} flex-1 flex flex-col transition-all duration-300`}>
        <div className="flex-1 px-4 py-4">
          <Routes>
            <Route path="/dashboard" element={<Dashboard onSelectSymbol={onSelectSymbol} />} />
            <Route
              path="/leaderboard"
              element={
                <>
                  <TradingHeader title="Leaderboard" />
                  <Leaderboard />
                </>
              }
            />
            <Route
              path="/leaderboard/all"
              element={
                <>
                  <TradingHeader title="All Leaderboards" />
                  <LeaderboardViewAll />
                </>
              }
            />
            <Route
              path="/leaderboard/view-all"
              element={
                <>
                  <TradingHeader title="View All Leaderboards" />
                  <LeaderboardViewAll />
                </>
              }
            />
            <Route
              path="/markets"
              element={
                <>
                  <TradingHeader title="Markets" />
                  <Markets />
                </>
              }
            />
            <Route
              path="/markets/live"
              element={
                <>
                  <TradingHeader title="Live Markets" />
                  <Markets defaultStatus="live" />
                </>
              }
            />
            <Route
              path="/markets/:marketSlug"
              element={
                <>
                  <TradingHeader title="Market Details" />
                  <MarketDetailPage />
                </>
              }
            />
            <Route
              path="/traders"
              element={
                <>
                  <TradingHeader title="Traders" />
                  <Traders />
                </>
              }
            />
            <Route
              path="/traders/:wallet"
              element={
                <>
                  <TradingHeader title="Trader Profile" />
                  <TraderProfile />
                </>
              }
            />
            <Route
              path="/whale-tracker"
              element={
                <>
                  <TradingHeader title="Whale Tracker" />
                  <WhaleTracker />
                </>
              }
            />
            <Route
              path="/reports"
              element={
                <>
                  <TradingHeader title="Reports" />
                  <Reports />
                </>
              }
            />
            <Route
              path="/settings"
              element={
                <>
                  <TradingHeader title="Settings" />
                  <Settings />
                </>
              }
            />
            <Route
              path="/wallet-dashboard"
              element={
                <>
                  <TradingHeader title="Wallet Dashboard" />
                  <WalletDashboard />
                </>
              }
            />
            <Route
              path="/db-leaderboard"
              element={
                <>
                  <TradingHeader title="DB Leaderboard" />
                  <DatabaseLeaderboard />
                </>
              }
            />
            <Route
              path="/db-wallet-dashboard"
              element={
                <>
                  <TradingHeader title="DB Wallet Dashboard" />
                  <DBWalletDashboard />
                </>
              }
            />
            <Route
              path="/leaderboard/live"
              element={
                <>
                  <TradingHeader title="Live Leaderboard" />
                  <LiveLeaderboard />
                </>
              }
            />
            <Route
              path="/profile-stat"
              element={
                <>
                  <ProfileStat />
                </>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </div>
  );
}

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        {/* Login requirement commented out - allow access without auth */}
        {/* {isAuthenticated ? (
          <Route path="*" element={<ProtectedLayout collapsed={collapsed} onSetCollapsed={setCollapsed} onSelectSymbol={setSelectedSymbol} />} />
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )} */}
        <Route path="*" element={<ProtectedLayout collapsed={collapsed} onSetCollapsed={setCollapsed} onSelectSymbol={setSelectedSymbol} />} />
      </Routes>
    </div>
  );
}

export default App;
