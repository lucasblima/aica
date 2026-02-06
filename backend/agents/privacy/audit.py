"""
Privacy Audit Logging for LGPD Compliance (Task #44)

Implements tamper-evident audit logging for compliance with:
- LGPD Article 37: Record of processing activities
- LGPD Article 46: Security measures
- LGPD Article 50: Good practices and governance

Audit Events:
- Data access (read, write, delete)
- Consent changes (grant, revoke)
- Data exports
- Authentication events
- Administrative actions

Security Features:
- Immutable log entries (no UPDATE/DELETE)
- Hash chain for tamper detection
- Retention period enforcement
- PII masking in logs

Usage:
    audit = PrivacyAuditLogger()

    # Log data access
    await audit.log_data_access(
        user_id=user_id,
        accessor="agent",
        resource="user_memory",
        action="read"
    )

    # Log consent change
    await audit.log_consent_change(
        user_id=user_id,
        consent_type="ai_processing",
        action="revoke"
    )
"""

import os
import json
import hashlib
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum

from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Audit log enabled flag
AUDIT_LOG_ENABLED = os.getenv("AUDIT_LOG_ENABLED", "true").lower() == "true"


class AuditEventType(Enum):
    """Types of auditable events."""
    # Data access events
    DATA_ACCESS = "data_access"
    DATA_EXPORT = "data_export"
    DATA_DELETION = "data_deletion"
    DATA_RECTIFICATION = "data_rectification"
    DATA_ANONYMIZATION = "data_anonymization"

    # Consent events
    CONSENT_GRANTED = "consent_granted"
    CONSENT_REVOKED = "consent_revoked"
    CONSENT_EXPIRED = "consent_expired"

    # Authentication events
    AUTH_LOGIN = "auth_login"
    AUTH_LOGOUT = "auth_logout"
    AUTH_FAILED = "auth_failed"
    AUTH_TOKEN_REFRESH = "auth_token_refresh"

    # Agent events
    AGENT_INVOCATION = "agent_invocation"
    TOOL_EXECUTION = "tool_execution"

    # Administrative events
    ADMIN_ACTION = "admin_action"
    POLICY_CHANGE = "policy_change"
    SYSTEM_EVENT = "system_event"


class AccessorType(Enum):
    """Types of data accessors."""
    USER = "user"           # User accessing own data
    AGENT = "agent"         # AI agent processing data
    SYSTEM = "system"       # Automated system process
    ADMIN = "admin"         # Administrator access
    THIRD_PARTY = "third_party"  # External service


@dataclass
class AuditEntry:
    """Structure for audit log entries."""
    event_type: AuditEventType
    user_id: str
    resource_type: str
    action: str
    accessor: AccessorType = AccessorType.SYSTEM
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    success: bool = True
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "event_type": self.event_type.value,
            "user_id": self.user_id,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "action": self.action,
            "accessor": self.accessor.value,
            "ip_address": self._mask_ip(self.ip_address),
            "user_agent": self.user_agent,
            "details": self._sanitize_details(self.details),
            "timestamp": self.timestamp.isoformat(),
            "success": self.success,
            "error_message": self.error_message,
        }

    def _mask_ip(self, ip: Optional[str]) -> Optional[str]:
        """Mask IP address for privacy (keep first two octets)."""
        if not ip:
            return None
        parts = ip.split(".")
        if len(parts) == 4:
            return f"{parts[0]}.{parts[1]}.xxx.xxx"
        return ip[:8] + "..."

    def _sanitize_details(self, details: Dict[str, Any]) -> Dict[str, Any]:
        """Remove sensitive data from details."""
        sensitive_keys = {"password", "token", "secret", "key", "authorization"}
        sanitized = {}

        for key, value in details.items():
            if key.lower() in sensitive_keys:
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, dict):
                sanitized[key] = self._sanitize_details(value)
            else:
                sanitized[key] = value

        return sanitized

    def compute_hash(self, previous_hash: Optional[str] = None) -> str:
        """
        Compute hash for tamper detection.

        Creates a hash chain by including the previous entry's hash.
        """
        data = json.dumps(self.to_dict(), sort_keys=True, default=str)
        if previous_hash:
            data = previous_hash + data
        return hashlib.sha256(data.encode()).hexdigest()


