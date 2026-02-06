"""
Data Retention Policies for LGPD Compliance (Task #44)

Implements configurable data retention policies per LGPD requirements:
- Purpose limitation: Data kept only as long as necessary
- Storage limitation: Automatic purging of expired data
- Transparency: Clear retention periods for users

Retention Categories:
- Temporary: 7 days (cache, temp files)
- Short-term: 30 days (sessions, logs)
- Medium-term: 1 year (memories, patterns)
- Long-term: 2 years (audit logs - legal requirement)
- Permanent: Until deletion request (core user data)

Usage:
    retention = RetentionPolicy()

    # Apply all retention policies
    result = await retention.apply_all_policies()

    # Check specific data retention
    days = retention.get_retention_days("user_memory", "pattern")
"""

import os
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


class DataCategory(Enum):
    """Categories of data with different retention requirements."""
    TEMPORARY = "temporary"      # Cache, temp data
    SHORT_TERM = "short_term"    # Sessions, recent logs
    MEDIUM_TERM = "medium_term"  # Memories, patterns
    LONG_TERM = "long_term"      # Audit logs
    PERMANENT = "permanent"      # Core user data


@dataclass
class RetentionPeriod:
    """Retention period configuration."""
    category: DataCategory
    days: int
    description: str
    legal_basis: str

    @property
    def timedelta(self) -> timedelta:
        """Get timedelta for this retention period."""
        return timedelta(days=self.days)


# Default retention periods
DEFAULT_RETENTION_PERIODS = {
    DataCategory.TEMPORARY: RetentionPeriod(
        category=DataCategory.TEMPORARY,
        days=7,
        description="Temporary data (cache, temp files)",
        legal_basis="Purpose limitation - Art. 6, III"
    ),
    DataCategory.SHORT_TERM: RetentionPeriod(
        category=DataCategory.SHORT_TERM,
        days=30,
        description="Short-term data (sessions, recent logs)",
        legal_basis="Purpose limitation - Art. 6, III"
    ),
    DataCategory.MEDIUM_TERM: RetentionPeriod(
        category=DataCategory.MEDIUM_TERM,
        days=365,
        description="Medium-term data (memories, patterns)",
        legal_basis="Legitimate interest - Art. 7, IX"
    ),
    DataCategory.LONG_TERM: RetentionPeriod(
        category=DataCategory.LONG_TERM,
        days=730,  # 2 years
        description="Long-term data (audit logs)",
        legal_basis="Legal obligation - Art. 7, II"
    ),
}

# Table-specific retention configuration
TABLE_RETENTION_CONFIG = {
    "agent_sessions": {
        "category": DataCategory.SHORT_TERM,
        "date_column": "expires_at",
        "use_expiration": True,
    },
    "user_memory": {
        "category": DataCategory.MEDIUM_TERM,
        "date_column": "updated_at",
        "category_column": "category",
        "category_overrides": {
            "temp": DataCategory.TEMPORARY,
            "cache": DataCategory.TEMPORARY,
            "pattern": DataCategory.MEDIUM_TERM,
            "preference": DataCategory.PERMANENT,
            "fact": DataCategory.MEDIUM_TERM,
        },
    },
    "whatsapp_messages": {
        "category": DataCategory.MEDIUM_TERM,
        "date_column": "created_at",
        "soft_delete": True,
        "soft_delete_column": "deleted_at",
    },
    "moments": {
        "category": DataCategory.PERMANENT,
        "date_column": "created_at",
    },
    "daily_reports": {
        "category": DataCategory.MEDIUM_TERM,
        "date_column": "created_at",
    },
    "privacy_audit_logs": {
        "category": DataCategory.LONG_TERM,
        "date_column": "created_at",
        "required_retention": True,  # Cannot be shortened
    },
    "ai_usage_tracking": {
        "category": DataCategory.MEDIUM_TERM,
        "date_column": "created_at",
        "anonymize_after": DataCategory.SHORT_TERM,  # Anonymize after 30 days
    },
}


@dataclass
class RetentionResult:
    """Result of retention policy application."""
    table: str
    records_deleted: int
    records_anonymized: int
    cutoff_date: datetime
    success: bool
    error: Optional[str] = None


