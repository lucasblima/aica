#!/bin/bash
# ============================================================================
# Migration Analysis Script - Issue #73 Phase 1
# ============================================================================
# Analyzes all migrations to extract:
# - Tables created
# - RLS policies (SELECT, INSERT, UPDATE, DELETE)
# - Foreign keys with ON DELETE behavior
# ============================================================================

MIGRATIONS_DIR="/c/Users/lucas/repos/Aica_frontend/Aica_frontend/supabase/migrations"
OUTPUT_DIR="/c/Users/lucas/repos/Aica_frontend/Aica_frontend/docs/audit-reports"

mkdir -p "$OUTPUT_DIR"

echo "🔍 Analyzing migrations in: $MIGRATIONS_DIR"
echo "📁 Output will be saved to: $OUTPUT_DIR"
echo ""

# ============================================================================
# Extract all CREATE TABLE statements
# ============================================================================

echo "📊 Step 1: Extracting all tables..."
grep -h "CREATE TABLE" "$MIGRATIONS_DIR"/*.sql | \
  sed 's/CREATE TABLE IF NOT EXISTS //g' | \
  sed 's/CREATE TABLE //g' | \
  sed 's/ (.*//g' | \
  sed 's/public\.//g' | \
  sort -u > "$OUTPUT_DIR/tables_found.txt"

echo "✅ Found $(wc -l < "$OUTPUT_DIR/tables_found.txt") unique tables"
echo ""

# ============================================================================
# Extract all RLS policies by table
# ============================================================================

echo "📊 Step 2: Extracting RLS policies..."
{
  echo "TABLE|POLICY_TYPE|POLICY_NAME|MIGRATION_FILE"
  for migration in "$MIGRATIONS_DIR"/*.sql; do
    filename=$(basename "$migration")

    # Extract CREATE POLICY statements
    grep -A 2 "CREATE POLICY" "$migration" | \
      grep -E "(CREATE POLICY|ON |FOR )" | \
      awk -v file="$filename" '
        /CREATE POLICY/ {
          gsub(/"/, "", $0)
          policy_name = $3
        }
        /ON / {
          table_name = $2
          gsub(/;/, "", table_name)
        }
        /FOR / {
          policy_type = $2
          print table_name "|" policy_type "|" policy_name "|" file
        }
      '
  done
} > "$OUTPUT_DIR/rls_policies_raw.txt"

# Count policies per table
awk -F'|' 'NR>1 {count[$1" "$2]++} END {
  for (key in count) {
    split(key, parts, " ")
    table = parts[1]
    type = parts[2]
    printf "%s|%s|%d\n", table, type, count[key]
  }
}' "$OUTPUT_DIR/rls_policies_raw.txt" | \
  sort > "$OUTPUT_DIR/rls_policy_counts.txt"

echo "✅ Extracted RLS policies"
echo ""

# ============================================================================
# Extract all Foreign Keys with ON DELETE behavior
# ============================================================================

echo "📊 Step 3: Extracting Foreign Keys..."
{
  echo "TABLE|COLUMN|REFERENCES_TABLE|REFERENCES_COLUMN|ON_DELETE|MIGRATION_FILE"
  for migration in "$MIGRATIONS_DIR"/*.sql; do
    filename=$(basename "$migration")

    # Find FK constraints in CREATE TABLE and ALTER TABLE
    grep -E "REFERENCES|ON DELETE" "$migration" | \
      awk -v file="$filename" '
        /REFERENCES/ {
          if (match($0, /REFERENCES ([a-z_]+)\(([a-z_]+)\)/)) {
            ref_table = $0
            sub(/.*REFERENCES /, "", ref_table)
            sub(/\(.*/, "", ref_table)

            ref_col = $0
            sub(/.*REFERENCES [a-z_]+\(/, "", ref_col)
            sub(/\).*/, "", ref_col)
          }

          on_delete = "NO ACTION"
          if (match($0, /ON DELETE (CASCADE|SET NULL|RESTRICT|NO ACTION)/)) {
            on_delete = $0
            sub(/.*ON DELETE /, "", on_delete)
            sub(/[,;].*/, "", on_delete)
          }

          # Extract column name (before REFERENCES)
          col = $0
          sub(/.*[  ]([a-z_]+) UUID.*REFERENCES/, "", col)

          print "unknown|unknown|" ref_table "|" ref_col "|" on_delete "|" file
        }
      '
  done
} > "$OUTPUT_DIR/foreign_keys_raw.txt"

echo "✅ Extracted Foreign Keys"
echo ""

# ============================================================================
# Generate summary report
# ============================================================================

echo "📊 Step 4: Generating summary..."

{
  echo "# RLS and Foreign Key Audit Report"
  echo "**Generated**: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "**Issue**: #73 Phase 1"
  echo ""
  echo "## Summary"
  echo ""
  echo "- **Total Tables**: $(wc -l < "$OUTPUT_DIR/tables_found.txt")"
  echo "- **Total RLS Policies**: $(tail -n +2 "$OUTPUT_DIR/rls_policies_raw.txt" | wc -l)"
  echo "- **Total Foreign Keys**: $(tail -n +2 "$OUTPUT_DIR/foreign_keys_raw.txt" | wc -l)"
  echo ""
  echo "## Tables Found"
  echo ""
  echo "\`\`\`"
  cat "$OUTPUT_DIR/tables_found.txt"
  echo "\`\`\`"
  echo ""
  echo "## RLS Policy Coverage"
  echo ""
  echo "| Table | Policy Type | Count |"
  echo "|-------|-------------|-------|"
  awk -F'|' '{printf "| %s | %s | %s |\n", $1, $2, $3}' "$OUTPUT_DIR/rls_policy_counts.txt"
  echo ""
} > "$OUTPUT_DIR/MIGRATION_ANALYSIS_SUMMARY.md"

echo "✅ Summary generated"
echo ""
echo "📁 Output files:"
echo "  - $OUTPUT_DIR/tables_found.txt"
echo "  - $OUTPUT_DIR/rls_policies_raw.txt"
echo "  - $OUTPUT_DIR/rls_policy_counts.txt"
echo "  - $OUTPUT_DIR/foreign_keys_raw.txt"
echo "  - $OUTPUT_DIR/MIGRATION_ANALYSIS_SUMMARY.md"
echo ""
echo "🎉 Analysis complete!"
