/**
 * useMediaUpload Hook
 *
 * React hook para upload de mídia multimodal com estados de loading e erro.
 */

import { useState } from 'react';
import {
  uploadMedia,
  getAssetUrl,
  listModuleAssets,
  deleteAsset,
  UploadMediaParams,
  MediaAsset,
  ModuleType
} from '../services/mediaUploadService';

export function useMediaUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Upload de mídia
   */
  const upload = async (params: UploadMediaParams): Promise<MediaAsset | null> => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simular progresso (Supabase não fornece progresso nativo)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const asset = await uploadMedia(params);

      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        setUploadProgress(0);
      }, 1000);

      return asset;
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload');
      setUploadProgress(0);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Obter URL de um asset
   */
  const getUrl = async (asset: MediaAsset, expiresIn?: number): Promise<string | null> => {
    setError(null);
    try {
      return await getAssetUrl(asset, expiresIn);
    } catch (err: any) {
      setError(err.message || 'Erro ao obter URL');
      return null;
    }
  };

  /**
   * Listar assets de um módulo
   */
  const listAssets = async (
    moduleType: ModuleType,
    moduleId: string
  ): Promise<MediaAsset[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const assets = await listModuleAssets(moduleType, moduleId);
      return assets;
    } catch (err: any) {
      setError(err.message || 'Erro ao listar assets');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Deletar asset
   */
  const deleteMediaAsset = async (assetId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteAsset(assetId);
      return true;
    } catch (err: any) {
      setError(err.message || 'Erro ao deletar asset');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    upload,
    getUrl,
    listAssets,
    deleteMediaAsset,
    isUploading,
    isLoading,
    uploadProgress,
    error
  };
}
