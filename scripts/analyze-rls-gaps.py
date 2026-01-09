#!/usr/bin/env python
"""
RLS Coverage Gap Analysis - Issue #73 Phase 1
Analyzes RLS policy coverage and identifies gaps
"""

import re
from collections import defaultdict
from pathlib import Path

# Read tables
base_dir = Path("C:/Users/lucas/repos/Aica_frontend/Aica_frontend/docs/audit-reports")
tables_file = base_dir / "tables_found.txt"
policies_file = base_dir / "rls_policies_raw.txt"

tables = set()
with open(tables_file) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('--') and line not in ['users', '-- 1. CREATE TABLE']:
            # Clean table names
            table = line.replace('public.', '').strip()
            if table:
                tables.add(table)

# Read policies
policy_coverage = defaultdict(set)
with open(policies_file) as f:
    for line in f:
        if '|' in line and line.strip() != "TABLE|POLICY_TYPE|POLICY_NAME|MIGRATION_FILE":
            parts = line.split('|')
            if len(parts) >= 2:
                table = parts[0].strip().replace('public.', '')
                policy_type = parts[1].strip().upper()
                
                # Only track actual CRUD policies
                if policy_type in ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL']:
                    policy_coverage[table].add(policy_type)

# Categorize tables by priority (based on sensitivity)
CRITICAL_TABLES = {
    'ai_usage_logs', 'gemini_api_logs', 'ai_usage_tracking_errors',
    'whatsapp_consent_records', 'consent_records', 'data_deletion_requests',
    'moments', 'weekly_summaries', 'daily_questions', 'question_responses',
    'whatsapp_messages', 'contact_network', 'whatsapp_sync_logs'
}

HIGH_PRIORITY_TABLES = {
    'work_items', 'user_achievements', 'user_stats', 'user_consciousness_stats',
    'finance_transactions', 'finance_statements', 'grant_operations',
    'podcast_episodes', 'podcast_shows', 'task_categories', 'task_projects'
}

# Analyze coverage
print("="*80)
print("RLS COVERAGE GAP ANALYSIS - Issue #73 Phase 1")
print("="*80)
print()

incomplete_coverage = []
no_coverage = []

for table in sorted(tables):
    policies = policy_coverage.get(table, set())
    
    # ALL policy covers everything
    if 'ALL' in policies:
        policies = {'SELECT', 'INSERT', 'UPDATE', 'DELETE'}
    
    expected = {'SELECT', 'INSERT', 'UPDATE', 'DELETE'}
    missing = expected - policies
    
    if len(policies) == 0:
        no_coverage.append(table)
    elif missing:
        incomplete_coverage.append((table, policies, missing))

# Priority classification
critical_gaps = []
high_gaps = []
medium_gaps = []

for table in no_coverage:
    if table in CRITICAL_TABLES:
        critical_gaps.append((table, 'NO_POLICIES'))
    elif table in HIGH_PRIORITY_TABLES:
        high_gaps.append((table, 'NO_POLICIES'))
    else:
        medium_gaps.append((table, 'NO_POLICIES'))

for table, has, missing in incomplete_coverage:
    if table in CRITICAL_TABLES:
        critical_gaps.append((table, missing))
    elif table in HIGH_PRIORITY_TABLES:
        high_gaps.append((table, missing))
    else:
        medium_gaps.append((table, missing))

# Print results
print(f"📊 SUMMARY")
print(f"-" * 80)
print(f"Total Tables: {len(tables)}")
print(f"Tables with Complete Coverage: {len(tables) - len(no_coverage) - len(incomplete_coverage)}")
print(f"Tables with No Policies: {len(no_coverage)}")
print(f"Tables with Incomplete Policies: {len(incomplete_coverage)}")
print()

print(f"🔴 CRITICAL GAPS: {len(critical_gaps)}")
print(f"🟡 HIGH PRIORITY GAPS: {len(high_gaps)}")
print(f"🟠 MEDIUM PRIORITY GAPS: {len(medium_gaps)}")
print()

