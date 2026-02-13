/**
 * PdfPreviewDrawer - Drawer for viewing and managing edital PDF
 * Replaces the redundant EditalDocumentSection in the main view
 * Follows Ceramic UI design principles with progressive disclosure
 *
 * Desktop: 700px width slide-in from right
 * Mobile: Full-height slide-in from bottom
 */

import React, { useState } from 'react';
import { X, FileText, Download, Eye, Upload, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence, PanInfo, useMotionValue } from 'framer-motion';
import { supabase } from '@/services/supabaseClient';
import type { GrantOpportunity } from '../types';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('PdfPreviewDrawer');

interface PdfPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: GrantOpportunity;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
}

export const PdfPreviewDrawer: React.FC<PdfPreviewDrawerProps> = ({
  isOpen,
  onClose,
  opportunity,
  onUpload,
  onDelete
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Swipe to dismiss (mobile)
  const y = useMotionValue(0);

  const hasPdf = !!opportunity.edital_pdf_path;

  const getPdfUrl = () => {
    if (!opportunity.edital_pdf_path) return null;
    const { data } = supabase.storage
      .from('editais')
      .getPublicUrl(opportunity.edital_pdf_path);
    return data?.publicUrl || null;
  };

  const pdfUrl = getPdfUrl();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Apenas arquivos PDF sao aceitos.');
      return;
    }

    try {
      setIsUploading(true);
      await onUpload(file);
    } catch (error) {
      log.error('Upload error:', error);
      alert('Erro ao fazer upload do PDF.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Remover o PDF do edital? Esta acao nao pode ser desfeita.')) return;

    try {
      setIsDeleting(true);
      await onDelete();
      onClose();
    } catch (error) {
      log.error('Delete error:', error);
      alert('Erro ao remover o PDF.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCharCount = (text: string | null | undefined) => {
    if (!text) return '0';
    return text.length.toLocaleString('pt-BR');
  };

  const handleCloseClick = () => {
    onClose();
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Close drawer if dragged down >150px on mobile
    if (info.offset.y > 150) {
      handleCloseClick();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={handleCloseClick}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ y }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[700px] bg-ceramic-base shadow-2xl flex flex-col sm:rounded-l-2xl overflow-hidden"
          >
            {/* Mobile drag handle */}
            <div className="sm:hidden flex justify-center py-2 bg-ceramic-base border-b border-ceramic-text-secondary/10">
              <div className="w-12 h-1 rounded-full bg-ceramic-text-secondary/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-ceramic-text-secondary/10">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ceramic-tray rounded-2xl flex items-center justify-center ${hasPdf ? 'text-ceramic-success' : 'text-ceramic-warning'}`}>
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-ceramic-text-primary">
                    {hasPdf ? 'Edital Processado' : 'PDF Pendente'}
                  </h3>
                  <p className="text-sm text-ceramic-text-secondary">
                    {opportunity.title}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseClick}
                className="p-2 hover:bg-white/30 rounded-lg transition-colors text-ceramic-text-secondary"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content (scrollable) */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Agency Info */}
                <div className="ceramic-tray rounded-2xl p-4">
                  <p className="text-xs text-ceramic-text-tertiary mb-1">Agência</p>
                  <p className="text-sm font-bold text-ceramic-text-primary">
                    {opportunity.funding_agency}
                    {opportunity.program_name && ` - ${opportunity.program_name}`}
                  </p>
                </div>

                {hasPdf ? (
                  <>
                    {/* Status Info */}
                    <div className="ceramic-tray rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-ceramic-text-tertiary uppercase tracking-wide">Status</span>
                        <span className="text-xs font-bold text-ceramic-success bg-ceramic-success-bg px-2 py-1 rounded-full">
                          Processado
                        </span>
                      </div>
                      {opportunity.edital_text_content && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-ceramic-text-tertiary uppercase tracking-wide">Caracteres</span>
                          <span className="text-sm font-bold text-ceramic-text-primary">
                            {formatCharCount(opportunity.edital_text_content)} extraídos
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                      {pdfUrl && (
                        <>
                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ceramic-concave flex items-center justify-center gap-2 p-4 rounded-xl text-ceramic-text-primary font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all"
                          >
                            <Eye size={16} /> Visualizar
                          </a>
                          <a
                            href={pdfUrl}
                            download
                            className="ceramic-convex flex items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-ceramic-success to-ceramic-success/90 text-white font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                          >
                            <Download size={16} /> Baixar PDF
                          </a>
                        </>
                      )}
                    </div>

                    {/* Delete Option */}
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="w-full ceramic-concave p-3 rounded-xl text-ceramic-error font-bold text-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      Remover PDF
                    </button>
                  </>
                ) : (
                  <>
                    {/* No PDF State */}
                    <div className="ceramic-tray rounded-2xl p-6 text-center">
                      <AlertCircle className="w-8 h-8 text-ceramic-warning mx-auto mb-3" />
                      <p className="text-sm text-ceramic-text-secondary mb-2">
                        Nenhum PDF do edital foi enviado ainda.
                      </p>
                      <p className="text-xs text-ceramic-text-tertiary">
                        O PDF será usado como contexto pela IA para gerar respostas mais precisas.
                      </p>
                    </div>

                    {/* Upload Button */}
                    <label className="block">
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        disabled={isUploading}
                        className="hidden"
                      />
                      <div className="ceramic-convex p-4 rounded-xl bg-gradient-to-r from-ceramic-success to-ceramic-success/90 text-white font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2">
                        {isUploading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Upload size={16} />
                            Enviar PDF do Edital
                          </>
                        )}
                      </div>
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Footer (fixed) */}
            <div className="p-6 border-t border-ceramic-text-secondary/10">
              <button
                onClick={handleCloseClick}
                className="w-full py-3 px-6 rounded-xl font-bold text-ceramic-text-secondary hover:bg-black/5 transition-colors"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PdfPreviewDrawer;
