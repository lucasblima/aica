/**
 * EmptyState Component - Usage Examples
 *
 * This file demonstrates how to use the EmptyState component
 * in different scenarios throughout the application.
 */

import React from 'react';
import EmptyState from './EmptyState';

/**
 * Example 1: New User State
 * Usage: Onboarding, first access
 */
export const NewUserExample: React.FC = () => {
  const handleRegisterFirstMoment = () => {
    console.log('Navigate to moment registration');
    // Add navigation logic here
    // e.g., navigate('/moments/create');
  };

  const handleLearnMore = () => {
    console.log('Navigate to system overview');
    // Add navigation logic here
    // e.g., navigate('/about');
  };

  return (
    <EmptyState
      type="new_user"
      onPrimaryAction={handleRegisterFirstMoment}
      onSecondaryAction={handleLearnMore}
    />
  );
};

/**
 * Example 2: No Data Today State
 * Usage: Dashboard with no records for current day
 */
export const NoDataTodayExample: React.FC = () => {
  const handleRegisterMoment = () => {
    console.log('Open moment registration modal');
    // Add modal opening logic here
  };

  const handleViewHistory = () => {
    console.log('Navigate to history view');
    // Add navigation logic here
    // e.g., navigate('/history');
  };

  return (
    <EmptyState
      type="no_data_today"
      onPrimaryAction={handleRegisterMoment}
      onSecondaryAction={handleViewHistory}
    />
  );
};

/**
 * Example 3: Insufficient Data State
 * Usage: Charts/analytics that require minimum data points
 */
export const InsufficientDataExample: React.FC = () => {
  const handleRegisterMoment = () => {
    console.log('Open moment registration modal');
  };

  return (
    <EmptyState
      type="insufficient_data"
      onPrimaryAction={handleRegisterMoment}
    />
  );
};

/**
 * Example 4: No Data in Selected Period
 * Usage: Filter results, date range selections
 */
export const NoDataPeriodExample: React.FC = () => {
  const [selectedDays, setSelectedDays] = React.useState(30);

  const handleChangePeriod = () => {
    console.log('Open period selector');
    // Add period selector logic here
  };

  const handleRegisterMoment = () => {
    console.log('Open moment registration modal');
  };

  return (
    <EmptyState
      type="no_data_period"
      selectedDays={selectedDays}
      onPrimaryAction={handleChangePeriod}
      onSecondaryAction={handleRegisterMoment}
    />
  );
};

/**
 * Example 5: Custom Title and Message
 * Usage: When you need to override default messages
 */
export const CustomMessageExample: React.FC = () => {
  return (
    <EmptyState
      type="no_data_today"
      customTitle="Personalize seu Título"
      customMessage="Esta é uma mensagem personalizada que pode ser usada para contextos específicos da sua aplicação."
      onPrimaryAction={() => console.log('Custom action')}
    />
  );
};

/**
 * Example 6: Integration with Data Loading
 * Usage: Real-world scenario with loading and data states
 */
export const IntegratedExample: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any[]>([]);
  const [hasRegisteredBefore, setHasRegisteredBefore] = React.useState(false);

  React.useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setLoading(false);
      setData([]); // Simulate empty data
      setHasRegisteredBefore(false);
    }, 1000);
  }, []);

  const handleRegisterMoment = () => {
    console.log('Register moment');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-ceramic-text-secondary">
          Carregando dados...
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        type={hasRegisteredBefore ? 'no_data_today' : 'new_user'}
        onPrimaryAction={handleRegisterMoment}
      />
    );
  }

  return (
    <div>
      {/* Your data visualization component here */}
      <p>Data loaded: {data.length} items</p>
    </div>
  );
};

/**
 * Example 7: Efficiency Trend Chart Integration
 * Usage: How it's used in EfficiencyTrendChart.tsx
 */
export const EfficiencyTrendChartExample: React.FC = () => {
  const [trends, setTrends] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const handleRegisterMoment = () => {
    console.log('Navigate to moment registration');
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-ceramic-cool rounded"></div>;
  }

  if (trends.length === 0) {
    return (
      <EmptyState
        type="insufficient_data"
        onPrimaryAction={handleRegisterMoment}
      />
    );
  }

  return (
    <div>
      {/* Chart component here */}
      <p>Showing trends for {trends.length} data points</p>
    </div>
  );
};

/**
 * Example 8: Conditional Empty States
 * Usage: Different states based on different conditions
 */
export const ConditionalExample: React.FC = () => {
  const [userType, setUserType] = React.useState<'new' | 'returning'>('new');
  const [dataCount, setDataCount] = React.useState(0);
  const [selectedPeriod, setSelectedPeriod] = React.useState(7);

  const getEmptyStateType = () => {
    if (userType === 'new' && dataCount === 0) {
      return 'new_user';
    }
    if (dataCount === 1) {
      return 'insufficient_data';
    }
    if (dataCount === 0) {
      return 'no_data_period';
    }
    return 'no_data_today';
  };

  return (
    <EmptyState
      type={getEmptyStateType()}
      selectedDays={selectedPeriod}
      onPrimaryAction={() => console.log('Primary action')}
      onSecondaryAction={() => console.log('Secondary action')}
    />
  );
};

/**
 * Example 9: Demo Page with All States
 * Usage: Testing and documentation
 */
export const EmptyStateDemoPage: React.FC = () => {
  const [currentState, setCurrentState] = React.useState<
    'new_user' | 'no_data_today' | 'insufficient_data' | 'no_data_period'
  >('new_user');

  const states: Array<{
    type: 'new_user' | 'no_data_today' | 'insufficient_data' | 'no_data_period';
    label: string;
  }> = [
    { type: 'new_user', label: 'New User' },
    { type: 'no_data_today', label: 'No Data Today' },
    { type: 'insufficient_data', label: 'Insufficient Data' },
    { type: 'no_data_period', label: 'No Data in Period' },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">EmptyState Component Demo</h1>

      {/* State Selector */}
      <div className="flex gap-2 mb-8">
        {states.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setCurrentState(type)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              currentState === type
                ? 'bg-ceramic-info text-white'
                : 'bg-ceramic-cool text-ceramic-text-primary hover:bg-ceramic-border'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Empty State Display */}
      <EmptyState
        type={currentState}
        selectedDays={30}
        onPrimaryAction={() => alert('Primary action clicked!')}
        onSecondaryAction={() => alert('Secondary action clicked!')}
      />
    </div>
  );
};

export default EmptyStateDemoPage;
