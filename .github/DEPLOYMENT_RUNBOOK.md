# Quick Deployment Runbook

> **Purpose**: Fast reference guide for deploying Guest Identification Wizard to staging/production.
>
> **For detailed checklist**: See `docs/DEPLOYMENT_CHECKLIST_STAGING.md`

---

## Quick Deploy to Staging (10 min)

### Pre-Flight Checks
```bash
# 1. Verify all tests pass
npm run test
npm run test:e2e

# 2. Verify TypeScript compilation
npx tsc --noEmit

# 3. Verify build
npm run build

# 4. Check git status
git status
git log -1
```

### Deploy Database
```bash
# Connect to staging
supabase link --project-ref <staging-project-ref>

# Dry run
supabase db push --dry-run --linked

# Apply migrations
supabase db push --linked
```

### Deploy Code
```bash
# Option 1: Auto-deploy via CI/CD (recommended)
git push origin main

# Option 2: Manual staging branch
git push origin main:staging

# Option 3: Direct deploy (Vercel)
vercel deploy --target staging
```

### Verify Deployment (5 min)
```bash
# 1. Open staging URL
# https://staging.yourdomain.com

# 2. Manual test flow:
# - Navigate to Dashboard
# - Click "Criar Episódio"
# - Test wizard:
#   * Select "Contato Direto"
#   * Fill name, phone, email
#   * Complete episode details
#   * Verify creation

# 3. Check logs
vercel logs <deployment-url> --follow

# 4. Check database
# Supabase Dashboard > Database > Table Editor > episodes
# Verify new record with guest_phone and guest_email
```

---

## Quick Rollback (5 min)

### When to Rollback
- Critical bug preventing episode creation
- Data corruption or loss
- Security issue (RLS bypass)
- Performance degradation (> 10s response times)
- Error rate > 10%

### Rollback Procedure
```bash
# 1. Identify commit to revert
git log --oneline -10

# 2. Revert commit
git revert <commit-hash>

# 3. Push to staging
git push origin main:staging

# 4. Verify rollback
# Test that app loads and basic functionality works

# 5. (If needed) Revert database migration
supabase migration new rollback_guest_contact_fields
# Add SQL to drop columns/indices
supabase db push --linked
```

### Rollback Verification
- [ ] App loads without errors
- [ ] Previous wizard version works (if applicable)
- [ ] No 500 errors
- [ ] Database consistent

---

## Deploy to Production (15 min)

### Prerequisites
- [ ] All staging tests passed
- [ ] 24h monitoring in staging completed
- [ ] Product Owner sign-off
- [ ] QA approval
- [ ] Documentation updated

### Production Deploy
```bash
# 1. Create production release
git checkout main
git pull origin main
git tag -a v1.x.x -m "Release: Guest Identification Wizard"
git push origin v1.x.x

# 2. Deploy database to production
supabase link --project-ref <production-project-ref>
supabase db push --linked

# 3. Deploy code
git push origin main:production
# OR
vercel deploy --prod

# 4. Verify production
# - Test wizard end-to-end
# - Monitor logs for 1 hour
# - Check error rates
```

---

## Monitoring Quick Checks

### First Hour After Deploy
```bash
# Check logs every 15 min
vercel logs <deployment-url> --follow

# Check Supabase logs
# Dashboard > Logs > API Logs

# Check error tracking (Sentry/similar)
# Look for new errors with stack traces
```

### What to Monitor
- [ ] No 500 errors
- [ ] Response times < 2s
- [ ] Database query performance < 100ms
- [ ] At least 1 successful episode creation
- [ ] No RLS policy violations

### Red Flags (trigger immediate investigation)
- 🚨 Error rate > 5%
- 🚨 Response time > 5s
- 🚨 Database connection errors
- 🚨 Memory leaks (increasing memory usage)
- 🚨 RLS policy bypassed (security issue)

---

## Troubleshooting

### Common Issues

#### 1. Build Fails
```bash
# Clear cache
rm -rf node_modules/.vite dist

# Reinstall
npm ci
npm run build
```

#### 2. Migration Fails
```bash
# Check migration status
supabase migration list

# Reset (CAREFUL: development only!)
supabase db reset

# Manual fix
supabase db execute --file fix.sql
```

#### 3. App Won't Load
```bash
# Check deployment logs
vercel logs <deployment-url>

# Check environment variables
# Verify in Vercel/Netlify dashboard

# Check Supabase connection
# Dashboard > Settings > API
```

#### 4. Wizard Not Working
```bash
# Check browser console
# Look for JavaScript errors

# Check network tab
# Verify API calls succeeding

# Check Supabase logs
# Look for query errors
```

