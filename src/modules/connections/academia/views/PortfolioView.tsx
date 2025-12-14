/**
 * PortfolioView
 *
 * Showcase of earned credentials and achievements.
 */

import React from 'react';
import { useCredentials } from '../hooks/useCredentials';
import { CredentialCard } from '../components/CredentialCard';

interface PortfolioViewProps {
  spaceId: string;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({ spaceId }) => {
  const { credentials, loading } = useCredentials({ spaceId });

  // Group by type
  const groupedCredentials = credentials.reduce((acc, cred) => {
    const type = cred.credential_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(cred);
    return acc;
  }, {} as Record<string, typeof credentials>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-stone-400 text-sm font-light tracking-wide">
          Loading credentials...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-12 space-y-12">
      {/* Header */}
      <header className="border-b border-stone-200 pb-8">
        <h1 className="text-4xl font-light text-stone-900 tracking-tight mb-2">
          Academic Portfolio
        </h1>
        <p className="text-stone-500 text-sm font-light tracking-wide">
          {credentials.length} credentials earned
        </p>
      </header>

      {credentials.length === 0 ? (
        <div className="bg-stone-50 rounded-sm border border-stone-100 p-12 text-center">
          <p className="text-stone-400 text-sm font-light tracking-wide">
            No credentials yet. Complete courses and earn certifications to build your
            portfolio.
          </p>
        </div>
      ) : (
        <>
          {/* Certificates */}
          {groupedCredentials.certificate && (
            <section className="space-y-6">
              <h2 className="text-2xl font-light text-stone-800 tracking-tight">
                Certificates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedCredentials.certificate.map((cred) => (
                  <CredentialCard key={cred.id} credential={cred} />
                ))}
              </div>
            </section>
          )}

          {/* Diplomas */}
          {groupedCredentials.diploma && (
            <section className="space-y-6">
              <h2 className="text-2xl font-light text-stone-800 tracking-tight">
                Diplomas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedCredentials.diploma.map((cred) => (
                  <CredentialCard key={cred.id} credential={cred} />
                ))}
              </div>
            </section>
          )}

          {/* Badges */}
          {groupedCredentials.badge && (
            <section className="space-y-6">
              <h2 className="text-2xl font-light text-stone-800 tracking-tight">
                Badges
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedCredentials.badge.map((cred) => (
                  <CredentialCard key={cred.id} credential={cred} />
                ))}
              </div>
            </section>
          )}

          {/* Publications */}
          {groupedCredentials.publication && (
            <section className="space-y-6">
              <h2 className="text-2xl font-light text-stone-800 tracking-tight">
                Publications
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedCredentials.publication.map((cred) => (
                  <CredentialCard key={cred.id} credential={cred} />
                ))}
              </div>
            </section>
          )}

          {/* Awards */}
          {groupedCredentials.award && (
            <section className="space-y-6">
              <h2 className="text-2xl font-light text-stone-800 tracking-tight">
                Awards
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedCredentials.award.map((cred) => (
                  <CredentialCard key={cred.id} credential={cred} />
                ))}
              </div>
            </section>
          )}

          {/* Other */}
          {groupedCredentials.other && (
            <section className="space-y-6">
              <h2 className="text-2xl font-light text-stone-800 tracking-tight">
                Other
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedCredentials.other.map((cred) => (
                  <CredentialCard key={cred.id} credential={cred} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default PortfolioView;
