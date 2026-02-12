/**
 * LevelingEngineView - Motor de Nivelamento Automático
 *
 * Tela 3: Análise de atletas com recomendações de progressão/regressão baseadas
 * em regras (consistência, volume semanal, semanas ativas, tendência de performance)
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LevelingEngineService } from '../services/levelingEngineService';
import { AthleteProfileService } from '../services/athleteProfileService';
import type { LevelingRecommendation, AthleteProfile } from '../types/flow';

export default function LevelingEngineView() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<LevelingRecommendation[]>([]);
  const [profiles, setProfiles] = useState<AthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data } = await AthleteProfileService.getAllProfiles();
    if (data) {
      setProfiles(data);
      analyzeAthletes(data);
    }
    setLoading(false);
  };

  const analyzeAthletes = async (athleteProfiles: AthleteProfile[]) => {
    setAnalyzing(true);
    const recs = await LevelingEngineService.batchAnalyzeAthletes(athleteProfiles);
    setRecommendations(recs);
    setAnalyzing(false);
  };

  const needingAdjustment = recommendations.filter(
    (r) => r.current_level !== r.recommended_level && r.confidence >= 70
  );

  return (
    <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-32">
      <div className="pt-8 px-6 pb-6 border-b border-ceramic-text-secondary/10">
        <button
          onClick={() => navigate('/flux')}
          className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Voltar</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-ceramic-text-primary mb-2">
              Motor de Nivelamento
            </h1>
            <p className="text-sm text-ceramic-text-secondary">
              {needingAdjustment.length} atleta{needingAdjustment.length !== 1 ? 's' : ''} com recomendação de ajuste
            </p>
          </div>

          <button
            onClick={() => analyzeAthletes(profiles)}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-ceramic-accent text-white rounded-lg hover:bg-ceramic-accent/90"
          >
            <RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
            <span className="font-medium">{analyzing ? 'Analisando...' : 'Reanalisar'}</span>
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        {loading ? (
          <div className="text-ceramic-text-secondary">Carregando atletas...</div>
        ) : recommendations.length === 0 ? (
          <div className="ceramic-inset p-8 text-center">
            <p className="text-ceramic-text-secondary">Nenhum atleta encontrado</p>
          </div>
        ) : (
          recommendations.map((rec) => {
            const profile = profiles.find((p) => p.athlete_id === rec.athlete_id);
            if (!profile) return null;

            const needsChange = rec.current_level !== rec.recommended_level;
            const isUpgrade =
              needsChange &&
              ['iniciante_1', 'iniciante_2', 'iniciante_3', 'intermediario_1', 'intermediario_2', 'intermediario_3', 'avancado'].indexOf(
                rec.recommended_level
              ) >
                ['iniciante_1', 'iniciante_2', 'iniciante_3', 'intermediario_1', 'intermediario_2', 'intermediario_3', 'avancado'].indexOf(
                  rec.current_level
                );

            return (
              <div
                key={rec.athlete_id}
                className={`ceramic-card p-4 ${needsChange ? 'ring-2 ring-ceramic-warning' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-ceramic-text-primary">{profile.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-ceramic-text-secondary">
                        Atual: {rec.current_level}
                      </span>
                      {needsChange && (
                        <>
                          {isUpgrade ? (
                            <TrendingUp className="w-4 h-4 text-ceramic-success" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-ceramic-error" />
                          )}
                          <span className="text-xs font-bold text-ceramic-text-primary">
                            → {rec.recommended_level}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-ceramic-text-secondary mb-1">Confiança</p>
                    <p className="text-2xl font-bold text-ceramic-text-primary">{rec.confidence}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3 p-3 bg-ceramic-cool rounded-lg">
                  <div>
                    <p className="text-[10px] text-ceramic-text-secondary uppercase">Consistência</p>
                    <p className="text-sm font-bold">{rec.metrics.consistency_rate}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ceramic-text-secondary uppercase">Volume</p>
                    <p className="text-sm font-bold">{Math.round(rec.metrics.weekly_volume / 60)}h/sem</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-ceramic-text-secondary uppercase">Tendência</p>
                    <p className="text-sm font-bold capitalize">{rec.metrics.performance_trend}</p>
                  </div>
                </div>

                <p className="text-sm text-ceramic-text-secondary">{rec.reasoning}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
