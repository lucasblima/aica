/**
 * EpisodeDetailsForm - Example Usage
 *
 * This file demonstrates how to use the EpisodeDetailsForm component.
 * It shows both Public Figure and Direct Contact workflow examples.
 */

import React from 'react';
import { EpisodeDetailsForm } from './EpisodeDetailsForm';

// Example 1: Basic usage with Direct Contact guest
export const BasicExample = () => {
  const handleSubmit = (data: any) => {
    console.log('Episode Details Submitted:', data);
    // data will contain:
    // {
    //   theme: string,
    //   themeMode: 'auto' | 'manual',
    //   season: number,
    //   location: string,
    //   scheduledDate?: string,
    //   scheduledTime?: string
    // }
  };

  const handleBack = () => {
    console.log('User clicked back');
  };

  return (
    <EpisodeDetailsForm
      guestName="João Silva"
      onSubmit={handleSubmit}
      onBack={handleBack}
    />
  );
};

// Example 2: With initial data (editing existing episode)
export const WithInitialDataExample = () => {
  const handleSubmit = (data: any) => {
    console.log('Updated Episode Details:', data);
  };

  const handleBack = () => {
    console.log('User clicked back');
  };

  return (
    <EpisodeDetailsForm
      guestName="Maria Santos"
      initialData={{
        theme: 'Políticas Públicas e Sustentabilidade',
        themeMode: 'manual',
        season: 2,
        location: 'Presencial - Estúdio Aica',
        scheduledDate: '2025-02-15',
        scheduledTime: '14:00',
      }}
      onSubmit={handleSubmit}
      onBack={handleBack}
    />
  );
};

// Example 3: Aica Auto mode (default)
export const AicaAutoModeExample = () => {
  const handleSubmit = (data: any) => {
    console.log('Auto-generated theme:', data.theme);
    // Theme will be auto-generated like:
    // "Conversa com Pedro Costa sobre tecnologia e sociedade"
  };

  return (
    <EpisodeDetailsForm
      guestName="Pedro Costa"
      initialData={{
        themeMode: 'auto', // This is the default
      }}
      onSubmit={handleSubmit}
      onBack={() => {}}
    />
  );
};

// Example 4: Public Figure workflow (after profile confirmation)
export const PublicFigureWorkflowExample = () => {
  // Simulating wizard state from previous steps
  const wizardState = {
    guestData: {
      name: 'Dr. Ana Paula Scientist',
      email: 'ana@example.com',
      confirmedProfile: {
        fullName: 'Dr. Ana Paula Scientist',
        title: 'Pesquisadora Senior em Biotecnologia',
        occupation: 'Cientista',
        biography: 'Doutora em Biotecnologia com mais de 20 anos...',
      },
    },
  };

  const handleSubmit = (data: any) => {
    // Complete episode creation with all data
    const completeData = {
      // Guest data (from previous steps)
      guest_name: wizardState.guestData.name,
      guest_email: wizardState.guestData.email,
      guest_profile: wizardState.guestData.confirmedProfile,

      // Episode data (from this step)
      episode_theme: data.theme,
      theme_mode: data.themeMode,
      season: data.season,
      location: data.location,
      scheduled_date: data.scheduledDate,
      scheduled_time: data.scheduledTime,

      status: 'draft',
    };

    console.log('Complete Episode Data:', completeData);
    // Send to API or database
  };

  return (
    <EpisodeDetailsForm
      guestName={wizardState.guestData.name}
      onSubmit={handleSubmit}
      onBack={() => console.log('Back to profile confirmation')}
    />
  );
};

// Example 5: Testing theme generation
export const ThemeGenerationTest = () => {
  const guestNames = [
    'Elon Musk',
    'Bill Gates',
    'Marie Curie',
    'Albert Einstein',
    'Steve Jobs',
  ];

  const [currentGuest, setCurrentGuest] = React.useState(0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {guestNames.map((name, index) => (
          <button
            key={name}
            onClick={() => setCurrentGuest(index)}
            className={`px-3 py-1 rounded ${
              currentGuest === index
                ? 'bg-amber-500 text-white'
                : 'bg-ceramic-cool'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <EpisodeDetailsForm
        guestName={guestNames[currentGuest]}
        onSubmit={(data) => console.log('Theme:', data.theme)}
        onBack={() => {}}
      />
    </div>
  );
};
