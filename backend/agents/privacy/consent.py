"""
Consent Management for LGPD Compliance (Task #44)

Implements consent tracking per LGPD Article 8 requirements:
- Purpose-specific consent
- Consent versioning for policy changes
- Easy revocation mechanism
- Audit trail of consent changes

Consent Purposes:
- data_collection: Basic data collection for service
- ai_processing: Processing data with AI agents
- analytics: Usage analytics and improvements
- personalization: Personalized recommendations
- notifications: Push and email notifications
- third_party: Sharing with third parties

Usage:
    consent = ConsentManager()

    # Check consent
    if await consent.check_consent(user_id, "ai_processing"):
        # Process with AI
        pass

    # Grant consent
    await consent.grant_consent(user_id, ["ai_processing", "analytics"])

    # Revoke consent
    await consent.revoke_consent(user_id, ["analytics"])
"""

import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum

from supabase import create_client, Client

logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# Current consent policy version
CONSENT_POLICY_VERSION = "2.0"


class ConsentPurpose(Enum):
    """Valid consent purposes per LGPD."""
    DATA_COLLECTION = "data_collection"
    AI_PROCESSING = "ai_processing"
    ANALYTICS = "analytics"
    PERSONALIZATION = "personalization"
    NOTIFICATIONS = "notifications"
    THIRD_PARTY = "third_party"
    DATA_RETENTION = "data_retention"
    SENTIMENT_ANALYSIS = "sentiment_analysis"


class ConsentStatus(Enum):
    """Consent status values."""
    GRANTED = "granted"
    REVOKED = "revoked"
    PENDING = "pending"
    EXPIRED = "expired"


class LegalBasis(Enum):
    """LGPD Article 7 legal bases for processing."""
    CONSENT = "consent"  # Art. 7, I
    LEGAL_OBLIGATION = "legal_obligation"  # Art. 7, II
    PUBLIC_POLICY = "public_policy"  # Art. 7, III
    RESEARCH = "research"  # Art. 7, IV
    CONTRACT = "contract"  # Art. 7, V
    LEGAL_PROCESS = "legal_process"  # Art. 7, VI
    LIFE_PROTECTION = "life_protection"  # Art. 7, VII
    HEALTH_PROTECTION = "health_protection"  # Art. 7, VIII
    LEGITIMATE_INTEREST = "legitimate_interest"  # Art. 7, IX
    CREDIT_PROTECTION = "credit_protection"  # Art. 7, X


@dataclass
class ConsentRecord:
    """Record of user consent for a specific purpose."""
    user_id: str
    purpose: ConsentPurpose
    status: ConsentStatus
    legal_basis: LegalBasis
    granted_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    policy_version: str = CONSENT_POLICY_VERSION
    consent_method: str = "web_form"
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def is_valid(self) -> bool:
        """Check if consent is currently valid."""
        if self.status != ConsentStatus.GRANTED:
            return False
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return False
        return True

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "user_id": self.user_id,
            "purpose": self.purpose.value,
            "status": self.status.value,
            "legal_basis": self.legal_basis.value,
            "granted_at": self.granted_at.isoformat() if self.granted_at else None,
            "revoked_at": self.revoked_at.isoformat() if self.revoked_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "policy_version": self.policy_version,
            "consent_method": self.consent_method,
            "metadata": self.metadata,
        }


