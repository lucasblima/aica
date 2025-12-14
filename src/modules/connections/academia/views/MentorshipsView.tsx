/**
 * MentorshipsView
 *
 * Manage mentorship relationships (giving and receiving).
 */

import React from 'react';
import { useMentorships } from '../hooks/useMentorships';
import { MentorshipCard } from '../components/MentorshipCard';

interface MentorshipsViewProps {
  spaceId: string;
}

export const MentorshipsView: React.FC<MentorshipsViewProps> = ({ spaceId }) => {
  const { mentorships, loading } = useMentorships({ spaceId });

  const givingMentorships = mentorships.filter(
    (m) => m.relationship_type === 'giving' && m.status === 'active'
  );
  const receivingMentorships = mentorships.filter(
    (m) => m.relationship_type === 'receiving' && m.status === 'active'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-stone-400 text-sm font-light tracking-wide">
          Loading mentorships...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-12 space-y-12">
      {/* Header */}
      <header>
        <h1 className="text-4xl font-light text-stone-900 tracking-tight mb-2">
          Mentorships
        </h1>
        <p className="text-stone-500 text-sm font-light tracking-wide">
          Your mentorship relationships
        </p>
      </header>

      {/* Giving Mentorships */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-light text-stone-800 tracking-tight">
            Mentoring Others
          </h2>
          <span className="text-xs text-stone-400 font-light tracking-wider uppercase">
            {givingMentorships.length} active
          </span>
        </div>

        {givingMentorships.length === 0 ? (
          <div className="bg-stone-50 rounded-sm border border-stone-100 p-12 text-center">
            <p className="text-stone-400 text-sm font-light tracking-wide">
              You're not currently mentoring anyone. Consider sharing your knowledge!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {givingMentorships.map((mentorship) => (
              <MentorshipCard key={mentorship.id} mentorship={mentorship} />
            ))}
          </div>
        )}
      </section>

      {/* Receiving Mentorships */}
      <section className="space-y-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-light text-stone-800 tracking-tight">
            Learning From
          </h2>
          <span className="text-xs text-stone-400 font-light tracking-wider uppercase">
            {receivingMentorships.length} active
          </span>
        </div>

        {receivingMentorships.length === 0 ? (
          <div className="bg-stone-50 rounded-sm border border-stone-100 p-12 text-center">
            <p className="text-stone-400 text-sm font-light tracking-wide">
              You don't have any mentors. Find someone to guide your growth!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {receivingMentorships.map((mentorship) => (
              <MentorshipCard key={mentorship.id} mentorship={mentorship} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MentorshipsView;
