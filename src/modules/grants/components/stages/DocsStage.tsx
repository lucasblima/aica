/**
 * DocsStage - Stage 4: Required Documents Checklist
 * Manage document requirements extracted from the edital PDF
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  FileCheck,
  Sparkles,
  Plus,
  Loader2,
  Upload,
  Check,
  Square,
  AlertCircle,
  Trash2,
  CheckSquare,
  Edit3,
  X,
  FileText,
  Download,
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { StageDependencyHint } from '../shared/StageDependencyHint';
import type { RequiredDocument } from '../../types/workspace';
import { uploadProjectDocument } from '../../services/projectDocumentService';

import { createNamespacedLogger } from '@/lib/logger';

const log = createNamespacedLogger('Docsstage');

// Unique ID generator
const generateId = () => `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const DocsStage: React.FC = () => {
  const { state, dispatch, actions } = useWorkspace();
  const { documents, pdfUpload, projectId } = state;
  const [isExtracting, setIsExtracting] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState<Set<string>>(new Set());

  const hasPdfContent = pdfUpload.textContent && pdfUpload.textContent.length > 0;
  const hasDocs = documents.requiredDocs.length > 0;
  const checkedCount = documents.requiredDocs.filter(
    (d) => d.status === 'available' || d.status === 'uploaded'
  ).length;
  const totalDocs = documents.requiredDocs.length;
  const progressPercent = totalDocs > 0 ? Math.round((checkedCount / totalDocs) * 100) : 0;

  /**
   * Extract required documents from PDF using AI
   */
  const handleExtractDocs = async () => {
    if (!hasPdfContent) {
      alert('Faca upload do PDF do edital primeiro.');
      return;
    }

    setIsExtracting(true);

    try {
      // Import AI service for document extraction
      const { extractRequiredDocuments } = await import('../../services/briefingAIService');

      const extractedDocs = await extractRequiredDocuments(pdfUpload.textContent!);

      const requiredDocs: RequiredDocument[] = extractedDocs.map((doc) => ({
        id: generateId(),
        name: doc.name,
        description: doc.description,
        status: 'required',
        dueDate: doc.dueDate,
      }));

      dispatch({ type: 'SET_REQUIRED_DOCS', payload: requiredDocs });
    } catch (error) {
      log.error('Extract error:', error);
      alert('Erro ao extrair documentos. Adicione manualmente.');
    } finally {
      setIsExtracting(false);
    }
  };

  /**
   * Add a new document manually
   */
  const handleAddDocument = () => {
    if (!newDocName.trim()) return;

    const newDoc: RequiredDocument = {
      id: generateId(),
      name: newDocName.trim(),
      status: 'required',
    };

    dispatch({
      type: 'SET_REQUIRED_DOCS',
      payload: [...documents.requiredDocs, newDoc],
    });

    setNewDocName('');
    setShowAddForm(false);
  };

  /**
   * Toggle document status
   */
  const handleToggleDoc = (docId: string) => {
    actions.toggleDocumentStatus(docId);
  };

  /**
   * Remove a document
   */
  const handleRemoveDoc = (docId: string) => {
    const confirmed = confirm('Remover este documento da lista?');
    if (!confirmed) return;

    dispatch({
      type: 'SET_REQUIRED_DOCS',
      payload: documents.requiredDocs.filter((d) => d.id !== docId),
    });
  };

  /**
   * Handle document upload
   */
  const handleDocumentUpload = async (docId: string, file: File) => {
    // Add to uploading set
    setUploadingDocs(prev => new Set(prev).add(docId));

    try {
      // Upload the document
      const uploadedDoc = await uploadProjectDocument(projectId, file);

      // Update the required document with uploaded info
      const updatedDocs = documents.requiredDocs.map(doc =>
        doc.id === docId
          ? {
              ...doc,
              status: 'uploaded' as const,
              uploadedPath: uploadedDoc.document_path,
              uploadedFileName: file.name,
            }
          : doc
      );

      dispatch({
        type: 'SET_REQUIRED_DOCS',
        payload: updatedDocs,
      });

      // Also add to uploaded docs list
      dispatch({
        type: 'ADD_UPLOADED_DOC',
        payload: uploadedDoc,
      });
    } catch (error) {
      log.error('Upload error:', error);
      alert('Erro ao fazer upload do documento. Tente novamente.');
    } finally {
      // Remove from uploading set
      setUploadingDocs(prev => {
        const next = new Set(prev);
        next.delete(docId);
        return next;
      });
    }
  };

  /**
   * Handle removing uploaded file from a document
   */
  const handleRemoveUpload = (docId: string) => {
    const confirmed = confirm('Remover o arquivo enviado?');
    if (!confirmed) return;

    const updatedDocs = documents.requiredDocs.map(doc =>
      doc.id === docId
        ? {
            ...doc,
            status: 'required' as const,
            uploadedPath: undefined,
            uploadedFileName: undefined,
          }
        : doc
    );

    dispatch({
      type: 'SET_REQUIRED_DOCS',
      payload: updatedDocs,
    });
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="ceramic-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#5C554B]">
              Checklist de Habilitacao
            </h3>
            <p className="text-sm text-[#948D82]">
              Documentos necessarios para submissao do projeto
            </p>
          </div>

          {hasPdfContent && !hasDocs && (
            <button
              onClick={handleExtractDocs}
              disabled={isExtracting}
              className="ceramic-concave px-6 py-3 font-bold text-[#D97706] hover:scale-[0.98] disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Extraindo...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Extrair do Edital
                </>
              )}
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {hasDocs && (
          <div className="flex items-center gap-4">
            <div className="flex-1 ceramic-trough p-1.5">
              <motion.div
                className="h-2 rounded-full bg-ceramic-success"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-sm font-bold text-[#5C554B]">
              {checkedCount}/{totalDocs}
            </span>
          </div>
        )}
      </div>

      {/* Documents List */}
      {hasDocs ? (
        <div className="space-y-3">
          <AnimatePresence>
            {documents.requiredDocs.map((doc, index) => (
              <DocumentChecklistItem
                key={doc.id}
                document={doc}
                index={index}
                onToggle={() => handleToggleDoc(doc.id)}
                onRemove={() => handleRemoveDoc(doc.id)}
                onUpload={(file) => handleDocumentUpload(doc.id, file)}
                onRemoveUpload={() => handleRemoveUpload(doc.id)}
                isUploading={uploadingDocs.has(doc.id)}
              />
            ))}
          </AnimatePresence>

          {/* Add Document Button */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full ceramic-tray p-4 flex items-center justify-center gap-2 text-sm font-bold text-[#948D82] hover:text-[#5C554B] hover:bg-black/5 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Adicionar Documento
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="ceramic-card p-4"
            >
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddDocument();
                    if (e.key === 'Escape') {
                      setShowAddForm(false);
                      setNewDocName('');
                    }
                  }}
                  placeholder="Nome do documento..."
                  className="flex-1 bg-transparent border-b-2 border-[#5C554B]/20 focus:border-[#D97706] px-2 py-2 text-sm text-[#5C554B] focus:outline-none transition-colors"
                  autoFocus
                />
                <button
                  onClick={handleAddDocument}
                  disabled={!newDocName.trim()}
                  className="ceramic-concave px-4 py-2 text-xs font-bold text-[#D97706] hover:scale-95 disabled:opacity-50 transition-transform"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewDocName('');
                  }}
                  className="p-2 text-[#948D82] hover:text-[#5C554B] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        // Empty State
        <div className="ceramic-card p-8 text-center">
          <div className="w-16 h-16 bg-[#F0EFE9] rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-[#948D82]" />
          </div>
          <h3 className="text-lg font-bold text-[#5C554B] mb-2">
            Nenhum documento listado
          </h3>
          <p className="text-sm text-[#948D82] mb-6 max-w-md mx-auto">
            {hasPdfContent
              ? 'Extraia os documentos necessarios do PDF ou adicione manualmente.'
              : 'Faca upload do PDF do edital para extrair automaticamente, ou adicione manualmente.'}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {hasPdfContent && (
              <button
                onClick={handleExtractDocs}
                disabled={isExtracting}
                className="ceramic-concave px-6 py-3 font-bold text-[#D97706] hover:scale-[0.98] disabled:opacity-50 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Extrair do Edital
              </button>
            )}
            <button
              onClick={() => setShowAddForm(true)}
              className="ceramic-concave px-6 py-3 font-bold text-[#5C554B] hover:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Adicionar Manualmente
            </button>
          </div>
        </div>
      )}

      {/* Dependency Hint */}
      {!hasPdfContent && (
        <StageDependencyHint
          message="Para extrair documentos automaticamente, faca upload do PDF do edital primeiro."
          suggestedStage="setup"
          onNavigate={actions.setStage}
          variant="info"
        />
      )}
    </div>
  );
};

