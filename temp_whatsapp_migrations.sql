-- ============================================================================
-- WhatsApp Integration Migrations - Issue #12
-- ============================================================================
-- This file consolidates all WhatsApp migrations for manual execution
-- in the Supabase SQL Editor

-- ============================================================================
-- STEP 1: Enable Required Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pgmq;
CREATE EXTENSION IF NOT EXISTS vector;

-- Create PGMQ queues
SELECT pgmq.create('whatsapp_notifications');
SELECT pgmq.create('whatsapp_media_processing');

-- ============================================================================
-- STEP 2: Execute WhatsApp Messages Migration
-- ============================================================================

