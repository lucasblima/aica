/**
 * AcademiaDashboard Component
 *
 * Library-inspired dashboard for Academia spaces.
 * Design: Lots of whitespace, elegant typography, paper-like cards.
 */

import React from 'react';
import { useJourneys } from '../hooks/useJourneys';
import { useNotes } from '../hooks/useNotes';
import { useMentorships } from '../hooks/useMentorships';
import { useCredentials } from '../hooks/useCredentials';
import { JourneyCard } from './JourneyCard';
import { MentorshipCard } from './MentorshipCard';
import { CredentialCard } from './CredentialCard';

interface AcademiaDashboardProps {
  spaceId: string;
}

export const AcademiaDashboard: React.FC<AcademiaDashboardProps> = ({ spaceId }) => {
  const { journeys, loading: journeysLoading } = useJourneys({
    spaceId,
    status: 'active',
  });

  const { notes, loading: notesLoading } = useNotes({ spaceId });

  const { mentorships, loading: mentorshipsLoading } = useMentorships({ spaceId });

  const { credentials, loading: credentialsLoading } = useCredentials({ spaceId });

  const loading =
    journeysLoading || notesLoading || mentorshipsLoading || credentialsLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-stone-400 text-sm font-light tracking-wide">
          Loading library...
        </div>
      </div>
    );
  }

  // Get recent notes (last 5)
  const recentNotes = notes.slice(0, 5);

  // Get active journeys
  const activeJourneys = journeys.filter((j) => j.status === 'active').slice(0, 3);

  // Get upcoming sessions
  const upcomingMentorships = mentorships
    .filter((m) => m.next_session_at && m.status === 'active')
    .slice(0, 2);

  // Get recent credentials
  const recentCredentials = credentials.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-8 py-12 space-y-16">
      {/* Header */}
      <header className="border-b border-stone-200 pb-8">
        <h1 className="text-4xl font-light text-stone-900 tracking-tight mb-2">
          Library
        </h1>
        <p className="text-stone-500 text-sm font-light tracking-wide">
          Your personal repository of knowledge and growth
        </p>
      </header>

      {/* Active Journeys */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-light text-stone-800 tracking-tight">
            Active Journeys
          </h2>
          <span className="text-xs text-stone-400 font-light tracking-wider uppercase">
            {activeJourneys.length} in progress
          </span>
        </div>

        {activeJourneys.length === 0 ? (
          <div className="bg-stone-50 rounded-sm border border-stone-100 p-12 text-center">
            <p className="text-stone-400 text-sm font-light tracking-wide">
              No active learning journeys. Start a new course or book to begin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeJourneys.map((journey) => (
              <JourneyCard key={journey.id} journey={journey} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Notes */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-light text-stone-800 tracking-tight">
            Recent Notes
          </h2>
          <span className="text-xs text-stone-400 font-light tracking-wider uppercase">
            {notes.length} total
          </span>
        </div>

        {recentNotes.length === 0 ? (
          <div className="bg-stone-50 rounded-sm border border-stone-100 p-12 text-center">
            <p className="text-stone-400 text-sm font-light tracking-wide">
              Your knowledge base is empty. Create your first note.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white border border-stone-200 rounded-sm p-6 hover:shadow-sm transition-shadow cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-normal text-stone-900">
                    {note.title}
                  </h3>
                  <span className="text-xs text-stone-400 font-light tracking-wider uppercase">
                    {note.note_type}
                  </span>
                </div>
                <p className="text-sm text-stone-600 font-light line-clamp-2 leading-relaxed">
                  {note.content.substring(0, 150)}...
                </p>
                {note.tags.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {note.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs text-stone-500 bg-stone-50 px-2 py-1 rounded-sm font-light"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Mentorship Sessions */}
      {upcomingMentorships.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-light text-stone-800 tracking-tight">
            Upcoming Sessions
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingMentorships.map((mentorship) => (
              <MentorshipCard key={mentorship.id} mentorship={mentorship} />
            ))}
          </div>
        </section>
      )}

      {/* Credentials Showcase */}
      {recentCredentials.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl font-light text-stone-800 tracking-tight">
              Credentials
            </h2>
            <span className="text-xs text-stone-400 font-light tracking-wider uppercase">
              {credentials.length} earned
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentCredentials.map((credential) => (
              <CredentialCard key={credential.id} credential={credential} />
            ))}
          </div>
        </section>
      )}

      {/* Stats Bar */}
      <section className="border-t border-stone-200 pt-8">
        <div className="grid grid-cols-4 gap-8">
          <div className="text-center space-y-1">
            <div className="text-3xl font-light text-stone-900">
              {journeys.length}
            </div>
            <div className="text-xs text-stone-500 font-light tracking-wider uppercase">
              Journeys
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl font-light text-stone-900">{notes.length}</div>
            <div className="text-xs text-stone-500 font-light tracking-wider uppercase">
              Notes
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl font-light text-stone-900">
              {mentorships.length}
            </div>
            <div className="text-xs text-stone-500 font-light tracking-wider uppercase">
              Mentorships
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl font-light text-stone-900">
              {credentials.length}
            </div>
            <div className="text-xs text-stone-500 font-light tracking-wider uppercase">
              Credentials
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AcademiaDashboard;
