import React, { useState } from 'react';
import { Dossier } from '../../types';
import NewsMap from '../NewsMap';
import TechnicalSheetView from '../TechnicalSheetView';
import { User, FileText, Globe } from 'lucide-react';

interface BioPanelProps {
    dossier: Dossier;
}

export const BioPanel: React.FC<BioPanelProps> = ({ dossier }) => {
    const [activeTab, setActiveTab] = useState<'bio' | 'technical' | 'news'>('bio');

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Tabs */}
            <div className="flex p-1.5 bg-[#E5E3DC] rounded-xl shadow-inner">
                <button
                    onClick={() => setActiveTab('bio')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'bio'
                        ? 'bg-white text-[#5C554B] shadow-sm scale-[1.02]'
                        : 'text-[#948D82] hover:text-[#5C554B] hover:bg-white/50'
                        }`}
                >
                    <User className="w-3.5 h-3.5" />
                    Bio
                </button>
                <button
                    onClick={() => setActiveTab('technical')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'technical'
                        ? 'bg-white text-[#5C554B] shadow-sm scale-[1.02]'
                        : 'text-[#948D82] hover:text-[#5C554B] hover:bg-white/50'
                        }`}
                >
                    <FileText className="w-3.5 h-3.5" />
                    Ficha
                </button>
                <button
                    onClick={() => setActiveTab('news')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'news'
                        ? 'bg-white text-[#5C554B] shadow-sm scale-[1.02]'
                        : 'text-[#948D82] hover:text-[#5C554B] hover:bg-white/50'
                        }`}
                >
                    <Globe className="w-3.5 h-3.5" />
                    News
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scroll bg-white border border-[#D6D3CD]/50 rounded-2xl p-6 shadow-sm">
                {activeTab === 'bio' && (
                    <div className="prose prose-sm max-w-none text-[#5C554B]">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3 text-[#5C554B] tracking-tight">
                            <span className="w-10 h-10 rounded-xl bg-[#F0EFE9] flex items-center justify-center text-lg shadow-sm border border-[#E5E3DC]">
                                {dossier.guestName.charAt(0)}
                            </span>
                            {dossier.guestName}
                        </h3>
                        <div className="whitespace-pre-wrap leading-relaxed text-base text-[#5C554B]/90">
                            {dossier.biography}
                        </div>
                    </div>
                )}

                {activeTab === 'technical' && (
                    <TechnicalSheetView data={dossier.technicalSheet} />
                )}

                {activeTab === 'news' && (
                    <NewsMap topics={dossier.topics} dossier={dossier} projectId={''} />
                )}
            </div>

            {/* Polêmicas Section (Always visible at bottom if exists) */}
            {dossier.controversialTopics && dossier.controversialTopics.length > 0 && (
                <div className="rounded-xl p-4 border border-red-100 bg-red-50/50 shadow-sm">
                    <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        Pontos Sensíveis
                    </h4>
                    <ul className="space-y-2">
                        {dossier.controversialTopics.map((topic, idx) => (
                            <li key={idx} className="text-sm text-[#5C554B] flex items-start gap-2 bg-white p-2 rounded-lg border border-red-100/50">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-red-400 flex-shrink-0" />
                                {topic}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
