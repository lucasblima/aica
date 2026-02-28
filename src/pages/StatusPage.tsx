import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Tag,
} from 'lucide-react';

// ==================== TYPES ====================

type OverallStatus = 'operational' | 'degraded' | 'outage';
type Severity = 'outage' | 'degraded' | 'maintenance';
type ChangeType = 'feat' | 'fix' | 'infra' | 'docs';

interface Incident {
  date: string;
  title: string;
  description: string;
  severity: Severity;
  duration: string;
  resolved: boolean;
}

interface ChangelogEntry {
  date: string;
  type: ChangeType;
  description: string;
}

// ==================== STATUS CONFIG ====================

const CURRENT_STATUS: OverallStatus = 'operational';

const STATUS_CONFIG: Record<
  OverallStatus,
  { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }
> = {
  operational: {
    label: 'Todos os sistemas operacionais',
    color: 'text-[#6B7B5C]',
    bgColor: 'bg-[#F0F4EC]',
    borderColor: 'border-[#6B7B5C]',
    icon: CheckCircle2,
  },
  degraded: {
    label: 'Degradacao parcial do servico',
    color: 'text-[#C4883A]',
    bgColor: 'bg-[#FFF8F0]',
    borderColor: 'border-[#C4883A]',
    icon: AlertTriangle,
  },
  outage: {
    label: 'Interrupcao do servico',
    color: 'text-[#9B4D3A]',
    bgColor: 'bg-[#FDF0ED]',
    borderColor: 'border-[#9B4D3A]',
    icon: XCircle,
  },
};

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; dotColor: string; textColor: string }
> = {
  outage: {
    label: 'Queda',
    dotColor: 'bg-[#9B4D3A]',
    textColor: 'text-[#9B4D3A]',
  },
  degraded: {
    label: 'Degradacao',
    dotColor: 'bg-[#C4883A]',
    textColor: 'text-[#C4883A]',
  },
  maintenance: {
    label: 'Manutencao',
    dotColor: 'bg-[#6B7B5C]',
    textColor: 'text-[#6B7B5C]',
  },
};

const CHANGE_TYPE_CONFIG: Record<
  ChangeType,
  { label: string; bgColor: string; textColor: string }
