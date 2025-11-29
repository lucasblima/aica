import React, { useState, useEffect } from 'react';
import { Play, Pause, Square } from 'lucide-react';

export const PomodoroTimer = () => {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prevTime) => prevTime - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft]);

    const toggleTimer = () => {
        setIsActive(!isActive);
    };

    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(25 * 60);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="ceramic-card w-64 h-64 flex items-center justify-center relative mx-auto my-8">
            {/* Outer Ring (Elevated) - Clean Shadow */}
            <div className="absolute inset-2 rounded-full ceramic-card"></div>

            {/* Inner Dial (Groove) - Milled Effect */}
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
                        <Square className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
