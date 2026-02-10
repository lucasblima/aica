/**
 * CredentialCard Component
 *
 * Displays academic credentials with visual certificate-like design.
 * Design: Elegant card with verification badge and expiry warnings.
 */

import React from 'react';
import { AcademiaCredential } from '../types';

interface CredentialCardProps {
  credential: AcademiaCredential;
  onClick?: () => void;
}

/**
 * Get credential type icon
 */
const getCredentialIcon = (type?: string): string => {
  const icons: Record<string, string> = {
    certificate: '📜',
    diploma: '🎓',
    badge: '🏅',
    publication: '📄',
    award: '🏆',
  };
  return type && icons[type] ? icons[type] : '📜';
};

/**
 * Get credential type color
 */
const getCredentialColor = (type?: string): string => {
  const colors: Record<string, string> = {
    certificate: 'from-ceramic-info/10 to-ceramic-info/15 border-ceramic-info/30',
    diploma: 'from-ceramic-accent/10 to-ceramic-accent/15 border-ceramic-accent/30',
    badge: 'from-ceramic-warning/10 to-ceramic-warning/15 border-ceramic-warning/30',
    publication: 'from-ceramic-success/10 to-ceramic-success/15 border-ceramic-success/30',
    award: 'from-ceramic-error/10 to-ceramic-error/15 border-ceramic-error/30',
  };
  return type && colors[type]
    ? colors[type]
    : 'from-ceramic-cool to-ceramic-cool border-ceramic-border';
};

/**
 * Check if credential is expiring soon (within 30 days)
 */
const isExpiringSoon = (expiresAt?: string): boolean => {
  if (!expiresAt) return false;

  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays > 0 && diffDays <= 30;
};

/**
 * Check if credential is expired
 */
const isExpired = (expiresAt?: string): boolean => {
  if (!expiresAt) return false;

  const expiryDate = new Date(expiresAt);
  const now = new Date();

  return expiryDate < now;
};

/**
 * Format date
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const CredentialCard: React.FC<CredentialCardProps> = ({
  credential,
  onClick,
}) => {
  const {
    title,
    issuer,
    credential_type,
    issued_at,
    expires_at,
    credential_url,
    credential_id,
  } = credential;

  const expired = isExpired(expires_at);
  const expiringSoon = !expired && isExpiringSoon(expires_at);

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden border rounded-sm p-6
        bg-gradient-to-br ${getCredentialColor(credential_type)}
        hover:shadow-md transition-all duration-200
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path
            d="M100,0 L100,100 L0,100 Z"
            fill="currentColor"
            className="text-ceramic-text-primary"
          />
        </svg>
      </div>

      {/* Icon */}
      <div className="flex items-start justify-between mb-4">
        <span className="text-4xl">{getCredentialIcon(credential_type)}</span>

        {/* Verification badge */}
        {credential_url && (
          <a
            href={credential_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-ceramic-success hover:text-ceramic-success/80 transition-colors"
            title="Verify credential"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-normal text-ceramic-text-primary mb-1 leading-tight">
        {title}
      </h3>

      {/* Issuer */}
      <p className="text-sm text-ceramic-text-primary font-light mb-4">{issuer}</p>

      {/* Metadata */}
      <div className="space-y-2 text-xs text-ceramic-text-secondary font-light">
        {/* Issue date */}
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-ceramic-text-tertiary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>Issued {formatDate(issued_at)}</span>
        </div>

        {/* Credential ID */}
        {credential_id && (
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-ceramic-text-tertiary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
              />
            </svg>
            <span className="truncate">ID: {credential_id}</span>
          </div>
        )}

        {/* Expiry warning */}
        {expires_at && (
          <div
            className={`
              flex items-center gap-2 pt-2 border-t
              ${
                expired
                  ? 'border-ceramic-error/30 text-ceramic-error'
                  : expiringSoon
                  ? 'border-ceramic-warning/30 text-ceramic-warning'
                  : 'border-ceramic-border'
              }
            `}
          >
            {expired ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="font-normal">Expired {formatDate(expires_at)}</span>
              </>
            ) : expiringSoon ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-normal">Expires {formatDate(expires_at)}</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 text-ceramic-text-tertiary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Valid until {formatDate(expires_at)}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CredentialCard;
