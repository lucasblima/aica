# Session Protocol

## Session End Protocol — ALWAYS Execute

At the end of every session (when all tasks are complete):

1. **Commit** all changes with descriptive message + co-authorship
2. **Push** to `origin/main`
3. **Deploy to staging** (`dev.aica.guru`) — only if user requests
4. **Push migrations** if any new `.sql` files were created
5. **Deploy Edge Functions** if any were created/modified
6. **Create GitHub issue** summarizing session work with label `staging-ready`

Production deploy only happens when user validates staging and explicitly says "deploy producao".

## Commit Conventions

```
<type>(<scope>): <description>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

**Types:** feat, fix, docs, test, refactor, chore
**Scopes:** podcast, auth, gamification, whatsapp, security, studio, ui, components, architecture, database, flux, journey, grants, finance, connections

## Multi-Terminal Sync

Before starting any session:
```bash
git pull origin main
git branch -a --sort=-committerdate | head -10
git log --all --oneline --since="1 day ago" | head -20
```

## Branch Naming

```
feature/{description-kebab-case}-issue-{number}
fix/{description-kebab-case}
refactor/{description-kebab-case}
```

## PR Checklist

- `npm run build` passed
- `npm run typecheck` passed
- Commits follow Conventional Commits
- Co-authorship included
- Branch up to date with main
