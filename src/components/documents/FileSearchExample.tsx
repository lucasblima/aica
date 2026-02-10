/**
 * Componente de exemplo: Gemini File Search
 *
 * Demonstra como usar o File Search do Gemini para:
 * - Upload e indexação de documentos
 * - Busca semântica com RAG
 * - Visualização de resultados com citações
 */

import React, { useState } from 'react';
import { Upload, Search, FileText, Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import { useFileSearch } from '@/hooks/useFileSearch';
import { FileSearchCategory } from '@/services/geminiFileSearchService';

export function FileSearchExample() {
  const { uploadDocument, searchDocuments, isUploading, isSearching, error } = useFileSearch();

  const [selectedCategory, setSelectedCategory] = useState<FileSearchCategory>('documents');
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState<{
    answer: string;
    citations?: Array<{ uri?: string; title?: string }>;
  } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadDocument(file, selectedCategory);
      alert(`✅ Documento "${file.name}" indexado com sucesso!`);
      e.target.value = ''; // Reset input
    } catch (err) {
      alert(`❌ Erro ao indexar documento: ${err}`);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      const result = await searchDocuments(query, [selectedCategory]);
      setSearchResult(result);
    } catch (err) {
      alert(`❌ Erro na busca: ${err}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-8 h-8 text-ceramic-accent" />
          <h1 className="text-3xl font-bold">Gemini File Search</h1>
        </div>
        <p className="text-ceramic-text-secondary">
          Upload documentos e faça perguntas usando busca semântica com RAG
        </p>
      </div>

      {/* Category Selector */}
      <div className="ceramic-card rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-ceramic-text-primary mb-2">
          Categoria
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as FileSearchCategory)}
          className="w-full px-3 py-2 border border-ceramic-border rounded-md focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
        >
          <option value="documents">📄 Documentos Gerais</option>
          <option value="financial">💰 Financeiro</option>
          <option value="personal">👤 Pessoal</option>
          <option value="business">💼 Negócios</option>
          <option value="grants">🎯 Editais</option>
        </select>
      </div>

      {/* Upload Section */}
      <div className="ceramic-card rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Indexar Documento
        </h2>

        <label className="block">
          <div className="border-2 border-dashed border-ceramic-border rounded-lg p-8 text-center hover:border-ceramic-accent/40 transition-colors cursor-pointer">
            <FileText className="w-12 h-12 mx-auto text-ceramic-text-tertiary mb-2" />
            <p className="text-ceramic-text-secondary mb-1">
              Clique para selecionar ou arraste um arquivo
            </p>
            <p className="text-sm text-ceramic-text-secondary">
              PDF, TXT, MD, DOCX, HTML (máx. 20MB)
            </p>
          </div>
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
            accept=".pdf,.txt,.md,.docx,.html"
          />
        </label>

        {isUploading && (
          <div className="mt-4 flex items-center gap-2 text-ceramic-accent">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Indexando documento...</span>
          </div>
        )}
      </div>

      {/* Search Section */}
      <div className="ceramic-card rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Search className="w-5 h-5" />
          Buscar em Documentos
        </h2>

        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Faça uma pergunta sobre seus documentos..."
              className="w-full px-4 py-3 border border-ceramic-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ceramic-accent"
              disabled={isSearching}
            />
          </div>

          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="w-full bg-ceramic-accent text-white py-3 rounded-lg font-medium hover:bg-ceramic-accent-dark disabled:bg-ceramic-text-tertiary disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Buscar
              </>
            )}
          </button>
        </form>
      </div>

      {/* Results Section */}
      {searchResult && (
        <div className="ceramic-card rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-ceramic-accent" />
            Resposta
          </h2>

          <div className="prose max-w-none">
            <p className="text-ceramic-text-primary whitespace-pre-wrap">{searchResult.answer}</p>
          </div>

          {searchResult.citations && searchResult.citations.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-medium text-ceramic-text-primary mb-2">Fontes:</h3>
              <ul className="space-y-2">
                {searchResult.citations.map((citation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <ExternalLink className="w-4 h-4 text-ceramic-text-tertiary mt-1 flex-shrink-0" />
                    <div>
                      {citation.title && (
                        <span className="font-medium text-ceramic-text-primary">{citation.title}</span>
                      )}
                      {citation.uri && (
                        <a
                          href={citation.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ceramic-accent hover:underline text-sm block"
                        >
                          {citation.uri}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-ceramic-error/10 border border-ceramic-error rounded-lg p-4 text-ceramic-error">
          <p className="font-medium">Erro:</p>
          <p>{error}</p>
        </div>
      )}

      {/* Info Footer */}
      <div className="bg-ceramic-info/10 border border-ceramic-info rounded-lg p-4 text-sm text-ceramic-info">
        <p className="font-medium mb-1">💡 Como funciona:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Documentos são automaticamente divididos em chunks e indexados</li>
          <li>A busca usa embeddings semânticos (não apenas keywords)</li>
          <li>O Gemini responde com base no conteúdo dos seus documentos</li>
          <li>Citações mostram de onde veio cada informação</li>
        </ul>
      </div>
    </div>
  );
}
