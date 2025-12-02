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
            <div className="flex p-1 bg-[#E5E3DC] rounded-xl">
                <button
                    onClick={() => setActiveTab('bio')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'bio'
                            ? 'bg-white text-[#5C554B] shadow-sm'
                            : 'text-[#948D82] hover:text-[#5C554B]'
                        }`}
                >
                    <User className="w-3 h-3" />
                    Bio
                </button>
                <button
                    onClick={() => setActiveTab('technical')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'technical'
                            ? 'bg-white text-[#5C554B] shadow-sm'
                            : 'text-[#948D82] hover:text-[#5C554B]'
                        }`}
                >
                    <FileText className="w-3 h-3" />
                    Ficha
                </button>
                <button
                    onClick={() => setActiveTab('news')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'news'
                            ? 'bg-white text-[#5C554B] shadow-sm'
                            : 'text-[#948D82] hover:text-[#5C554B]'
                        }`}
                >
                    <Globe className="w-3 h-3" />
                    News
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scroll ceramic-card rounded-xl p-6 bg-white/50">
                {activeTab === 'bio' && (
                    <div className="prose prose-sm max-w-none text-[#5C554B]">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-[#E5E3DC] flex items-center justify-center text-lg">
                                {dossier.guestName.charAt(0)}
                            </span>
                            {dossier.guestName}
                        </h3>
                        <div className="whitespace-pre-wrap leading-relaxed">
                            {dossier.biography}
                        </div>
                    </div>
                )}

                {activeTab === 'technical' && (
                    <TechnicalSheetView data={dossier.technicalSheet} />
                )}

                {activeTab === 'news' && (
                    <NewsMap topics={dossier.topics} />
                )}
            </div>

            {/* Polêmicas Section (Always visible at bottom if exists) */}
            {dossier.controversialTopics && dossier.controversialTopics.length > 0 && (
                <div className="ceramic-card rounded-xl p-4 border-l-4 border-red-400 bg-red-50/50">
                    <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">
                        ⚠️ Pontos Sensíveis
                    </h4>
                    <ul className="space-y-1">
                        {dossier.controversialTopics.map((topic, idx) => (
                            <li key={idx} className="text-sm text-[#5C554B] flex items-start gap-2">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-red-400" />
                                {topic}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};