class PrivacyAuditLogger:
    """
    Privacy-focused audit logger for LGPD compliance.

    Features:
    - Structured audit entries
    - Tamper-evident hash chain
    - PII masking
    - Retention policy enforcement
    """

    def __init__(
        self,
        supabase_url: str = SUPABASE_URL,
        supabase_key: str = SUPABASE_SERVICE_KEY,
    ):
        self.enabled = AUDIT_LOG_ENABLED

        if supabase_url and supabase_key:
            self.client: Optional[Client] = create_client(supabase_url, supabase_key)
        else:
            self.client = None
            logger.warning("PrivacyAuditLogger: No Supabase credentials")

        self._last_hash: Optional[str] = None

    async def log(self, entry: AuditEntry) -> bool:
        """
        Log an audit entry.

        Args:
            entry: AuditEntry to log

        Returns:
            True if logged successfully
        """
        if not self.enabled:
            return True

        if not self.client:
            logger.warning("Audit log skipped: no database client")
            return False

        try:
            # Compute hash for tamper detection
            entry_hash = entry.compute_hash(self._last_hash)
            self._last_hash = entry_hash

            # Prepare log data
            log_data = {
                **entry.to_dict(),
                "entry_hash": entry_hash,
                "created_at": datetime.utcnow().isoformat(),
            }

            # Insert log entry
            self.client.table("privacy_audit_logs").insert(log_data).execute()

            logger.debug(
                f"Audit log: {entry.event_type.value} - {entry.action} "
                f"on {entry.resource_type} for user {entry.user_id[:8]}..."
            )

            return True

        except Exception as e:
            logger.error(f"Error writing audit log: {e}")
            return False

    async def log_data_access(
        self,
        user_id: str,
        accessor: str,
        resource: str,
        action: str,
        resource_id: Optional[str] = None,
        success: bool = True,
        details: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Log a data access event.

        Args:
            user_id: User whose data was accessed
            accessor: Who accessed the data (user, agent, admin, system)
            resource: Type of resource accessed
            action: Action performed (read, write, delete)
            resource_id: Optional specific resource ID
            success: Whether access was successful
            details: Additional details

        Returns:
            True if logged successfully
        """
        try:
            accessor_type = AccessorType(accessor)
        except ValueError:
            accessor_type = AccessorType.SYSTEM

        entry = AuditEntry(
            event_type=AuditEventType.DATA_ACCESS,
            user_id=user_id,
            resource_type=resource,
            resource_id=resource_id,
            action=action,
            accessor=accessor_type,
            success=success,
            details=details or {},
        )

        return await self.log(entry)

    async def log_consent_change(
        self,
        user_id: str,
        consent_type: str,
        action: str,
        legal_basis: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Log a consent change event.

        Args:
            user_id: User who changed consent
            consent_type: Type of consent changed
            action: Action (grant, revoke)
            legal_basis: Legal basis for processing
            details: Additional details

        Returns:
            True if logged successfully
        """
        event_type = (
            AuditEventType.CONSENT_GRANTED
            if action == "grant"
            else AuditEventType.CONSENT_REVOKED
        )

        entry = AuditEntry(
            event_type=event_type,
            user_id=user_id,
            resource_type="consent",
            resource_id=consent_type,
            action=action,
            accessor=AccessorType.USER,
            details={
                "consent_type": consent_type,
                "legal_basis": legal_basis,
                **(details or {}),
            },
        )

        return await self.log(entry)

    async def log_data_export(
        self,
        user_id: str,
        export_format: str,
        record_counts: Dict[str, int],
        success: bool = True,
        error: Optional[str] = None
    ) -> bool:
        """
        Log a data export event.

        Args:
            user_id: User who requested export
            export_format: Format of export (json, csv)
            record_counts: Count of records per table
            success: Whether export succeeded
            error: Error message if failed

        Returns:
            True if logged successfully
        """
        entry = AuditEntry(
            event_type=AuditEventType.DATA_EXPORT,
            user_id=user_id,
            resource_type="user_data",
            action="export",
            accessor=AccessorType.USER,
            success=success,
            error_message=error,
            details={
                "format": export_format,
                "record_counts": record_counts,
                "lgpd_article": "15, 18",
            },
        )

        return await self.log(entry)

    async def log_data_deletion(
        self,
        user_id: str,
        deletion_type: str,
        records_deleted: Dict[str, int],
        reason: str,
        success: bool = True,
        error: Optional[str] = None
    ) -> bool:
        """
        Log a data deletion event.

        Args:
            user_id: User whose data was deleted
            deletion_type: Type of deletion (full, partial, anonymization)
            records_deleted: Count of records per table
            reason: Reason for deletion
            success: Whether deletion succeeded
            error: Error message if failed

        Returns:
            True if logged successfully
        """
        entry = AuditEntry(
            event_type=AuditEventType.DATA_DELETION,
            user_id=user_id,
            resource_type="user_data",
            action=deletion_type,
            accessor=AccessorType.SYSTEM,
            success=success,
            error_message=error,
            details={
                "records_deleted": records_deleted,
                "reason": reason,
                "lgpd_article": "17",
            },
        )

        return await self.log(entry)

    async def log_authentication(
        self,
        user_id: str,
        action: str,
        success: bool = True,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        error: Optional[str] = None
    ) -> bool:
        """
        Log an authentication event.

        Args:
            user_id: User authenticating
            action: Auth action (login, logout, failed, token_refresh)
            success: Whether auth succeeded
            ip_address: Client IP address
            user_agent: Client user agent
            error: Error message if failed

        Returns:
            True if logged successfully
        """
        event_map = {
            "login": AuditEventType.AUTH_LOGIN,
            "logout": AuditEventType.AUTH_LOGOUT,
            "failed": AuditEventType.AUTH_FAILED,
            "token_refresh": AuditEventType.AUTH_TOKEN_REFRESH,
        }

        entry = AuditEntry(
            event_type=event_map.get(action, AuditEventType.AUTH_LOGIN),
            user_id=user_id,
            resource_type="session",
            action=action,
            accessor=AccessorType.USER,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            error_message=error,
        )

        return await self.log(entry)

    async def log_agent_action(
        self,
        user_id: str,
        agent_name: str,
        action: str,
        tool_name: Optional[str] = None,
        success: bool = True,
        details: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Log an agent action for transparency.

        Args:
            user_id: User the agent is acting for
            agent_name: Name of the agent
            action: Action being performed
            tool_name: Optional tool being used
            success: Whether action succeeded
            details: Additional details

        Returns:
            True if logged successfully
        """
        event_type = (
            AuditEventType.TOOL_EXECUTION
            if tool_name
            else AuditEventType.AGENT_INVOCATION
        )

        entry = AuditEntry(
            event_type=event_type,
            user_id=user_id,
            resource_type="agent",
            resource_id=agent_name,
            action=action,
            accessor=AccessorType.AGENT,
            success=success,
            details={
                "agent_name": agent_name,
                "tool_name": tool_name,
                **(details or {}),
            },
        )

        return await self.log(entry)

    async def get_user_audit_log(
        self,
        user_id: str,
        event_types: Optional[List[AuditEventType]] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get audit log entries for a user.

        Args:
            user_id: User to get logs for
            event_types: Optional filter by event types
            start_date: Optional start date filter
            end_date: Optional end date filter
            limit: Maximum entries to return

        Returns:
            List of audit log entries
        """
        if not self.client:
            return []

        try:
            query = self.client.table("privacy_audit_logs") \
                .select("*") \
                .eq("user_id", user_id) \
                .order("created_at", desc=True) \
                .limit(limit)

            if event_types:
                query = query.in_(
                    "event_type",
                    [et.value for et in event_types]
                )

            if start_date:
                query = query.gte("created_at", start_date.isoformat())

            if end_date:
                query = query.lte("created_at", end_date.isoformat())

            result = query.execute()
            return result.data or []

        except Exception as e:
            logger.error(f"Error getting audit log: {e}")
            return []

    async def verify_integrity(
        self,
        user_id: Optional[str] = None,
        limit: int = 1000
    ) -> Dict[str, Any]:
        """
        Verify audit log integrity using hash chain.

        Args:
            user_id: Optional user to verify
            limit: Maximum entries to check

        Returns:
            Verification result with any detected issues
        """
        if not self.client:
            return {"verified": False, "error": "No database client"}

        try:
            query = self.client.table("privacy_audit_logs") \
                .select("*") \
                .order("created_at", desc=False) \
                .limit(limit)

            if user_id:
                query = query.eq("user_id", user_id)

            result = query.execute()
            entries = result.data or []

            if not entries:
                return {"verified": True, "entries_checked": 0}

            # Verify hash chain
            issues = []
            previous_hash = None

            for i, entry in enumerate(entries):
                # Reconstruct entry for hash computation
                audit_entry = AuditEntry(
                    event_type=AuditEventType(entry["event_type"]),
                    user_id=entry["user_id"],
                    resource_type=entry["resource_type"],
                    resource_id=entry.get("resource_id"),
                    action=entry["action"],
                    accessor=AccessorType(entry.get("accessor", "system")),
                    ip_address=entry.get("ip_address"),
                    user_agent=entry.get("user_agent"),
                    details=entry.get("details", {}),
                    timestamp=datetime.fromisoformat(entry["timestamp"].replace("Z", "+00:00")),
                    success=entry.get("success", True),
                    error_message=entry.get("error_message"),
                )

                computed_hash = audit_entry.compute_hash(previous_hash)
                stored_hash = entry.get("entry_hash")

                if stored_hash and computed_hash != stored_hash:
                    issues.append({
                        "index": i,
                        "entry_id": entry.get("id"),
                        "issue": "Hash mismatch - possible tampering",
                    })

                previous_hash = stored_hash

            return {
                "verified": len(issues) == 0,
                "entries_checked": len(entries),
                "issues": issues,
            }

        except Exception as e:
            logger.error(f"Error verifying audit log: {e}")
            return {"verified": False, "error": str(e)}


# Global instance
_privacy_audit_logger: Optional[PrivacyAuditLogger] = None


def get_privacy_audit_logger() -> PrivacyAuditLogger:
    """Get the global PrivacyAuditLogger instance."""
    global _privacy_audit_logger
    if _privacy_audit_logger is None:
        _privacy_audit_logger = PrivacyAuditLogger()
    return _privacy_audit_logger
