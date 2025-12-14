/**
 * JourneyMasterCard - Usage Examples
 * Demonstrates how to use the unified Journey + Consciousness Points card
 */

import React, { useState } from 'react'
import { JourneyMasterCard } from './JourneyMasterCard'

/**
 * Example 1: Basic Usage (Default)
 * Shows the master card with all features enabled
 */
export function BasicUsageExample() {
  return (
    <div className="p-6 max-w-md">
      <h2 className="text-lg font-bold mb-4">Journey Master Card</h2>
      <JourneyMasterCard />
    </div>
  )
}

/**
 * Example 2: With Notification Indicator
 * Shows the pulsing amber indicator when there's a pending action
 */
export function NotificationExample() {
  const [hasNotification, setHasNotification] = useState(true)

  const handleNotificationClick = () => {
    console.log('Notification clicked!')
    setHasNotification(false)
  }

  return (
    <div className="p-6 max-w-md">
      <h2 className="text-lg font-bold mb-4">With Notification</h2>
      <JourneyMasterCard
        showNotification={hasNotification}
        onNotificationClick={handleNotificationClick}
      />
      <p className="mt-4 text-sm text-gray-600">
        Click the amber dot to dismiss notification
      </p>
    </div>
  )
}

/**
 * Example 3: Custom Styling
 * Shows how to add custom CSS classes
 */
export function CustomStyleExample() {
  return (
    <div className="p-6 max-w-md">
      <h2 className="text-lg font-bold mb-4">Custom Styling</h2>
      <JourneyMasterCard
        className="shadow-2xl border-2 border-blue-200"
      />
    </div>
  )
}

/**
 * Example 4: Multiple Cards (Dashboard View)
 * Shows how to use multiple master cards in a dashboard layout
 */
export function DashboardLayoutExample() {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-6">Dashboard with Master Cards</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <JourneyMasterCard
          showNotification={false}
        />
        <JourneyMasterCard
          showNotification={true}
          onNotificationClick={() => console.log('User 2 notification')}
          className="border-l-4 border-amber-500"
        />
      </div>
    </div>
  )
}

/**
 * Example 5: Integration with Router
 * Shows how to integrate with navigation
 */
export function RouterIntegrationExample() {
  const handleCardClick = () => {
    // Navigate to full journey view
    console.log('Navigate to full journey view')
    // router.push('/minha-jornada')
  }

  return (
    <div
      className="p-6 max-w-md cursor-pointer"
      onClick={handleCardClick}
    >
      <h2 className="text-lg font-bold mb-4">Click to Expand</h2>
      <JourneyMasterCard
        showNotification={false}
      />
      <p className="mt-4 text-sm text-blue-600 font-medium">
        Clique para expandir
      </p>
    </div>
  )
}

/**
 * Storybook-style export for component documentation
 */
export const JourneyMasterCardStories = {
  basic: BasicUsageExample,
  notification: NotificationExample,
  customStyle: CustomStyleExample,
  dashboard: DashboardLayoutExample,
  router: RouterIntegrationExample,
}
