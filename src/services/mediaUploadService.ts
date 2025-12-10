/**
 * Media Upload Service
 *
 * Service para upload de mídia multimodal (imagens, vídeos, áudio) no Aica Life OS.
 * Integra com Supabase Storage e tabela ai_generated_assets.
 */

import { supabase } from './supabaseClient';

export type AssetType = 'document' | 'image' | 'video' | 'audio' | 'transcript' | 'thumbnail' | 'music';
export type SourceType = 'upload' | 'ai_generated' | 'ai_extracted' | 'external_link';
export type ModuleType = 'grants' | 'journey' | 'podcast' | 'finance' | 'atlas';
export type StorageBucket = 'user-media' | 'ai-generated' | 'podcast-recordings' | 'thumbnails' | 'transcriptions';

export interface UploadMediaParams {
  file: File;
  assetType: AssetType;
  moduleType?: ModuleType;
  moduleId?: string;
  metadata?: Record<string, any>;
  generateThumbnail?: boolean;
}

export interface MediaAsset {
  id: string;
  user_id: string;
  asset_type: AssetType;
  source_type: SourceType;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  media_metadata?: Record<string, any>;
  module_type?: ModuleType;
  module_id?: string;
  created_at: string;
}

/**
 * Determina o bucket correto baseado no tipo de asset e source
 */
function getBucketForAsset(assetType: AssetType, sourceType: SourceType): StorageBucket {
  if (sourceType === 'ai_generated') return 'ai-generated';
  if (assetType === 'thumbnail') return 'thumbnails';
  if (assetType === 'transcript') return 'transcriptions';
  if (assetType === 'audio' || assetType === 'video') return 'podcast-recordings';
  return 'user-media';
}

/**
 * Extrai metadata específica do arquivo de mídia
 */
async function extractMediaMetadata(file: File): Promise<Record<string, any>> {
  const metadata: Record<string, any> = {};

  if (file.type.startsWith('image/')) {
    // Para imagens, criar URL temporária e carregar
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = URL.createObjectURL(file);
    });

    metadata.width = img.width;
    metadata.height = img.height;
    metadata.aspect_ratio = `${img.width}:${img.height}`;

    URL.revokeObjectURL(img.src);
  }

  if (file.type.startsWith('video/')) {
    // Para vídeos, criar elemento de vídeo temporário
    const video = await new Promise<HTMLVideoElement>((resolve, reject) => {
      const vid = document.createElement('video');
      vid.preload = 'metadata';
      vid.onloadedmetadata = () => resolve(vid);
      vid.onerror = reject;
      vid.src = URL.createObjectURL(file);
    });

    metadata.duration_seconds = Math.round(video.duration);
    metadata.width = video.videoWidth;
    metadata.height = video.videoHeight;
    metadata.aspect_ratio = `${video.videoWidth}:${video.videoHeight}`;

    URL.revokeObjectURL(video.src);
  }

  if (file.type.startsWith('audio/')) {
    // Para áudio, criar elemento de áudio temporário
    const audio = await new Promise<HTMLAudioElement>((resolve, reject) => {
      const aud = new Audio();
      aud.preload = 'metadata';
      aud.onloadedmetadata = () => resolve(aud);
      aud.onerror = reject;
      aud.src = URL.createObjectURL(file);
    });

    metadata.duration_seconds = Math.round(audio.duration);

    URL.revokeObjectURL(audio.src);
  }

  return metadata;
}

/**
 * Gera thumbnail de uma imagem
 */
async function generateThumbnailFromImage(file: File, maxSize: number = 300): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // Calcular dimensões mantendo aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Desenhar imagem redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // Converter para WebP (melhor compressão)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to generate thumbnail'));
        },
        'image/webp',
        0.8
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload de mídia para Supabase Storage + registro no database
 */
