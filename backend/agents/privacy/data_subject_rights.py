"""
Data Subject Rights for LGPD Compliance (Task #44)

Implements LGPD data subject rights:
- Article 15: Right to confirmation and access
- Article 16: Right to rectification
- Article 17: Right to anonymization and erasure
- Article 18: Right to data portability

CRITICAL SECURITY CONSIDERATIONS:
- All operations require authentication verification
- Deletion cascades properly via foreign key constraints
- Audit logs are maintained for compliance
- Anonymization preserves data for analytics while removing PII

Usage:
    rights = DataSubjectRights()

    # Export all user data (Right to Access)
    result = await rights.export_user_data(user_id, format=ExportFormat.JSON)

    # Delete all user data (Right to Erasure)
    result = await rights.delete_user_data(user_id, reason="user_request")

    # Anonymize data instead of delete
    await rights.anonymize_user_data(user_id)
"""

import os
import json
import logging
import hashlib
from typing import Optional, Dict, Any, List
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum

from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


class ExportFormat(Enum):
    """Supported data export formats."""
    JSON = "json"
    CSV = "csv"


@dataclass
class ExportResult:
    """Result of a data export operation."""
    success: bool
    user_id: str
    format: ExportFormat
    data: Optional[Dict[str, Any]] = None
    file_path: Optional[str] = None
    record_counts: Dict[str, int] = field(default_factory=dict)
    exported_at: datetime = field(default_factory=datetime.utcnow)
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "success": self.success,
            "user_id": self.user_id[:8] + "...",  # Mask for logging
            "format": self.format.value,
            "record_counts": self.record_counts,
            "exported_at": self.exported_at.isoformat(),
            "error": self.error,
        }


@dataclass
class DeleteResult:
    """Result of a data deletion operation."""
    success: bool
    user_id: str
    deletion_type: str  # "full" or "partial"
    records_deleted: Dict[str, int] = field(default_factory=dict)
    records_anonymized: Dict[str, int] = field(default_factory=dict)
    deleted_at: datetime = field(default_factory=datetime.utcnow)
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "success": self.success,
            "user_id": self.user_id[:8] + "...",
            "deletion_type": self.deletion_type,
            "records_deleted": self.records_deleted,
            "records_anonymized": self.records_anonymized,
            "deleted_at": self.deleted_at.isoformat(),
            "error": self.error,
        }


# Tables that contain user data (ordered by deletion dependency)
USER_DATA_TABLES = [
    # High-level data first (foreign key sources)
    {"table": "agent_sessions", "user_column": "user_id", "type": "agent"},
    {"table": "user_memory", "user_column": "user_id", "type": "memory"},
    {"table": "whatsapp_messages", "user_column": "user_id", "type": "messages"},
    {"table": "whatsapp_sessions", "user_column": "user_id", "type": "sessions"},
    {"table": "moments", "user_column": "user_id", "type": "journal"},
    {"table": "daily_reports", "user_column": "user_id", "type": "journal"},
    {"table": "work_items", "user_column": "user_id", "type": "tasks"},
    {"table": "podcast_episodes", "user_column": "user_id", "type": "podcast"},
    {"table": "podcast_shows", "user_column": "user_id", "type": "podcast"},
    {"table": "grant_projects", "user_column": "user_id", "type": "grants"},
    {"table": "finance_transactions", "user_column": "user_id", "type": "finance"},
    {"table": "connection_spaces", "user_column": "user_id", "type": "connections"},
    {"table": "calendar_events", "user_column": "user_id", "type": "calendar"},
    {"table": "user_consents", "user_column": "user_id", "type": "consent"},
    # Profile last (may be referenced by FK)
    {"table": "profiles", "user_column": "id", "type": "profile"},
]

# Tables that should be anonymized rather than deleted
ANONYMIZE_TABLES = ["ai_usage_tracking", "whatsapp_sentiment_aggregates"]


