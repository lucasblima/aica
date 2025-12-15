/**
 * PdfPreviewModal - Modal for viewing and managing edital PDF
 * Replaces the redundant EditalDocumentSection in the main view
 * Follows Ceramic UI design principles with progressive disclosure
 */

import React, { useState } from 'react';
import { X, FileText, Download, Eye, Upload, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/services/supabaseClient';
import type { GrantOpportunity } from '../types';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: GrantOpportunity;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
  isOpen,
  onClose,
  opportunity,
  onUpload,
  onDelete
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

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
      console.error('Upload error:', error);
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
      console.error('Delete error:', error);
      alert('Erro ao remover o PDF.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCharCount = (text: string | null | undefined) => {
    if (!text) return '0';
    return text.length.toLocaleString('pt-BR');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#5C554B]/20 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative bg-[#F0EFE9] w-full max-w-lg rounded-[32px] p-8 shadow-2xl"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 ceramic-concave p-2 hover:scale-95 transition-all text-ceramic-text-secondary"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className={`w-16 h-16 ceramic-tray rounded-2xl flex items-center justify-center mb-4 ${hasPdf ? 'text-green-600' : 'text-orange-600'}`}>
              <FileText size={32} />
            </div>
            <h3 className="text-xl font-black text-ceramic-text-primary">
              {hasPdf ? 'Edital Processado' : 'PDF Pendente'}
            </h3>
            <p className="text-sm text-ceramic-text-secondary mt-2">
              {opportunity.title}
            </p>
            <p className="text-xs text-ceramic-text-tertiary">
              {opportunity.funding_agency} - {opportunity.program_name}
            </p>
          </div>

          {/* Content */}
          {hasPdf ? (
            <>
              {/* Status Info */}
              <div className="ceramic-tray rounded-2xl p-4 mb-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-ceramic-text-tertiary uppercase tracking-wide">Status</span>
                  <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    Processado
                  </span>
                </div>
                {opportunity.edital_text_content && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-ceramic-text-tertiary uppercase tracking-wide">Caracteres</span>
                    <span className="text-sm font-bold text-ceramic-text-primary">
                      {formatCharCount(opportunity.edital_text_content)} extraidos
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 mb-4">
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
                      className="ceramic-convex flex items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
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
                className="w-full ceramic-concave p-3 rounded-xl text-red-500 font-bold text-sm hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
              <div className="ceramic-tray rounded-2xl p-6 mb-6 text-center">
                <AlertCircle className="w-8 h-8 text-orange-500 mx-auto mb-3" />
                <p className="text-sm text-ceramic-text-secondary mb-2">
                  Nenhum PDF do edital foi enviado ainda.
                </p>
                <p className="text-xs text-ceramic-text-tertiary">
                  O PDF sera usado como contexto pela IA para gerar respostas mais precisas.
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
                <div className="ceramic-convex p-4 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2">
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PdfPreviewModal;