#### 5. Data Not Saving
```bash
# Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'episodes';

# Check user authentication
# Verify auth.uid() is set

# Test insert manually
INSERT INTO episodes (user_id, guest_name, guest_phone, guest_email)
VALUES (auth.uid(), 'Test', '+5511999999999', 'test@example.com');
```

---

## Emergency Procedures

### Critical Bug Found in Production

1. **Immediate**: Communicate to team (Slack #incidents)
2. **Assess**: Determine severity
   - P0: Complete outage → Rollback immediately
   - P1: Feature broken → Rollback or hotfix within 1h
   - P2: Minor bug → Plan fix for next release
3. **Execute**: Rollback or hotfix
4. **Document**: Create incident report

### Database Emergency

```bash
# If data corruption suspected
# 1. Stop writes (disable feature flag or rollback)
# 2. Assess damage
SELECT COUNT(*) FROM episodes WHERE guest_phone IS NULL;

# 3. Restore from backup (last resort)
# Supabase Dashboard > Database > Backups
# Choose backup before deployment

# 4. Reapply migrations if needed
supabase db push --linked
```

---

## Useful Commands

### Git
```bash
# View recent commits
git log --oneline -10

# Create release tag
git tag -a v1.2.3 -m "Description"
git push origin v1.2.3

# Revert commit
git revert <commit-hash>

# Cherry-pick fix
git cherry-pick <commit-hash>
```

### Database
```bash
# Connect to project
supabase link --project-ref <project-ref>

# List migrations
supabase migration list

# Create new migration
supabase migration new <name>

# Apply migrations
supabase db push --linked

# Execute SQL
supabase db execute --file query.sql
```

### Build & Deploy
```bash
# Clean build
rm -rf node_modules/.vite dist
npm ci
npm run build

# Preview build locally
npm run preview

# Deploy (Vercel)
vercel deploy --target staging
vercel deploy --prod

# Check deployment status
vercel ls
```

### Debugging
```bash
# TypeScript check
npx tsc --noEmit

# Lint check
npm run lint

# Test specific file
npm run test -- GuestIdentificationWizard

# E2E test
npm run test:e2e -- --grep "Guest"

# Bundle analysis
npm run build -- --analyze
```

---

## Emergency Contacts

### Team
- **Tech Lead**: [Nome] - [Slack: @handle] - [Telefone]
- **DevOps Engineer**: [Nome] - [Slack: @handle] - [Telefone]
- **Product Owner**: [Nome] - [Slack: @handle] - [Email]
- **QA Lead**: [Nome] - [Slack: @handle] - [Email]

### On-Call Rotation
- **Current On-Call**: [Nome] - [Telefone]
- **Backup**: [Nome] - [Telefone]

### Escalation Path
1. Team Slack channel: `#incidents`
2. On-Call engineer (via phone)
3. Tech Lead
4. CTO/Engineering Manager

---

## Important Links

### Environments
- **Staging**: https://staging.yourdomain.com
- **Production**: https://yourdomain.com

### Tools
- **Supabase Staging**: https://app.supabase.com/project/<staging-ref>
- **Supabase Production**: https://app.supabase.com/project/<production-ref>
- **CI/CD Pipeline**: [GitHub Actions / Jenkins / etc]
- **Monitoring**: [Datadog / New Relic / etc]
- **Error Tracking**: [Sentry / Rollbar / etc]
- **Analytics**: [Google Analytics / Mixpanel / etc]

### Documentation
- **Full Deployment Checklist**: `docs/DEPLOYMENT_CHECKLIST_STAGING.md`
- **Test Plan**: `docs/STAGING_TEST_PLAN.md`
- **Architecture**: `docs/podcast/ARCHITECTURE.md`
- **Postmortems**: `docs/postmortems/`

---

## Quick Reference

### Deployment Status Codes
- ✅ **Green**: All systems operational
- ⚠️ **Yellow**: Non-critical issues, monitoring required
- 🚨 **Red**: Critical issues, immediate action required

### Deployment Phases
1. **Pre-Flight**: Tests, builds, validations (5 min)
2. **Deploy DB**: Migrations (5 min)
3. **Deploy Code**: Push to staging/production (2 min)
4. **Verification**: Manual testing (5 min)
5. **Monitoring**: 24h continuous monitoring

### Success Criteria
- [ ] Zero critical errors
- [ ] Response time < 2s
- [ ] At least 1 successful episode creation
- [ ] RLS policies working
- [ ] Mobile responsive

---

**Last Updated**: 2024-12-10
**Maintained By**: Engineering Team
**Review Frequency**: After each major release
