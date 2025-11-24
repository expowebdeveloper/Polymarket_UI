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

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
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
              path="/markets"
              element={
                <>
                  <TradingHeader title="Markets" />
                  <Markets />
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
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
