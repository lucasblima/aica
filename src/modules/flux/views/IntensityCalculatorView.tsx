/**
 * IntensityCalculatorView - Calculadora de Zonas de Intensidade
 *
 * Tela 4: Calculadora de zonas baseada em limiares (FTP/Pace/CSS) com Z-Scores (21-25)
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calculator } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { IntensityCalculatorService } from '../services/intensityCalculatorService';
import { AthleteProfileService } from '../services/athleteProfileService';
import type { FlowAthleteProfile, IntensityCalculation } from '../types/flow';
import { MODALITY_CONFIG } from '../types/flux';

const Z_SCORE_LABELS: Record<number, string> = {
  21: 'Z1 - Recuperação',
  22: 'Z2 - Aeróbico',
  23: 'Z3 - Tempo',
  24: 'Z4 - Limiar',
  25: 'Z5 - VO2 Max',
};

export default function IntensityCalculatorView() {
  const navigate = useNavigate();
  const { athleteId } = useParams<{ athleteId: string }>();

  const [profile, setProfile] = useState<FlowAthleteProfile | null>(null);
  const [selectedZone, setSelectedZone] = useState<number>(23);
  const [calculation, setCalculation] = useState<IntensityCalculation | null>(null);
  const [allZones, setAllZones] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (athleteId) {
      loadAthlete();
    }
  }, [athleteId]);

  useEffect(() => {
    if (profile) {
      calculateIntensity();
      calculateAllZones();
    }
  }, [profile, selectedZone]);

  const loadAthlete = async () => {
    if (!athleteId) return;

    const { data } = await AthleteProfileService.getProfilesByAthleteId(athleteId);
    if (data && data.length > 0) {
      setProfile(data[0] as unknown as FlowAthleteProfile);
    }
    setLoading(false);
  };

  const calculateIntensity = () => {
    if (!profile) return;

    try {
      const calc = IntensityCalculatorService.calculateIntensity(profile, selectedZone);
      setCalculation(calc);
    } catch (error: unknown) {
      console.error('Error calculating intensity:', error instanceof Error ? error.message : error);
    }
  };

  const calculateAllZones = () => {
    if (!profile) return;

    try {
      const zones = IntensityCalculatorService.getAllZones(profile);
      setAllZones(zones);
    } catch (error: unknown) {
      console.error('Error calculating zones:', error instanceof Error ? error.message : error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-ceramic-base">
        <div className="text-ceramic-text-secondary">Carregando atleta...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-ceramic-base">
        <div className="text-ceramic-text-primary">Atleta não encontrado</div>
      </div>
    );
  }

  const modalityConfig = MODALITY_CONFIG[profile.modality as keyof typeof MODALITY_CONFIG];

  return (
    <div className="flex flex-col w-full min-h-screen bg-ceramic-base pb-32">
      <div className="pt-8 px-6 pb-6 border-b border-ceramic-text-secondary/10">
        <button
          onClick={() => navigate(`/flux/athlete/${athleteId}`)}
          className="mb-4 flex items-center gap-2 text-ceramic-text-secondary hover:text-ceramic-text-primary"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Voltar</span>
        </button>

        <div>
          <h1 className="text-3xl font-black text-ceramic-text-primary mb-2">
            Calculadora de Intensidade
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xl">{modalityConfig?.icon}</span>
            <p className="text-sm text-ceramic-text-secondary">
              {profile.name} • {modalityConfig?.label}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Zone Selector */}
        <div className="ceramic-card p-6">
          <h2 className="text-lg font-bold text-ceramic-text-primary mb-4">
            Selecione a Zona de Treino
          </h2>
          <div className="grid grid-cols-5 gap-3">
            {[21, 22, 23, 24, 25].map((zone) => (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={`p-4 rounded-lg text-center transition-all ${
                  selectedZone === zone
                    ? 'bg-ceramic-accent text-white'
                    : 'ceramic-inset hover:bg-white/50'
                }`}
              >
                <p className="text-2xl font-bold mb-1">{zone}</p>
                <p className="text-[10px] uppercase tracking-wider">{Z_SCORE_LABELS[zone]}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Calculation Result */}
        {calculation && (
          <div className="ceramic-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calculator className="w-6 h-6 text-ceramic-accent" />
              <h2 className="text-lg font-bold text-ceramic-text-primary">
                Zona {selectedZone} - {Z_SCORE_LABELS[selectedZone]}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-ceramic-cool rounded-lg">
                <p className="text-xs text-ceramic-text-secondary uppercase mb-1">Limiar Base</p>
                <p className="text-2xl font-bold text-ceramic-text-primary">
                  {calculation.base_threshold}
                </p>
              </div>
              <div className="p-4 bg-ceramic-accent/10 rounded-lg">
                <p className="text-xs text-ceramic-text-secondary uppercase mb-1">
                  Intensidade Recomendada
                </p>
                <p className="text-2xl font-bold text-ceramic-accent">
                  {calculation.recommended_intensity}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-ceramic-text-primary mb-2">
                Exemplos de Treino:
              </p>
              <ul className="space-y-2">
                {calculation.workout_examples.map((example, index) => (
                  <li
                    key={index}
                    className="p-3 ceramic-inset rounded-lg text-sm text-ceramic-text-primary"
                  >
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* All Zones Table */}
        {allZones && (
          <div className="ceramic-card p-6">
            <h2 className="text-lg font-bold text-ceramic-text-primary mb-4">
              Todas as Zonas de Treino
            </h2>
            <div className="space-y-2">
              {Object.entries(allZones).map(([zone, value]) => (
                <div
                  key={zone}
                  className="flex items-center justify-between p-3 ceramic-inset rounded-lg"
                >
                  <span className="text-sm font-medium text-ceramic-text-primary uppercase">
                    {zone}
                  </span>
                  <span className="text-sm font-bold text-ceramic-text-primary">{value as string}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
