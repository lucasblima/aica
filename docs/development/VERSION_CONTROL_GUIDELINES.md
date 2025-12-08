# Version Control Guidelines - Aica Life OS

## Git as Source of Truth

### ❌ DO NOT Create Manual Backups

**NEVER create backup files** like:
- `file.backup_*`
- `file.bak`
- `file~`
- `file.old`

**Reason:** Git is the source of truth for version control.

**Instead, use Git commands:**
```bash
# View previous version
git show HEAD~1:path/to/file

# Compare changes
git diff HEAD~1 path/to/file

# Restore previous version
git checkout <commit> -- path/to/file

# View history
git log --follow path/to/file
```

### ✅ Proper Workflow for Risky Operations

**Before making significant changes:**
1. Create a feature branch: `git checkout -b feature/my-changes`
2. Make changes and commit frequently
3. If something goes wrong: `git reset --hard` or `git checkout main`

**For documentation updates:**
1. Read current file
2. Make edits directly
3. Commit with descriptive message
4. Git history preserves all versions

### 🎯 Philosophy

**"Git is the backup system"** - Every commit is a snapshot. Creating manual backups:
- Pollutes the repository
- Creates confusion about source of truth
- Wastes disk space
- Violates DRY (Don't Repeat Yourself)

### 🛡️ Enforcement

**.gitignore patterns block backup files:**
```
*.backup_*
*.bak
*.backup
*~
```

---

## Agent-Specific Instructions

### For documentation-maintainer agent:
- NEVER create `.backup_*` files when updating docs
- Commit changes directly with descriptive messages
- Trust Git history for rollback capability

### For all agents:
- Use `git diff` before committing to review changes
- Write clear commit messages following Conventional Commits
- Use branches for experimental changes
- NEVER use manual file backups

---

**Last Updated:** 2025-12-08
**Rationale:** Commit 240b7a4 - Cleanup of redundant backup files
**Enforcement:** Active via .gitignore patterns
