import React from 'react';
import { Clock, Flame, Zap } from 'lucide-react';

interface EfficiencyMedallionProps {
    score: number; // 0-100
    focusTime: number; // minutes
    streak: number; // days
    xp: number; // points
    status?: 'critical' | 'stable' | 'excellent';
}

export const EfficiencyMedallion: React.FC<EfficiencyMedallionProps> = ({
    score,
    focusTime,
    streak,
    xp,
    status = 'stable'
}) => {
    // Calculate ring progress (0-100 to 0-283 circumference)
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const progress = circumference - (score / 100) * circumference;

    // Status LED colors
    const statusColors = {
        critical: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
        stable: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
        excellent: 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
    };

    // Status labels
    const statusLabels = {
        critical: 'CRÍTICO',
        stable: 'ESTÁVEL',
        excellent: 'ÓTIMO'
    };

    return (
        <div className="bg-[#EBE9E4] rounded-[32px] border border-white/20 p-8 shadow-[inset_4px_4px_8px_rgba(163,158,145,0.15),inset_-4px_-4px_8px_rgba(255,255,255,0.9)]">
            <div className="flex flex-col md:flex-row items-center gap-8">

                {/* Hero Metric - SVG Ring */}
                <div className="flex-shrink-0">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                        {/* SVG Ring */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                            {/* Background ring */}
                            <circle
                                cx="72"
                                cy="72"
                                r={radius}
                                stroke="#D6D3CD"
                                strokeWidth="8"
                                fill="none"
                            />
                            {/* Progress ring */}
                            <circle
                                cx="72"
                                cy="72"
                                r={radius}
                                stroke="url(#goldGradient)"
                                strokeWidth="8"
                                fill="none"
                                strokeDasharray={circumference}
                                strokeDashoffset={progress}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]"
                            />
                            {/* Gold gradient definition */}
                            <defs>
                                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#f59e0b" />
                                    <stop offset="100%" stopColor="#d97706" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Center content */}
                        <div className="text-center z-10">
                            <div className="text-5xl font-black text-[#5C554B] tracking-tighter leading-none">
                                {score}
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[#948D82] mt-1">
                                SCORE
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="flex-1 grid grid-cols-3 gap-6 divide-x divide-[#D6D3CD]">

                    {/* Focus Time */}
                    <div className="flex flex-col items-center justify-center px-4">
                        <Clock className="w-5 h-5 text-[#5C554B] mb-2" strokeWidth={1.5} />
                        <div className="text-xl font-bold text-[#5C554B]">
                            {Math.floor(focusTime / 60)}h {focusTime % 60}m
                        </div>
                        <div className="text-xs font-medium text-[#8C8C8C] uppercase tracking-wider mt-1">
                            Foco
                        </div>
                    </div>

                    {/* Streak */}
                    <div className="flex flex-col items-center justify-center px-4">
                        <Flame className="w-5 h-5 text-[#5C554B] mb-2" strokeWidth={1.5} />
                        <div className="text-xl font-bold text-[#5C554B]">
                            {streak}
                        </div>
                        <div className="text-xs font-medium text-[#8C8C8C] uppercase tracking-wider mt-1">
                            Dias
                        </div>
                    </div>

                    {/* XP */}
                    <div className="flex flex-col items-center justify-center px-4">
                        <Zap className="w-5 h-5 text-[#5C554B] mb-2" strokeWidth={1.5} />
                        <div className="text-xl font-bold text-[#5C554B]">
                            {xp}
                        </div>
                        <div className="text-xs font-medium text-[#8C8C8C] uppercase tracking-wider mt-1">
                            XP
                        </div>
                    </div>
                </div>

                {/* Status LED */}
                <div className="flex-shrink-0 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8C8C8C]">
                        {statusLabels[status]}
                    </span>
                </div>
            </div>
        </div>
    );
};