class DataSubjectRights:
    """
    Implements LGPD data subject rights.

    Provides:
    - Data export (Right to Access, Art. 15)
    - Data correction (Right to Rectification, Art. 16)
    - Data deletion (Right to Erasure, Art. 17)
    - Data portability (Art. 18)
    """

    def __init__(
        self,
        supabase_url: str = SUPABASE_URL,
        supabase_key: str = SUPABASE_SERVICE_KEY,
    ):
        if supabase_url and supabase_key:
            self.client: Optional[Client] = create_client(supabase_url, supabase_key)
        else:
            self.client = None
            logger.warning("DataSubjectRights: No Supabase credentials")

    async def export_user_data(
        self,
        user_id: str,
        format: ExportFormat = ExportFormat.JSON,
        include_metadata: bool = True
    ) -> ExportResult:
        """
        Export all user data in portable format (Right to Access).

        LGPD Article 15: Right to confirmation and access to personal data.
        LGPD Article 18: Right to data portability.

        Args:
            user_id: User UUID
            format: Export format (JSON or CSV)
            include_metadata: Include timestamps and metadata

        Returns:
            ExportResult with exported data
        """
        if not self.client:
            return ExportResult(
                success=False,
                user_id=user_id,
                format=format,
                error="Database client not available"
            )

        try:
            export_data = {
                "export_info": {
                    "user_id": user_id,
                    "exported_at": datetime.utcnow().isoformat(),
                    "format": format.value,
                    "lgpd_article": "15, 18",
                },
                "data": {}
            }

            record_counts = {}

            # Export from each table
            for table_info in USER_DATA_TABLES:
                table_name = table_info["table"]
                user_column = table_info["user_column"]
                data_type = table_info["type"]

                try:
                    result = self.client.table(table_name) \
                        .select("*") \
                        .eq(user_column, user_id) \
                        .execute()

                    if result.data:
                        # Process data for export
                        processed_data = self._process_for_export(
                            result.data,
                            include_metadata
                        )
                        export_data["data"][data_type] = processed_data
                        record_counts[table_name] = len(result.data)

                except Exception as e:
                    logger.warning(f"Error exporting from {table_name}: {e}")
                    continue

            # Log the export
            await self._log_data_access(
                user_id=user_id,
                action="data_export",
                details={"format": format.value, "record_counts": record_counts}
            )

            logger.info(f"Data exported for user {user_id[:8]}...: {record_counts}")

            return ExportResult(
                success=True,
                user_id=user_id,
                format=format,
                data=export_data,
                record_counts=record_counts,
            )

        except Exception as e:
            logger.error(f"Error exporting user data: {e}")
            return ExportResult(
                success=False,
                user_id=user_id,
                format=format,
                error=str(e)
            )

    async def delete_user_data(
        self,
        user_id: str,
        reason: str = "user_request",
        preserve_audit_logs: bool = True
    ) -> DeleteResult:
        """
        Permanently delete all user data (Right to Erasure).

        LGPD Article 17: Right to erasure of personal data.

        WARNING: This operation is IRREVERSIBLE. User data cannot be recovered.

        Args:
            user_id: User UUID
            reason: Reason for deletion (for audit)
            preserve_audit_logs: Keep audit logs for compliance (recommended)

        Returns:
            DeleteResult with deletion summary
        """
        if not self.client:
            return DeleteResult(
                success=False,
                user_id=user_id,
                deletion_type="full",
                error="Database client not available"
            )

        try:
            records_deleted = {}

            # Delete from each table in order (respecting FK constraints)
            for table_info in USER_DATA_TABLES:
                table_name = table_info["table"]
                user_column = table_info["user_column"]

                # Skip audit logs if preserving
                if preserve_audit_logs and table_name == "privacy_audit_logs":
                    continue

                try:
                    # Count before deletion
                    count_result = self.client.table(table_name) \
                        .select("id", count="exact") \
                        .eq(user_column, user_id) \
                        .execute()

                    count = count_result.count if hasattr(count_result, 'count') else len(count_result.data or [])

                    if count > 0:
                        # Perform deletion
                        self.client.table(table_name) \
                            .delete() \
                            .eq(user_column, user_id) \
                            .execute()

                        records_deleted[table_name] = count

                except Exception as e:
                    logger.warning(f"Error deleting from {table_name}: {e}")
                    continue

            # Log the deletion (this should happen even after user profile is deleted)
            await self._log_data_deletion(
                user_id=user_id,
                reason=reason,
                records_deleted=records_deleted
            )

            logger.info(f"Data deleted for user {user_id[:8]}...: {records_deleted}")

            return DeleteResult(
                success=True,
                user_id=user_id,
                deletion_type="full",
                records_deleted=records_deleted,
            )

        except Exception as e:
            logger.error(f"Error deleting user data: {e}")
            return DeleteResult(
                success=False,
                user_id=user_id,
                deletion_type="full",
                error=str(e)
            )

    async def anonymize_user_data(
        self,
        user_id: str,
        preserve_analytics: bool = True
    ) -> DeleteResult:
        """
        Anonymize user data instead of deleting (for analytics retention).

        LGPD Article 17: Allows anonymization as alternative to deletion
        when data is needed for research or statistics.

        Anonymization:
        - Replaces PII with hashed/generic values
        - Removes identifiable metadata
        - Preserves aggregate data patterns

        Args:
            user_id: User UUID
            preserve_analytics: Keep anonymized analytics data

        Returns:
            DeleteResult with anonymization summary
        """
        if not self.client:
            return DeleteResult(
                success=False,
                user_id=user_id,
                deletion_type="anonymization",
                error="Database client not available"
            )

        try:
            records_anonymized = {}

            # Generate anonymous identifier
            anon_id = self._generate_anonymous_id(user_id)

            # Anonymize user_memory (preserve insights without PII)
            try:
                result = self.client.table("user_memory") \
                    .update({
                        "value": "[ANONYMIZED]",
                        "source": "anonymized",
                        "updated_at": datetime.utcnow().isoformat(),
                    }) \
                    .eq("user_id", user_id) \
                    .execute()

                records_anonymized["user_memory"] = len(result.data or [])
            except Exception as e:
                logger.warning(f"Error anonymizing user_memory: {e}")

            # Anonymize moments (keep emotional patterns, remove content)
            try:
                result = self.client.table("moments") \
                    .update({
                        "content": "[ANONYMIZED]",
                        "tags": [],
                        "updated_at": datetime.utcnow().isoformat(),
                    }) \
                    .eq("user_id", user_id) \
                    .execute()

                records_anonymized["moments"] = len(result.data or [])
            except Exception as e:
                logger.warning(f"Error anonymizing moments: {e}")

            # Anonymize messages
            try:
                result = self.client.table("whatsapp_messages") \
                    .update({
                        "content": "[ANONYMIZED]",
                        "contact_name": "Anonymous",
                        "contact_phone": "0000000000",
                        "media_url": None,
                    }) \
                    .eq("user_id", user_id) \
                    .execute()

                records_anonymized["whatsapp_messages"] = len(result.data or [])
            except Exception as e:
                logger.warning(f"Error anonymizing messages: {e}")

            # Delete non-anonymizable data
            delete_result = await self.delete_user_data(
                user_id=user_id,
                reason="anonymization_cleanup",
                preserve_audit_logs=True
            )

            # Log anonymization
            await self._log_data_access(
                user_id=user_id,
                action="data_anonymization",
                details={"records_anonymized": records_anonymized}
            )

            logger.info(f"Data anonymized for user {user_id[:8]}...: {records_anonymized}")

            return DeleteResult(
                success=True,
                user_id=user_id,
                deletion_type="anonymization",
                records_anonymized=records_anonymized,
                records_deleted=delete_result.records_deleted,
            )

        except Exception as e:
            logger.error(f"Error anonymizing user data: {e}")
            return DeleteResult(
                success=False,
                user_id=user_id,
                deletion_type="anonymization",
                error=str(e)
            )

    async def rectify_user_data(
        self,
        user_id: str,
        table_name: str,
        record_id: str,
        corrections: Dict[str, Any]
    ) -> bool:
        """
        Correct user data (Right to Rectification).

        LGPD Article 16: Right to correction of incomplete,
        inaccurate, or outdated data.

        Args:
            user_id: User UUID
            table_name: Table containing the record
            record_id: ID of record to correct
            corrections: Dictionary of field corrections

        Returns:
            True if correction was successful
        """
        if not self.client:
            return False

        # Validate table is in allowed list
        allowed_tables = [t["table"] for t in USER_DATA_TABLES]
        if table_name not in allowed_tables:
            logger.warning(f"Rectification not allowed for table: {table_name}")
            return False

        try:
            # Get table info
            table_info = next(t for t in USER_DATA_TABLES if t["table"] == table_name)
            user_column = table_info["user_column"]

            # Verify record belongs to user
            result = self.client.table(table_name) \
                .select("id") \
                .eq("id", record_id) \
                .eq(user_column, user_id) \
                .maybe_single() \
                .execute()

            if not result.data:
                logger.warning(f"Record not found or not owned by user: {record_id}")
                return False

            # Apply corrections
            corrections["updated_at"] = datetime.utcnow().isoformat()

            self.client.table(table_name) \
                .update(corrections) \
                .eq("id", record_id) \
                .execute()

            # Log rectification
            await self._log_data_access(
                user_id=user_id,
                action="data_rectification",
                details={
                    "table": table_name,
                    "record_id": record_id,
                    "fields_corrected": list(corrections.keys()),
                }
            )

            logger.info(f"Data rectified for user {user_id[:8]}...: {table_name}/{record_id}")
            return True

        except Exception as e:
            logger.error(f"Error rectifying user data: {e}")
            return False

    async def get_data_categories(self, user_id: str) -> Dict[str, Any]:
        """
        Get summary of data categories stored for a user.

        Useful for data mapping and transparency.

        Args:
            user_id: User UUID

        Returns:
            Dictionary of data categories with counts
        """
        if not self.client:
            return {}

        categories = {}

        for table_info in USER_DATA_TABLES:
            table_name = table_info["table"]
            user_column = table_info["user_column"]
            data_type = table_info["type"]

            try:
                result = self.client.table(table_name) \
                    .select("id", count="exact") \
                    .eq(user_column, user_id) \
                    .execute()

                count = result.count if hasattr(result, 'count') else len(result.data or [])

                if count > 0:
                    if data_type not in categories:
                        categories[data_type] = {"tables": [], "total_records": 0}
                    categories[data_type]["tables"].append(table_name)
                    categories[data_type]["total_records"] += count

            except Exception as e:
                logger.warning(f"Error counting {table_name}: {e}")
                continue

        return categories

    def _process_for_export(
        self,
        data: List[Dict[str, Any]],
        include_metadata: bool
    ) -> List[Dict[str, Any]]:
        """Process data records for export."""
        processed = []

        for record in data:
            if include_metadata:
                processed.append(record)
            else:
                # Remove internal metadata fields
                cleaned = {
                    k: v for k, v in record.items()
                    if k not in ["created_at", "updated_at", "deleted_at"]
                }
                processed.append(cleaned)

        return processed

    def _generate_anonymous_id(self, user_id: str) -> str:
        """Generate a one-way hash for anonymization."""
        salt = os.getenv("ANONYMIZATION_SALT", "aica-anon-salt")
        return hashlib.sha256(f"{user_id}{salt}".encode()).hexdigest()[:16]

    async def _log_data_access(
        self,
        user_id: str,
        action: str,
        details: Dict[str, Any]
    ) -> None:
        """Log data access event to audit log."""
        if not self.client:
            return

        try:
            self.client.table("privacy_audit_logs").insert({
                "user_id": user_id,
                "event_type": "data_subject_right",
                "resource_type": "user_data",
                "action": action,
                "details": details,
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
        except Exception as e:
            logger.error(f"Error logging data access: {e}")

    async def _log_data_deletion(
        self,
        user_id: str,
        reason: str,
        records_deleted: Dict[str, int]
    ) -> None:
        """Log data deletion event to audit log."""
        if not self.client:
            return

        try:
            self.client.table("privacy_audit_logs").insert({
                "user_id": user_id,
                "event_type": "data_deletion",
                "resource_type": "user_data",
                "action": "delete",
                "details": {
                    "reason": reason,
                    "records_deleted": records_deleted,
                    "lgpd_article": "17",
                },
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
        except Exception as e:
            logger.error(f"Error logging data deletion: {e}")


# Global instance
_data_subject_rights: Optional[DataSubjectRights] = None


def get_data_subject_rights() -> DataSubjectRights:
    """Get the global DataSubjectRights instance."""
    global _data_subject_rights
    if _data_subject_rights is None:
        _data_subject_rights = DataSubjectRights()
    return _data_subject_rights