/**
 * Individual document checklist item
 */
interface DocumentChecklistItemProps {
  document: RequiredDocument;
  index: number;
  onToggle: () => void;
  onRemove: () => void;
  onUpload: (file: File) => void;
  onRemoveUpload: () => void;
  isUploading: boolean;
}

const DocumentChecklistItem: React.FC<DocumentChecklistItemProps> = ({
  document,
  index,
  onToggle,
  onRemove,
  onUpload,
  onRemoveUpload,
  isUploading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isChecked = document.status === 'available' || document.status === 'uploaded';
  const isUploaded = document.status === 'uploaded';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ delay: index * 0.05 }}
      className={`ceramic-card p-4 transition-colors ${
        isChecked ? 'bg-ceramic-success-bg border-l-4 border-ceramic-success' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded flex-shrink-0 flex items-center justify-center transition-colors ${
            isChecked
              ? 'bg-ceramic-success text-white'
              : 'border-2 border-[#948D82] hover:border-[#5C554B]'
          }`}
        >
          {isChecked && <Check className="w-4 h-4" />}
        </button>

        {/* Document Info */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-bold truncate ${
              isChecked ? 'text-ceramic-success line-through' : 'text-[#5C554B]'
            }`}
          >
            {document.name}
          </p>
          {document.description && (
            <p className="text-xs text-[#948D82] truncate">
              {document.description}
            </p>
          )}
          {isUploaded && document.uploadedFileName && (
            <div className="flex items-center gap-2 mt-1">
              <FileText className="w-3 h-3 text-ceramic-success" />
              <p className="text-xs text-ceramic-success truncate">
                {document.uploadedFileName}
              </p>
            </div>
          )}
        </div>

        {/* Upload/Remove Upload Button */}
        {!isUploaded ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="ceramic-concave px-3 py-2 text-xs font-bold text-[#D97706] hover:scale-95 disabled:opacity-50 transition-transform flex items-center gap-1.5"
              title="Upload documento"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload
                </>
              )}
            </button>
          </>
        ) : (
          <button
            onClick={onRemoveUpload}
            className="p-2 text-[#948D82] hover:text-ceramic-warning hover:bg-ceramic-warning/10 rounded-lg transition-colors"
            title="Remover arquivo"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Remove Document Button */}
        <button
          onClick={onRemove}
          className="p-2 text-[#948D82] hover:text-ceramic-error hover:bg-ceramic-error-bg rounded-lg transition-colors"
          title="Remover da lista"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default DocsStage;
