import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TradingHeader } from './components/TradingHeader';
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
import { useTheme } from './contexts/ThemeContext';

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* FIXED FLEX LAYOUT */}
      <div className="flex">
        {/* LEFT SIDEBAR */}
        <Sidebar collapsed={collapsed} onSetCollapsed={setCollapsed} />

        {/* RIGHT MAIN CONTENT */}
        <div className={`${collapsed ? 'pl-[100px]' : 'pl-[280px]'} flex-1 px-4 py-4 transition-all duration-300`}>
          <Routes>
            <Route
              path="/dashboard"
              element={<Dashboard onSelectSymbol={setSelectedSymbol} />}
            />
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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