if critical_gaps:
    print("="*80)
    print("🔴 CRITICAL GAPS (Sensitive Data Tables)")
    print("="*80)
    for table, missing in critical_gaps:
        print(f"\n📋 Table: {table}")
        if missing == 'NO_POLICIES':
            print(f"   ❌ NO RLS POLICIES AT ALL")
        else:
            print(f"   ⚠️  Missing: {', '.join(sorted(missing))}")
    print()

if high_gaps:
    print("="*80)
    print("🟡 HIGH PRIORITY GAPS (Business Logic Tables)")
    print("="*80)
    for table, missing in high_gaps:
        print(f"\n📋 Table: {table}")
        if missing == 'NO_POLICIES':
            print(f"   ❌ NO RLS POLICIES AT ALL")
        else:
            print(f"   ⚠️  Missing: {', '.join(sorted(missing))}")
    print()

if medium_gaps:
    print("="*80)
    print("🟠 MEDIUM PRIORITY GAPS (Other Tables)")
    print("="*80)
    for table, missing in medium_gaps[:10]:  # Show first 10
        print(f"\n📋 Table: {table}")
        if missing == 'NO_POLICIES':
            print(f"   ❌ NO RLS POLICIES AT ALL")
        else:
            print(f"   ⚠️  Missing: {', '.join(sorted(missing))}")
    
    if len(medium_gaps) > 10:
        print(f"\n... and {len(medium_gaps) - 10} more medium priority gaps")
    print()

# Generate detailed report
report_path = base_dir / "RLS_GAP_REPORT.md"
with open(report_path, 'w') as f:
    f.write("# RLS Coverage Gap Report - Issue #73 Phase 1\n\n")
    f.write(f"**Generated**: 2026-01-08\n\n")
    
    f.write("## Executive Summary\n\n")
    f.write(f"- **Total Tables**: {len(tables)}\n")
    f.write(f"- **Complete Coverage**: {len(tables) - len(no_coverage) - len(incomplete_coverage)}\n")
    f.write(f"- **No Policies**: {len(no_coverage)}\n")
    f.write(f"- **Incomplete Policies**: {len(incomplete_coverage)}\n\n")
    
    f.write(f"### Priority Breakdown\n\n")
    f.write(f"- 🔴 **CRITICAL**: {len(critical_gaps)} gaps\n")
    f.write(f"- 🟡 **HIGH**: {len(high_gaps)} gaps\n")
    f.write(f"- 🟠 **MEDIUM**: {len(medium_gaps)} gaps\n\n")
    
    f.write("## Critical Gaps (Must Fix Before Production)\n\n")
    f.write("| Table | Status | Missing Policies |\n")
    f.write("|-------|--------|------------------|\n")
    
    for table, missing in critical_gaps:
        if missing == 'NO_POLICIES':
            f.write(f"| `{table}` | ❌ NO RLS | ALL (SELECT, INSERT, UPDATE, DELETE) |\n")
        else:
            f.write(f"| `{table}` | ⚠️ Incomplete | {', '.join(sorted(missing))} |\n")
    
    f.write("\n## High Priority Gaps\n\n")
    f.write("| Table | Status | Missing Policies |\n")
    f.write("|-------|--------|------------------|\n")
    
    for table, missing in high_gaps:
        if missing == 'NO_POLICIES':
            f.write(f"| `{table}` | ❌ NO RLS | ALL (SELECT, INSERT, UPDATE, DELETE) |\n")
        else:
            f.write(f"| `{table}` | ⚠️ Incomplete | {', '.join(sorted(missing))} |\n")
    
    f.write("\n## Medium Priority Gaps\n\n")
    f.write("| Table | Status | Missing Policies |\n")
    f.write("|-------|--------|------------------|\n")
    
    for table, missing in medium_gaps:
        if missing == 'NO_POLICIES':
            f.write(f"| `{table}` | ❌ NO RLS | ALL (SELECT, INSERT, UPDATE, DELETE) |\n")
        else:
            f.write(f"| `{table}` | ⚠️ Incomplete | {', '.join(sorted(missing))} |\n")

print(f"✅ Detailed report saved to: {report_path}")