> = {
  feat: { label: 'Novo', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  fix: { label: 'Correcao', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  infra: { label: 'Infra', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
  docs: { label: 'Docs', bgColor: 'bg-gray-100', textColor: 'text-[#5C554B]' },
};

// ==================== STATIC DATA ====================

const INCIDENTS: Incident[] = [
  {
    date: '2026-02-27',
    title: 'Latencia elevada no modulo Finance',
    description:
      'Processamento de extratos bancarios apresentou lentidao devido a alta carga no parsing de arquivos OFX. Otimizacoes de error handling foram aplicadas.',
    severity: 'degraded',
    duration: '2h 15min',
    resolved: true,
  },
  {
    date: '2026-02-25',
    title: 'Manutencao programada — Migracao de seguranca Finance',
    description:
      'Aplicacao de 50 correcoes de seguranca, UI e backend no modulo Finance. Servico ficou brevemente indisponivel durante a migracao.',
    severity: 'maintenance',
    duration: '45min',
    resolved: true,
  },
  {
    date: '2026-02-22',
    title: 'Offset de 3 horas no Google Calendar',
    description:
      'Eventos sincronizados do Google Calendar exibiam horarios com 3 horas de diferenca devido a tratamento incorreto de fuso horario. Correcao aplicada na sincronizacao.',
    severity: 'degraded',
    duration: '1 dia',
    resolved: true,
  },
  {
    date: '2026-02-18',
    title: 'Crash no Chat ao enviar mensagens longas',
    description:
      'O componente de chat (AicaChatFAB) falhava ao processar respostas extensas da IA. Correcao aplicada no parser de JSON do Gemini.',
    severity: 'outage',
    duration: '4h',
    resolved: true,
  },
  {
    date: '2026-02-14',
    title: 'Manutencao programada — Biblioteca de exercicios Flux',
    description:
      'Atualizacao massiva na biblioteca de exercicios do modulo Flux com correcao de 15 issues. Servico de treinos indisponivel durante o deploy.',
    severity: 'maintenance',
    duration: '1h 30min',
    resolved: true,
  },
];

const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-02-28',
    type: 'feat',
    description: 'Carrossel de perguntas diarias na pagina Vida + correcoes de infra na politica de privacidade',
  },
  {
    date: '2026-02-28',
    type: 'fix',
    description: 'Auditoria completa do modulo Finance — 50 correcoes em UI, backend e seguranca',
  },
  {
    date: '2026-02-27',
    type: 'fix',
    description: 'Melhoria no tratamento de erros no processamento de extratos, OFX, digest e busca',
  },
  {
    date: '2026-02-25',
    type: 'fix',
    description: 'Correcao do offset de 3 horas no fuso horario da sincronizacao com Google Calendar',
  },
  {
    date: '2026-02-24',
    type: 'docs',
    description: 'Reescrita completa da Politica de Privacidade e Termos de Servico v2.0',
  },
  {
    date: '2026-02-23',
    type: 'fix',
    description: 'Resolucao de 3 bugs — crash no Chat e campos de distancia no Flux',
  },
  {
    date: '2026-02-22',
    type: 'fix',
    description: 'Correcao de 6 bugs em Layout, Agenda e Journey',
  },
  {
    date: '2026-02-20',
    type: 'fix',
    description: 'Resolucao de 9 issues na biblioteca de exercicios do Flux',
  },
  {
    date: '2026-02-18',
    type: 'fix',
    description: 'Correcao de 6 issues na biblioteca de exercicios do Flux',
  },
  {
    date: '2026-02-16',
    type: 'fix',
    description: 'Correcao de badges, favoritos, assessoria e dashboard admin no Flux',
  },
  {
    date: '2026-02-15',
    type: 'fix',
    description: 'Correcao de badge overlap, display de assessoria e selecao de usuario no Flux',
  },
  {
    date: '2026-02-14',
    type: 'feat',
    description: 'Novo modulo de biblioteca de exercicios com filtros e favoritos',
  },
  {
    date: '2026-02-12',
    type: 'infra',
    description: 'Atualizacao do pipeline de deploy com validacao de staging obrigatoria',
  },
  {
    date: '2026-02-10',
    type: 'feat',
    description: 'Portal do atleta — visualizacao de treinos em modo leitura para atletas',
  },
  {
    date: '2026-02-08',
    type: 'infra',
    description: 'Adicao do .worktrees/ ao .gitignore para suporte a worktrees do Claude Code',
  },
];

// ==================== HELPERS ====================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ==================== COMPONENT ====================

export function StatusPage() {
  const navigate = useNavigate();
  const status = STATUS_CONFIG[CURRENT_STATUS];
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-ceramic-base">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-ceramic-base border-b border-[#E8E6E0]">
        <div className="max-w-[900px] mx-auto px-6 md:px-8 h-16 flex items-center">
          <button
            onClick={() => navigate('/landing')}
            className="flex items-center gap-2 text-[#5C554B] hover:text-[#2B1B17] transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B9EFF] rounded-lg p-2"
            aria-label="Voltar para a pagina inicial"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Voltar</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[900px] mx-auto px-6 md:px-8 py-12">
        <h1 className="text-4xl md:text-5xl font-bold text-[#2B1B17] mb-4">
          Status do Servico
        </h1>
        <p className="text-sm text-[#5C554B] mb-8">
          Ultima atualizacao: {formatDate(new Date().toISOString().split('T')[0])}
        </p>

        {/* Status Banner */}
        <div
          className={`${status.bgColor} ${status.borderColor} border rounded-xl p-6 flex items-center gap-4 mb-12`}
        >
          <StatusIcon size={32} className={status.color} />
          <div>
            <p className={`text-lg font-semibold ${status.color}`}>
              {status.label}
            </p>
            <p className="text-sm text-[#5C554B] mt-1">
              Monitoramento continuo de todos os modulos da plataforma AICA.
            </p>
          </div>
        </div>

        {/* Incidents Timeline */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-[#2B1B17] mb-6">
            Incidentes Recentes
          </h2>
          <div className="space-y-4">
            {INCIDENTS.map((incident, idx) => {
              const severityCfg = SEVERITY_CONFIG[incident.severity];
              return (
                <div
                  key={idx}
                  className="bg-[#F8F7F5] border border-[#E8E6E0] rounded-xl p-6"
                >
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    {/* Severity badge */}
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <span
                        className={`w-2 h-2 rounded-full ${severityCfg.dotColor}`}
                      />
                      <span className={severityCfg.textColor}>
                        {severityCfg.label}
                      </span>
                    </span>
                    {/* Date */}
                    <span className="text-xs text-[#5C554B]">
                      {formatDate(incident.date)}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#2B1B17] mb-2">
                    {incident.title}
                  </h3>
                  <p className="text-sm text-[#5C554B] leading-relaxed mb-3">
                    {incident.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#5C554B]">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={14} />
                      {incident.duration}
                    </span>
                    {incident.resolved ? (
                      <span className="inline-flex items-center gap-1 text-[#6B7B5C]">
                        <CheckCircle2 size={14} />
                        Resolvido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#C4883A]">
                        <AlertTriangle size={14} />
                        Em andamento
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Changelog */}
        <section>
          <h2 className="text-2xl font-bold text-[#2B1B17] mb-6">
            Registro de Alteracoes
          </h2>
          <div className="space-y-3">
            {CHANGELOG.map((entry, idx) => {
              const typeCfg = CHANGE_TYPE_CONFIG[entry.type];
              return (
                <div
                  key={idx}
                  className="flex items-start gap-4 py-3 border-b border-[#E8E6E0] last:border-b-0"
                >
                  {/* Date */}
                  <span className="text-xs text-[#5C554B] whitespace-nowrap pt-0.5 w-24 shrink-0">
                    {formatDate(entry.date)}
                  </span>
                  {/* Type badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${typeCfg.bgColor} ${typeCfg.textColor} shrink-0`}
                  >
                    <Tag size={12} />
                    {typeCfg.label}
                  </span>
                  {/* Description */}
                  <p className="text-sm text-[#5C554B] leading-relaxed">
                    {entry.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#F8F7F5] border-t border-[#E8E6E0] py-8 mt-16">
        <div className="max-w-[900px] mx-auto px-6 md:px-8 text-center">
          <p className="text-sm text-[#5C554B]">
            &copy; {new Date().getFullYear()} AICA Life OS - Comtxae Educacao
            Cultura e Tecnologia Ltda. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default StatusPage;
