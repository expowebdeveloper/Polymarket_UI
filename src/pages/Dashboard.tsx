import { TradingHeader } from '../components/TradingHeader';
import { MarketOverview } from '../components/MarketOverview';
import { TradingChart } from '../components/TradingChart';
import { TradingBarChart } from '../components/TradingBarChart';
import { TopGainersLosers } from '../components/TopGainersLosers';

interface DashboardProps {
  onSelectSymbol: (symbol: string) => void;
}

export function Dashboard({ onSelectSymbol }: DashboardProps) {
  return (
    <>
      <TradingHeader title="Dashboard" />

      <MarketOverview onSelectSymbol={onSelectSymbol} />

      <div className="grid grid-cols-12 gap-4 mt-4">
        <div className="flex space-x-4 col-span-12 lg:col-span-12">
          <TradingChart />
          <TradingBarChart />
        </div>
      </div>
      <TopGainersLosers />
    </>
  );
}


