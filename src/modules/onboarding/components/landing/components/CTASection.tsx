import type React from 'react';

/**
 * CTASection — Final call-to-action with invite code + waitlist.
 * Stub placeholder — will be implemented in Task 9.
 */

export interface CTASectionProps {
  waitlistCount: number;
  onJoinWaitlist: (email: string) => Promise<any>;
  isSubmitting: boolean;
  submitted: boolean;
  error: string | null;
  inviteCode: string;
  onCodeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCodeSubmit: () => void;
  codeValid: boolean;
  codeError: string;
}

export function CTASection(_props: CTASectionProps) {
  return (
    <section className="py-24 px-6 flex items-center justify-center min-h-[50vh]">
      <p className="text-ceramic-text-secondary text-lg">CTA Section — Coming Soon</p>
    </section>
  );
}