class RetentionPolicy:
    """
    Manages data retention policies.

    Implements:
    - Configurable retention periods by data category
    - Automatic purging of expired data
    - Soft deletion support
    - Anonymization as alternative to deletion
    """

    def __init__(
        self,
        supabase_url: str = SUPABASE_URL,
        supabase_key: str = SUPABASE_SERVICE_KEY,
        retention_periods: Optional[Dict[DataCategory, RetentionPeriod]] = None,
    ):
        if supabase_url and supabase_key:
            self.client: Optional[Client] = create_client(supabase_url, supabase_key)
        else:
            self.client = None
            logger.warning("RetentionPolicy: No Supabase credentials")

        self.retention_periods = retention_periods or DEFAULT_RETENTION_PERIODS

    def get_retention_days(
        self,
        table_name: str,
        category: Optional[str] = None
    ) -> int:
        """
        Get retention period in days for a table/category.

        Args:
            table_name: Database table name
            category: Optional category within the table

        Returns:
            Retention period in days
        """
        config = TABLE_RETENTION_CONFIG.get(table_name)
        if not config:
            return self.retention_periods[DataCategory.PERMANENT].days

        # Check for category-specific override
        if category and "category_overrides" in config:
            overrides = config["category_overrides"]
            if category in overrides:
                return self.retention_periods[overrides[category]].days

        # Return table default
        return self.retention_periods[config["category"]].days

    def get_cutoff_date(
        self,
        table_name: str,
        category: Optional[str] = None
    ) -> datetime:
        """
        Get cutoff date for retention (records older than this should be purged).

        Args:
            table_name: Database table name
            category: Optional category within the table

        Returns:
            Cutoff datetime
        """
        days = self.get_retention_days(table_name, category)
        return datetime.utcnow() - timedelta(days=days)

    async def apply_retention_policy(
        self,
        table_name: str,
        dry_run: bool = False
    ) -> RetentionResult:
        """
        Apply retention policy to a specific table.

        Args:
            table_name: Table to process
            dry_run: If True, only count records without deleting

        Returns:
            RetentionResult with operation details
        """
        if not self.client:
            return RetentionResult(
                table=table_name,
                records_deleted=0,
                records_anonymized=0,
                cutoff_date=datetime.utcnow(),
                success=False,
                error="Database client not available"
            )

        config = TABLE_RETENTION_CONFIG.get(table_name)
        if not config:
            return RetentionResult(
                table=table_name,
                records_deleted=0,
                records_anonymized=0,
                cutoff_date=datetime.utcnow(),
                success=False,
                error="No retention config for table"
            )

        # Skip permanent data
        if config["category"] == DataCategory.PERMANENT:
            return RetentionResult(
                table=table_name,
                records_deleted=0,
                records_anonymized=0,
                cutoff_date=datetime.utcnow(),
                success=True,
            )

        cutoff_date = self.get_cutoff_date(table_name)
        date_column = config["date_column"]

        try:
            records_deleted = 0
            records_anonymized = 0

            # Handle tables with category-specific retention
            if "category_overrides" in config:
                for category, data_category in config["category_overrides"].items():
                    if data_category == DataCategory.PERMANENT:
                        continue

                    category_cutoff = datetime.utcnow() - self.retention_periods[data_category].timedelta

                    if dry_run:
                        result = self.client.table(table_name) \
                            .select("id", count="exact") \
                            .eq(config["category_column"], category) \
                            .lt(date_column, category_cutoff.isoformat()) \
                            .execute()
                        records_deleted += result.count if hasattr(result, 'count') else len(result.data or [])
                    else:
                        result = self.client.table(table_name) \
                            .delete() \
                            .eq(config["category_column"], category) \
                            .lt(date_column, category_cutoff.isoformat()) \
                            .execute()
                        records_deleted += len(result.data or [])
            else:
                # Simple date-based retention
                if config.get("use_expiration"):
                    # Use expiration column directly
                    query_filter = ("lt", date_column, datetime.utcnow().isoformat())
                else:
                    query_filter = ("lt", date_column, cutoff_date.isoformat())

                if config.get("soft_delete"):
                    # Soft delete: update deleted_at
                    if dry_run:
                        result = self.client.table(table_name) \
                            .select("id", count="exact") \
                            .lt(date_column, cutoff_date.isoformat()) \
                            .is_(config["soft_delete_column"], "null") \
                            .execute()
                        records_deleted = result.count if hasattr(result, 'count') else len(result.data or [])
                    else:
                        result = self.client.table(table_name) \
                            .update({
                                config["soft_delete_column"]: datetime.utcnow().isoformat(),
                                "deletion_reason": "retention_policy",
                            }) \
                            .lt(date_column, cutoff_date.isoformat()) \
                            .is_(config["soft_delete_column"], "null") \
                            .execute()
                        records_deleted = len(result.data or [])

                elif config.get("anonymize_after"):
                    # Anonymize instead of delete
                    anonymize_cutoff = datetime.utcnow() - self.retention_periods[config["anonymize_after"]].timedelta

                    if dry_run:
                        result = self.client.table(table_name) \
                            .select("id", count="exact") \
                            .lt(date_column, anonymize_cutoff.isoformat()) \
                            .execute()
                        records_anonymized = result.count if hasattr(result, 'count') else len(result.data or [])
                    else:
                        # Anonymize user_id
                        result = self.client.table(table_name) \
                            .update({"user_id": None}) \
                            .lt(date_column, anonymize_cutoff.isoformat()) \
                            .neq("user_id", None) \
                            .execute()
                        records_anonymized = len(result.data or [])

                    # Delete very old anonymized records
                    if not dry_run:
                        result = self.client.table(table_name) \
                            .delete() \
                            .lt(date_column, cutoff_date.isoformat()) \
                            .execute()
                        records_deleted = len(result.data or [])

                else:
                    # Hard delete
                    if dry_run:
                        result = self.client.table(table_name) \
                            .select("id", count="exact") \
                            .lt(date_column, cutoff_date.isoformat()) \
                            .execute()
                        records_deleted = result.count if hasattr(result, 'count') else len(result.data or [])
                    else:
                        result = self.client.table(table_name) \
                            .delete() \
                            .lt(date_column, cutoff_date.isoformat()) \
                            .execute()
                        records_deleted = len(result.data or [])

            if not dry_run and (records_deleted > 0 or records_anonymized > 0):
                logger.info(
                    f"Retention policy applied to {table_name}: "
                    f"{records_deleted} deleted, {records_anonymized} anonymized"
                )

            return RetentionResult(
                table=table_name,
                records_deleted=records_deleted,
                records_anonymized=records_anonymized,
                cutoff_date=cutoff_date,
                success=True,
            )

        except Exception as e:
            logger.error(f"Error applying retention to {table_name}: {e}")
            return RetentionResult(
                table=table_name,
                records_deleted=0,
                records_anonymized=0,
                cutoff_date=cutoff_date,
                success=False,
                error=str(e),
            )

    async def apply_all_policies(
        self,
        dry_run: bool = False
    ) -> List[RetentionResult]:
        """
        Apply retention policies to all configured tables.

        Args:
            dry_run: If True, only count without deleting

        Returns:
            List of RetentionResult for each table
        """
        results = []

        for table_name in TABLE_RETENTION_CONFIG.keys():
            result = await self.apply_retention_policy(table_name, dry_run)
            results.append(result)

        # Log summary
        total_deleted = sum(r.records_deleted for r in results)
        total_anonymized = sum(r.records_anonymized for r in results)

        if not dry_run:
            logger.info(
                f"Retention policies applied: {total_deleted} deleted, "
                f"{total_anonymized} anonymized across {len(results)} tables"
            )

        return results

    def get_retention_summary(self) -> Dict[str, Any]:
        """
        Get summary of all retention policies.

        Returns:
            Dictionary describing all retention configurations
        """
        summary = {
            "periods": {},
            "tables": {},
        }

        # Add period definitions
        for category, period in self.retention_periods.items():
            summary["periods"][category.value] = {
                "days": period.days,
                "description": period.description,
                "legal_basis": period.legal_basis,
            }

        # Add table configurations
        for table_name, config in TABLE_RETENTION_CONFIG.items():
            category = config["category"]
            days = self.get_retention_days(table_name)

            summary["tables"][table_name] = {
                "category": category.value,
                "retention_days": days,
                "date_column": config["date_column"],
                "soft_delete": config.get("soft_delete", False),
            }

        return summary


# Global instance
_retention_policy: Optional[RetentionPolicy] = None


def get_retention_policy() -> RetentionPolicy:
    """Get the global RetentionPolicy instance."""
    global _retention_policy
    if _retention_policy is None:
        _retention_policy = RetentionPolicy()
    return _retention_policy


async def apply_retention_policies(dry_run: bool = False) -> List[RetentionResult]:
    """
    Convenience function to apply all retention policies.

    Args:
        dry_run: If True, only count without deleting

    Returns:
        List of RetentionResult
    """
    policy = get_retention_policy()
    return await policy.apply_all_policies(dry_run)
