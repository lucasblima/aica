"""
AICA Life OS - Privacy Module (Task #44)

Comprehensive LGPD/GDPR compliance implementation for the agent system.

Features:
- Consent management with purpose-specific tracking
- Data subject rights (access, rectification, erasure, portability)
- Configurable data retention policies with automatic purging
- Tamper-evident audit logging for compliance

LGPD Articles Implemented:
- Article 7: Lawful bases for processing
- Article 8: Consent requirements
- Article 15: Right to confirmation and access
- Article 16: Right to rectification
- Article 17: Right to anonymization and erasure
- Article 18: Data portability
- Article 37: Record of processing activities

Usage:
    from agents.privacy import (
        ConsentManager,
        DataSubjectRights,
        RetentionPolicy,
        AuditLogger,
    )

    # Check consent before processing
    consent_mgr = ConsentManager()
    if await consent_mgr.check_consent(user_id, "ai_processing"):
        # Process data
        pass

    # Export user data
    rights = DataSubjectRights()
    data = await rights.export_user_data(user_id)

References:
- LGPD (Lei Geral de Protecao de Dados): Lei 13.709/2018
- GDPR (General Data Protection Regulation): EU 2016/679
- Task #44: Observability, A2A Communication, and LGPD Compliance
"""

from .consent import (
    ConsentManager,
    ConsentPurpose,
    ConsentStatus,
    ConsentRecord,
    get_consent_manager,
)
from .data_subject_rights import (
    DataSubjectRights,
    ExportFormat,
    ExportResult,
    DeleteResult,
    get_data_subject_rights,
)
from .retention import (
    RetentionPolicy,
    RetentionPeriod,
    DataCategory,
    get_retention_policy,
    apply_retention_policies,
)
from .audit import (
    PrivacyAuditLogger,
    AuditEventType,
    AuditEntry,
    get_privacy_audit_logger,
)

__all__ = [
    # Consent Management
    "ConsentManager",
    "ConsentPurpose",
    "ConsentStatus",
    "ConsentRecord",
    "get_consent_manager",
    # Data Subject Rights
    "DataSubjectRights",
    "ExportFormat",
    "ExportResult",
    "DeleteResult",
    "get_data_subject_rights",
    # Retention Policies
    "RetentionPolicy",
    "RetentionPeriod",
    "DataCategory",
    "get_retention_policy",
    "apply_retention_policies",
    # Audit Logging
    "PrivacyAuditLogger",
    "AuditEventType",
    "AuditEntry",
    "get_privacy_audit_logger",
]


async def check_consent_middleware(user_id: str, purpose: str) -> bool:
    """
    Middleware function to check consent before processing.

    Args:
        user_id: User UUID
        purpose: Processing purpose to check

    Returns:
        True if consent is granted, False otherwise
    """
    consent_mgr = get_consent_manager()
    return await consent_mgr.check_consent(user_id, purpose)
