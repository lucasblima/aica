<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1YI00vl3LP8v5uAFBNtEGJiqQLDsFGbsz

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

---

## Journey Redesign Deployment

The Journey Redesign feature is ready for deployment. This includes database migrations, Edge Functions, and storage setup.

### Quick Deployment

For experienced engineers who need to deploy FAST:

See [QUICK_START_DEPLOYMENT.md](./QUICK_START_DEPLOYMENT.md) - 10 minutes

### Full Deployment Guide

For complete step-by-step instructions:

See [docs/DEPLOYMENT_INSTRUCTIONS_20251206.md](./docs/DEPLOYMENT_INSTRUCTIONS_20251206.md) - 15 min read, 45 min execution

### Deployment Package Contents

- Database Migration: `supabase/migrations/20251206_journey_redesign.sql`
  - 6 tables (moments, weekly_summaries, daily_questions, etc)
  - 4 functions (CP calculation, point awarding, streak tracking)
  - 15+ RLS policies
  - 10 seeded daily questions

- Edge Function: `supabase/functions/gemini-chat/index.ts`
  - AI sentiment analysis
  - AI weekly summary generation
  - Backward-compatible finance chat

- Storage Bucket: `moments-audio`
  - Audio moment uploads
  - RLS-protected user folders

### Documentation Index

All deployment documentation:

[DEPLOYMENT_INDEX.md](./DEPLOYMENT_INDEX.md) - Navigate all deployment files

Key documents:
- [QUICK_START_DEPLOYMENT.md](./QUICK_START_DEPLOYMENT.md) - Fast deployment guide
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Interactive checklist (37 checkpoints)
- [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md) - Architecture overview
- [DEPLOYMENT_REPORT.md](./DEPLOYMENT_REPORT.md) - Complete package report

### Deployment Status

Status: Ready for Deployment

- Migration validated
- Edge Function tested
- RLS policies reviewed
- Validation scripts ready
- Rollback plan documented

Risk Level: Low (no breaking changes)

### Support

For deployment issues, consult:
1. [DEPLOYMENT_INDEX.md](./DEPLOYMENT_INDEX.md) - Find relevant documentation
2. [docs/DEPLOYMENT_INSTRUCTIONS_20251206.md](./docs/DEPLOYMENT_INSTRUCTIONS_20251206.md) - Troubleshooting section
3. [DEPLOYMENT_REPORT.md](./DEPLOYMENT_REPORT.md) - Risk assessment and mitigations
