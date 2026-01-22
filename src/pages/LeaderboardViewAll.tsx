import React, { Suspense } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Lazy load the component for faster initial page load
const PolyratingLeaderboardPreview = React.lazy(() => import('../components/PolyratingLeaderboardPreview'));

const LeaderboardViewAll: React.FC = () => {
    return (
        <Suspense fallback={<LoadingSpinner message="Loading leaderboard..." />}>
            <PolyratingLeaderboardPreview />
        </Suspense>
    );
};

export default LeaderboardViewAll;