export async function uploadMedia(params: UploadMediaParams): Promise<MediaAsset> {
  const {
    file,
    assetType,
    moduleType,
    moduleId,
    metadata = {},
    generateThumbnail: shouldGenerateThumbnail = false
  } = params;

  try {
    // 1. Obter usuário atual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('Usuário não autenticado');

    // 2. Determinar bucket
    const bucket = getBucketForAsset(assetType, 'upload');

    // 3. Gerar path único
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `${user.id}/${moduleType || 'general'}/${timestamp}_${sanitizedName}`;

    // 4. Upload para Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 5. Extrair metadata do arquivo
    const mediaMetadata = await extractMediaMetadata(file);

    // 6. Criar registro no database
    const { data: asset, error: assetError } = await supabase
      .from('ai_generated_assets')
      .insert({
        user_id: user.id,
        asset_type: assetType,
        source_type: 'upload',
        storage_path: uploadData.path,
        mime_type: file.type,
        file_size_bytes: file.size,
        media_metadata: { ...mediaMetadata, ...metadata },
        module_type: moduleType,
        module_id: moduleId,
        indexing_status: 'not_indexable' // Por padrão, não indexa no File Search
      })
      .select()
      .single();

    if (assetError) throw assetError;

    // 7. Gerar thumbnail se solicitado (para imagens)
    if (shouldGenerateThumbnail && assetType === 'image') {
      try {
        const thumbnailBlob = await generateThumbnailFromImage(file);
        const thumbPath = `${user.id}/${moduleType || 'general'}/${timestamp}_thumb.webp`;

        await supabase.storage
          .from('thumbnails')
          .upload(thumbPath, thumbnailBlob);

        // Criar asset de thumbnail
        await supabase
          .from('ai_generated_assets')
          .insert({
            user_id: user.id,
            asset_type: 'thumbnail',
            source_type: 'ai_extracted',
            storage_path: thumbPath,
            mime_type: 'image/webp',
            file_size_bytes: thumbnailBlob.size,
            parent_asset_id: asset.id,
            module_type: moduleType,
            module_id: moduleId,
            media_metadata: { width: 300, height: 300 }
          });
      } catch (thumbError) {
        console.warn('[MediaUpload] Failed to generate thumbnail:', thumbError);
        // Não falha o upload principal se thumbnail falhar
      }
    }

    console.log('[MediaUpload] Upload successful:', asset);
    return asset;
  } catch (error) {
    console.error('[MediaUpload] Upload failed:', error);
    throw error;
  }
}

/**
 * Obtém URL pública ou assinada de um asset
 */
export async function getAssetUrl(asset: MediaAsset, expiresIn: number = 3600): Promise<string> {
  if (!asset.storage_path) {
    throw new Error('Asset has no storage path');
  }

  const bucket = getBucketForAsset(asset.asset_type, asset.source_type);

  // Se bucket é público (thumbnails), retorna URL pública
  if (bucket === 'thumbnails') {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(asset.storage_path);
    return data.publicUrl;
  }

  // Caso contrário, gera URL assinada
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(asset.storage_path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

/**
 * Lista assets de um módulo específico
 */
export async function listModuleAssets(
  moduleType: ModuleType,
  moduleId: string
): Promise<MediaAsset[]> {
  const { data, error } = await supabase
    .from('ai_generated_assets')
    .select('*')
    .eq('module_type', moduleType)
    .eq('module_id', moduleId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Deleta um asset (do storage e database)
 */
export async function deleteAsset(assetId: string): Promise<void> {
  // 1. Obter asset
  const { data: asset, error: fetchError } = await supabase
    .from('ai_generated_assets')
    .select('*')
    .eq('id', assetId)
    .single();

  if (fetchError) throw fetchError;
  if (!asset) throw new Error('Asset not found');

  // 2. Deletar do storage
  if (asset.storage_path) {
    const bucket = getBucketForAsset(asset.asset_type, asset.source_type);
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .remove([asset.storage_path]);

    if (storageError) {
      console.warn('[MediaUpload] Failed to delete from storage:', storageError);
      // Continua mesmo se falhar no storage
    }
  }

  // 3. Marcar como arquivado no database
  const { error: deleteError } = await supabase
    .from('ai_generated_assets')
    .update({
      is_archived: true,
      archived_at: new Date().toISOString()
    })
    .eq('id', assetId);

  if (deleteError) throw deleteError;
}