class ConsentManager:
    """
    Manages user consent for data processing.

    Implements LGPD Article 8 requirements:
    - Consent must be free, informed, and unambiguous
    - Purpose must be specific and explicit
    - Consent can be revoked at any time
    - Evidence of consent must be maintained
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
            logger.warning("ConsentManager: No Supabase credentials")

    async def check_consent(
        self,
        user_id: str,
        purpose: str,
        require_current_version: bool = False
    ) -> bool:
        """
        Check if user has consented to specific purpose.

        Args:
            user_id: User UUID
            purpose: Processing purpose to check
            require_current_version: If True, require consent to current policy version

        Returns:
            True if valid consent exists
        """
        if not self.client:
            logger.warning("ConsentManager: No client, allowing by default")
            return True

        try:
            # Query consent records
            query = self.client.table("user_consents") \
                .select("status, expires_at, policy_version") \
                .eq("user_id", user_id) \
                .eq("purpose", purpose)

            if require_current_version:
                query = query.eq("policy_version", CONSENT_POLICY_VERSION)

            result = query.maybe_single().execute()

            if not result.data:
                return False

            record = result.data

            # Check status
            if record.get("status") != "granted":
                return False

            # Check expiration
            expires_at = record.get("expires_at")
            if expires_at:
                expires_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                if datetime.utcnow() > expires_dt:
                    return False

            return True

        except Exception as e:
            logger.error(f"Error checking consent: {e}")
            return False

    async def get_user_consents(self, user_id: str) -> List[ConsentRecord]:
        """
        Get all consent records for a user.

        Args:
            user_id: User UUID

        Returns:
            List of ConsentRecord objects
        """
        if not self.client:
            return []

        try:
            result = self.client.table("user_consents") \
                .select("*") \
                .eq("user_id", user_id) \
                .execute()

            records = []
            for row in result.data or []:
                records.append(ConsentRecord(
                    user_id=row["user_id"],
                    purpose=ConsentPurpose(row["purpose"]),
                    status=ConsentStatus(row["status"]),
                    legal_basis=LegalBasis(row.get("legal_basis", "consent")),
                    granted_at=datetime.fromisoformat(row["granted_at"].replace("Z", "+00:00")) if row.get("granted_at") else None,
                    revoked_at=datetime.fromisoformat(row["revoked_at"].replace("Z", "+00:00")) if row.get("revoked_at") else None,
                    expires_at=datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00")) if row.get("expires_at") else None,
                    policy_version=row.get("policy_version", "1.0"),
                    consent_method=row.get("consent_method", "unknown"),
                    metadata=row.get("metadata", {}),
                ))

            return records

        except Exception as e:
            logger.error(f"Error getting user consents: {e}")
            return []

    async def grant_consent(
        self,
        user_id: str,
        purposes: List[str],
        legal_basis: LegalBasis = LegalBasis.CONSENT,
        consent_method: str = "web_form",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        expires_in_days: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Record user consent for specified purposes.

        Args:
            user_id: User UUID
            purposes: List of purpose strings
            legal_basis: Legal basis for processing
            consent_method: How consent was obtained
            ip_address: User IP address
            user_agent: User agent string
            expires_in_days: Optional expiration in days
            metadata: Additional metadata

        Returns:
            True if consent was recorded successfully
        """
        if not self.client:
            return False

        now = datetime.utcnow()
        expires_at = None
        if expires_in_days:
            from datetime import timedelta
            expires_at = now + timedelta(days=expires_in_days)

        try:
            for purpose in purposes:
                # Validate purpose
                try:
                    ConsentPurpose(purpose)
                except ValueError:
                    logger.warning(f"Invalid consent purpose: {purpose}")
                    continue

                consent_data = {
                    "user_id": user_id,
                    "purpose": purpose,
                    "status": "granted",
                    "legal_basis": legal_basis.value,
                    "granted_at": now.isoformat(),
                    "revoked_at": None,
                    "expires_at": expires_at.isoformat() if expires_at else None,
                    "policy_version": CONSENT_POLICY_VERSION,
                    "consent_method": consent_method,
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                    "metadata": metadata or {},
                    "updated_at": now.isoformat(),
                }

                # Upsert consent record
                self.client.table("user_consents") \
                    .upsert(consent_data, on_conflict="user_id,purpose") \
                    .execute()

            # Log consent grant
            await self._log_consent_event(
                user_id=user_id,
                event_type="consent_granted",
                purposes=purposes,
                legal_basis=legal_basis.value,
            )

            logger.info(f"Consent granted for user {user_id[:8]}...: {purposes}")
            return True

        except Exception as e:
            logger.error(f"Error granting consent: {e}")
            return False

    async def revoke_consent(
        self,
        user_id: str,
        purposes: List[str],
        reason: Optional[str] = None
    ) -> bool:
        """
        Revoke user consent for specified purposes.

        Args:
            user_id: User UUID
            purposes: List of purpose strings to revoke
            reason: Optional revocation reason

        Returns:
            True if consent was revoked successfully
        """
        if not self.client:
            return False

        now = datetime.utcnow()

        try:
            for purpose in purposes:
                self.client.table("user_consents") \
                    .update({
                        "status": "revoked",
                        "revoked_at": now.isoformat(),
                        "updated_at": now.isoformat(),
                        "metadata": {"revocation_reason": reason} if reason else {},
                    }) \
                    .eq("user_id", user_id) \
                    .eq("purpose", purpose) \
                    .execute()

            # Log consent revocation
            await self._log_consent_event(
                user_id=user_id,
                event_type="consent_revoked",
                purposes=purposes,
                metadata={"reason": reason} if reason else {},
            )

            logger.info(f"Consent revoked for user {user_id[:8]}...: {purposes}")
            return True

        except Exception as e:
            logger.error(f"Error revoking consent: {e}")
            return False

    async def revoke_all_consent(
        self,
        user_id: str,
        reason: Optional[str] = None
    ) -> bool:
        """
        Revoke all consent for a user (right to withdraw).

        Args:
            user_id: User UUID
            reason: Optional revocation reason

        Returns:
            True if all consent was revoked
        """
        if not self.client:
            return False

        now = datetime.utcnow()

        try:
            self.client.table("user_consents") \
                .update({
                    "status": "revoked",
                    "revoked_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }) \
                .eq("user_id", user_id) \
                .eq("status", "granted") \
                .execute()

            # Log full revocation
            await self._log_consent_event(
                user_id=user_id,
                event_type="all_consent_revoked",
                purposes=["all"],
                metadata={"reason": reason} if reason else {},
            )

            logger.info(f"All consent revoked for user {user_id[:8]}...")
            return True

        except Exception as e:
            logger.error(f"Error revoking all consent: {e}")
            return False

    async def get_consent_status_summary(self, user_id: str) -> Dict[str, Any]:
        """
        Get a summary of consent status for a user.

        Args:
            user_id: User UUID

        Returns:
            Dictionary with consent status for each purpose
        """
        records = await self.get_user_consents(user_id)

        summary = {
            "user_id": user_id,
            "policy_version": CONSENT_POLICY_VERSION,
            "consents": {},
            "last_updated": None,
        }

        for record in records:
            summary["consents"][record.purpose.value] = {
                "status": record.status.value,
                "granted_at": record.granted_at.isoformat() if record.granted_at else None,
                "is_valid": record.is_valid(),
            }
            if record.granted_at:
                if not summary["last_updated"] or record.granted_at > datetime.fromisoformat(summary["last_updated"]):
                    summary["last_updated"] = record.granted_at.isoformat()

        return summary

    async def requires_consent_update(self, user_id: str) -> bool:
        """
        Check if user needs to update consent for new policy version.

        Args:
            user_id: User UUID

        Returns:
            True if consent update is required
        """
        if not self.client:
            return False

        try:
            result = self.client.table("user_consents") \
                .select("policy_version") \
                .eq("user_id", user_id) \
                .eq("status", "granted") \
                .limit(1) \
                .execute()

            if not result.data:
                return True  # No consent, needs to grant

            # Check if any consent is for old policy version
            for row in result.data:
                if row.get("policy_version") != CONSENT_POLICY_VERSION:
                    return True

            return False

        except Exception as e:
            logger.error(f"Error checking consent update: {e}")
            return False

    async def _log_consent_event(
        self,
        user_id: str,
        event_type: str,
        purposes: List[str],
        legal_basis: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Log consent event to audit log."""
        if not self.client:
            return

        try:
            self.client.table("privacy_audit_logs").insert({
                "user_id": user_id,
                "event_type": event_type,
                "resource_type": "consent",
                "action": event_type,
                "details": {
                    "purposes": purposes,
                    "legal_basis": legal_basis,
                    **(metadata or {}),
                },
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
        except Exception as e:
            logger.error(f"Error logging consent event: {e}")


# Global consent manager instance
_consent_manager: Optional[ConsentManager] = None


def get_consent_manager() -> ConsentManager:
    """Get the global consent manager instance."""
    global _consent_manager
    if _consent_manager is None:
        _consent_manager = ConsentManager()
    return _consent_manager
