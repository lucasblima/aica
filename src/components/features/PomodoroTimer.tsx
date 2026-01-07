import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, RotateCcw } from 'lucide-react';

interface PomodoroTimerProps {
    initialMinutes?: number;
    onComplete?: () => void;
    taskTitle?: string;
    autoStart?: boolean;
    onClose?: () => void;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
    initialMinutes = 25,
    onComplete,
    taskTitle,
    autoStart = false,
    onClose
}) => {
    const [timeLeft, setTimeLeft] = useState(initialMinutes * 60);
    const [isActive, setIsActive] = useState(autoStart);
    const [totalTime] = useState(initialMinutes * 60);

    useEffect(() => {
        setTimeLeft(initialMinutes * 60);
        setIsActive(autoStart);
    }, [initialMinutes, autoStart]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prevTime) => prevTime - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if (onComplete) onComplete();
            // Play sound or notification here
            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
            audio.play().catch(e => console.log('Audio play failed', e));
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft, onComplete]);

    const toggleTimer = () => {
        setIsActive(!isActive);
    };

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(totalTime);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = ((totalTime - timeLeft) / totalTime) * 100;

    return (
        <div className="ceramic-card w-full max-w-sm flex flex-col items-center justify-center relative mx-auto p-6 animate-scale-in">
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-ceramic-text-secondary hover:text-ceramic-text-primary"
                >
                    <Square className="w-4 h-4" />
                </button>
            )}

            {taskTitle && (
                <div className="mb-6 text-center">
                    <span className="text-xs font-bold text-ceramic-text-secondary uppercase tracking-wider">Focando em</span>
                    <h3 className="text-lg font-black text-ceramic-text-primary text-etched line-clamp-1">{taskTitle}</h3>
                </div>
            )}

            <div className="relative w-64 h-64 flex items-center justify-center">
                {/* Outer Ring (Elevated) */}
                <div className="absolute inset-0 rounded-full ceramic-card shadow-lg"></div>

                {/* Progress Ring (SVG) */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 p-2">
                    <circle
                        cx="128"
                        cy="128"
                        r="110"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-ceramic-text-secondary/10"
                    />
                    <circle
                        cx="128"
                        cy="128"
                        r="110"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 110}
                        strokeDashoffset={2 * Math.PI * 110 * (1 - progress / 100)}
                        className="text-ceramic-accent transition-all duration-1000 ease-linear"
                        strokeLinecap="round"
                    />
                </svg>

                {/* Inner Dial (Groove) */}
                <div className="ceramic-groove w-48 h-48 rounded-full flex flex-col items-center justify-center relative z-10">
                    <span className="text-5xl font-bold text-etched text-ceramic-text-primary tracking-wider font-mono">
                        {formatTime(timeLeft)}
                    </span>

                    <div className="flex gap-4 mt-4">
                        <button
                            onClick={toggleTimer}
                            className="w-12 h-12 rounded-full ceramic-card flex items-center justify-center text-ceramic-text-secondary hover:text-ceramic-text-primary active:scale-95 transition-all shadow-sm"
                        >
                            {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </button>

                        <button
                            onClick={resetTimer}
                            className="w-12 h-12 rounded-full ceramic-card flex items-center justify-center text-ceramic-text-secondary hover:text-ceramic-text-primary active:scale-95 transition-all shadow-sm"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
