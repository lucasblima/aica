// =====================================================
// Finance Module - Integration Example
// =====================================================

// Example: How to integrate FinanceCard into your dashboard

import { FinanceCard } from './modules/finance/components/FinanceCard';
import { useAuth } from './hooks/useAuth'; // Your auth hook

export function Dashboard() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-[#F0EFE9] p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-etched mb-8">
                    Minha Vida
                </h1>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* Finance Card */}
                    {user && (
                        <FinanceCard userId={user.id} />
                    )}

                    {/* Other cards... */}
                    {/* <LifeWeeksCard userId={user.id} /> */}
                    {/* <PodcastCard userId={user.id} /> */}

                </div>
            </div>
        </div>
    );
}

// =====================================================
// Alternative: Standalone Finance Dashboard
// =====================================================

export function FinanceDashboard() {
    const { user } = useAuth();

    if (!user) {
        return <div>Please log in to view your finances.</div>;
    }

    return (
        <div className="min-h-screen bg-[#F0EFE9] p-6">
            <div className="max-w-4xl mx-auto">
                <FinanceCard userId={user.id} />
            </div>
        </div>
    );
}
