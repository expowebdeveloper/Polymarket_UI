import { TradingHeader } from '../components/TradingHeader';
import { ActivityFeed } from '../components/ActivityFeed';

export function ActivityPage() {
    return (
        <>
            <TradingHeader title="Live Activity Feed" />

            <div className="p-6">
                <div className="max-w-4xl mx-auto">
                    <ActivityFeed />
                </div>
            </div>
        </>
    );
}
