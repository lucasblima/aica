import React from 'react';
import { TechnicalSheet } from '../types';
import { User, MapPin, GraduationCap, Briefcase, Heart, Info } from 'lucide-react';

interface Props {
    sheet?: TechnicalSheet;
}

const TechnicalSheetView: React.FC<Props> = ({ sheet }) => {
    if (!sheet || Object.keys(sheet).length === 0) {
        return (
            <div className="text-sm text-zinc-500 italic flex items-center gap-2">
                <Info className="w-4 h-4" />
                Ficha técnica não disponível. Será gerada automaticamente ao criar uma nova pauta.
            </div>
        );
    }

    return (
        <div className="space-y-4 text-sm">
            {/* Nome Completo */}
            {sheet.fullName && (
                <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <span className="text-zinc-500">Nome Completo:</span>
                        <span className="text-zinc-200 ml-2">{sheet.fullName}</span>
                    </div>
                </div>
            )}

            {/* Apelidos */}
            {sheet.nicknames && sheet.nicknames.length > 0 && (
                <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <span className="text-zinc-500">Apelidos:</span>
                        <span className="text-zinc-200 ml-2">{sheet.nicknames.join(', ')}</span>
                    </div>
                </div>
            )}

            {/* Nascimento */}
            {sheet.birthInfo && (
                <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <span className="text-zinc-500">Nascimento:</span>
                        <span className="text-zinc-200 ml-2">
                            {[sheet.birthInfo.city, sheet.birthInfo.state, sheet.birthInfo.country]
                                .filter(Boolean)
                                .join(', ')}
                        </span>
                    </div>
                </div>
            )}

            {/* Formação */}
            {sheet.education && sheet.education.length > 0 && (
                <div className="flex items-start gap-2">
                    <GraduationCap className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <div className="text-zinc-500 mb-1">Formação:</div>
                        <ul className="space-y-1">
                            {sheet.education.map((edu, i) => (
                                <li key={i} className="text-zinc-200">
                                    • {edu.degree} - {edu.institution}
                                    {edu.year && ` (${edu.year})`}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Carreira */}
            {sheet.careerHighlights && sheet.careerHighlights.length > 0 && (
                <div className="flex items-start gap-2">
                    <Briefcase className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <div className="text-zinc-500 mb-1">Carreira:</div>
                        <ul className="space-y-1">
                            {sheet.careerHighlights.map((career, i) => (
                                <li key={i} className="text-zinc-200">
                                    • {career.title} - {career.organization}
                                    {career.period && ` (${career.period})`}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Países Viajados */}
            {sheet.traveledCountries && sheet.traveledCountries.length > 0 && (
                <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <span className="text-zinc-500">Países Visitados:</span>
                        <span className="text-zinc-200 ml-2">{sheet.traveledCountries.join(', ')}</span>
                    </div>
                </div>
            )}

            {/* Preferências */}
            {sheet.preferences && (
                <div className="flex items-start gap-2">
                    <Heart className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <div className="text-zinc-500 mb-1">Preferências:</div>
                        <div className="space-y-1">
                            {sheet.preferences.food && sheet.preferences.food.length > 0 && (
                                <div className="text-zinc-200">
                                    <span className="text-zinc-500">Comida:</span> {sheet.preferences.food.join(', ')}
                                </div>
                            )}
                            {sheet.preferences.hobbies && sheet.preferences.hobbies.length > 0 && (
                                <div className="text-zinc-200">
                                    <span className="text-zinc-500">Hobbies:</span> {sheet.preferences.hobbies.join(', ')}
                                </div>
                            )}
                            {sheet.preferences.sports && sheet.preferences.sports.length > 0 && (
                                <div className="text-zinc-200">
                                    <span className="text-zinc-500">Esportes:</span> {sheet.preferences.sports.join(', ')}
                                </div>
                            )}
                            {sheet.preferences.music && sheet.preferences.music.length > 0 && (
                                <div className="text-zinc-200">
                                    <span className="text-zinc-500">Música:</span> {sheet.preferences.music.join(', ')}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Fatos Chave */}
            {sheet.keyFacts && sheet.keyFacts.length > 0 && (
                <div className="border-t border-zinc-800 pt-3 mt-3">
                    <div className="text-zinc-500 mb-2 flex items-center gap-1">
                        <Info className="w-4 h-4" />
                        Fatos Interessantes:
                    </div>
                    <ul className="space-y-1">
                        {sheet.keyFacts.map((fact, i) => (
                            <li key={i} className="text-zinc-300 text-xs">• {fact}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default TechnicalSheetView;
