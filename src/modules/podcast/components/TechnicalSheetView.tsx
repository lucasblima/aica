import React from 'react';
import { TechnicalSheet } from '../types';
import { User, MapPin, GraduationCap, Briefcase, Heart, Info } from 'lucide-react';

interface Props {
    sheet?: TechnicalSheet;
}

const TechnicalSheetView: React.FC<Props> = ({ sheet }) => {
    if (!sheet || Object.keys(sheet).length === 0) {
        return (
            <div className="text-sm text-[#948D82] italic flex items-center gap-2 p-4 bg-[#F0EFE9] rounded-lg border border-[#D6D3CD]/30">
                <Info className="w-4 h-4" />
                Ficha técnica não disponível. Será gerada automaticamente ao criar uma nova pauta.
            </div>
        );
    }

    return (
        <div className="space-y-5 text-sm">
            {/* Nome Completo */}
            {sheet.fullName && (
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-[#F0EFE9] rounded-lg text-[#948D82]">
                        <User className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-[#948D82] text-xs font-bold uppercase tracking-wider block mb-0.5">Nome Completo</span>
                        <span className="text-[#5C554B] font-medium text-base">{sheet.fullName}</span>
                    </div>
                </div>
            )}

            {/* Apelidos */}
            {sheet.nicknames && sheet.nicknames.length > 0 && (
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-[#F0EFE9] rounded-lg text-[#948D82]">
                        <User className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-[#948D82] text-xs font-bold uppercase tracking-wider block mb-0.5">Apelidos</span>
                        <span className="text-[#5C554B]">{sheet.nicknames.join(', ')}</span>
                    </div>
                </div>
            )}

            {/* Nascimento */}
            {sheet.birthInfo && (
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-[#F0EFE9] rounded-lg text-[#948D82]">
                        <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-[#948D82] text-xs font-bold uppercase tracking-wider block mb-0.5">Nascimento</span>
                        <span className="text-[#5C554B]">
                            {[sheet.birthInfo.city, sheet.birthInfo.state, sheet.birthInfo.country]
                                .filter(Boolean)
                                .join(', ')}
                        </span>
                    </div>
                </div>
            )}

            {/* Formação */}
            {sheet.education && sheet.education.length > 0 && (
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-[#F0EFE9] rounded-lg text-[#948D82]">
                        <GraduationCap className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                        <span className="text-[#948D82] text-xs font-bold uppercase tracking-wider block mb-1">Formação</span>
                        <ul className="space-y-2">
                            {sheet.education.map((edu, i) => (
                                <li key={i} className="text-[#5C554B] bg-[#F7F6F4] p-2 rounded-lg border border-[#E5E3DC]">
                                    <div className="font-bold">{edu.degree}</div>
                                    <div className="text-xs text-[#948D82]">{edu.institution} {edu.year && `• ${edu.year}`}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Carreira */}
            {sheet.careerHighlights && sheet.careerHighlights.length > 0 && (
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-[#F0EFE9] rounded-lg text-[#948D82]">
                        <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                        <span className="text-[#948D82] text-xs font-bold uppercase tracking-wider block mb-1">Carreira</span>
                        <ul className="space-y-2">
                            {sheet.careerHighlights.map((career, i) => (
                                <li key={i} className="text-[#5C554B] bg-[#F7F6F4] p-2 rounded-lg border border-[#E5E3DC]">
                                    <div className="font-bold">{career.title}</div>
                                    <div className="text-xs text-[#948D82]">{career.organization} {career.period && `• ${career.period}`}</div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Países Viajados */}
            {sheet.traveledCountries && sheet.traveledCountries.length > 0 && (
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-[#F0EFE9] rounded-lg text-[#948D82]">
                        <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                        <span className="text-[#948D82] text-xs font-bold uppercase tracking-wider block mb-0.5">Países Visitados</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {sheet.traveledCountries.map((country, i) => (
                                <span key={i} className="px-2 py-0.5 bg-[#F0EFE9] rounded-md text-xs text-[#5C554B] border border-[#D6D3CD]/50">
                                    {country}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Preferências */}
            {sheet.preferences && (
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-[#F0EFE9] rounded-lg text-[#948D82]">
                        <Heart className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                        <span className="text-[#948D82] text-xs font-bold uppercase tracking-wider block mb-2">Preferências</span>
                        <div className="grid grid-cols-1 gap-2">
                            {sheet.preferences.food && sheet.preferences.food.length > 0 && (
                                <div className="text-[#5C554B] text-xs">
                                    <span className="font-bold text-[#948D82] mr-1">Comida:</span> {sheet.preferences.food.join(', ')}
                                </div>
                            )}
                            {sheet.preferences.hobbies && sheet.preferences.hobbies.length > 0 && (
                                <div className="text-[#5C554B] text-xs">
                                    <span className="font-bold text-[#948D82] mr-1">Hobbies:</span> {sheet.preferences.hobbies.join(', ')}
                                </div>
                            )}
                            {sheet.preferences.sports && sheet.preferences.sports.length > 0 && (
                                <div className="text-[#5C554B] text-xs">
                                    <span className="font-bold text-[#948D82] mr-1">Esportes:</span> {sheet.preferences.sports.join(', ')}
                                </div>
                            )}
                            {sheet.preferences.music && sheet.preferences.music.length > 0 && (
                                <div className="text-[#5C554B] text-xs">
                                    <span className="font-bold text-[#948D82] mr-1">Música:</span> {sheet.preferences.music.join(', ')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Fatos Chave */}
            {sheet.keyFacts && sheet.keyFacts.length > 0 && (
                <div className="border-t border-[#D6D3CD]/30 pt-4 mt-2">
                    <div className="text-[#948D82] text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Fatos Interessantes
                    </div>
                    <ul className="space-y-2">
                        {sheet.keyFacts.map((fact, i) => (
                            <li key={i} className="text-[#5C554B] text-sm flex items-start gap-2">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#D6D3CD]" />
                                {fact}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default TechnicalSheetView;
