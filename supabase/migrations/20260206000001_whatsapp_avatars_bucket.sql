-- Issue #180: WhatsApp Avatars Storage Bucket
-- Stores profile pictures permanently to avoid expired CDN URLs (403)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-avatars', 'whatsapp-avatars', true, 1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true, file_size_limit = 1048576,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

-- Public read (avatars displayed in contact cards)
CREATE POLICY "Public read whatsapp-avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-avatars');

-- Service role full access (Edge Function uploads)
CREATE POLICY "Service role manage whatsapp-avatars"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'whatsapp-avatars')
WITH CHECK (bucket_id = 'whatsapp-avatars');
