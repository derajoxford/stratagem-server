import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { 
    Clock, 
    Calendar, 
    Swords, 
    Users,
    Loader2
} from 'lucide-react';

export default function TurnTimer({ gameState, gameConfig, alliances = [], wars = [] }) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [timeUntilNextTurn, setTimeUntilNextTurn] = useState(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!gameState || !gameConfig || !gameConfig.turn_duration_minutes) {
             setTimeUntilNextTurn(null);
             return;
        }

        const calculateTimeUntilNext = () => {
            if (!gameState.last_turn_processed_at) return "Awaiting first turn...";

            const lastTurnTime = new Date(gameState.last_turn_processed_at);
            const turnDurationMs = (gameConfig.turn_duration_minutes) * 60 * 1000;
            const nextTurnTime = new Date(lastTurnTime.getTime() + turnDurationMs);
            const timeRemaining = nextTurnTime.getTime() - currentTime.getTime();

            if (gameState.is_processing) return "Processing...";
            if (timeRemaining <= 0) return "Processing...";

            const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
            const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

            if (hours > 0) {
                return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
            } else {
                return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
            }
        };

        const timerId = setInterval(() => {
            setTimeUntilNextTurn(calculateTimeUntilNext());
        }, 1000);

        return () => clearInterval(timerId);

    }, [currentTime, gameState, gameConfig]);

    const calculateStrataDate = () => {
        if (!gameState || !gameConfig || !gameConfig.turns_per_game_day) return 'Calculating...';
        
        const startDate = new Date('2100-01-01T00:00:00Z');
        const turnsPerDay = gameConfig.turns_per_game_day;
        const daysPassed = Math.floor((gameState.current_turn_number - 1) / turnsPerDay);
        
        startDate.setDate(startDate.getDate() + daysPassed);
        
        return startDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        });
    };
    
    if (!gameState || !gameConfig) {
        return (
            <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading Game State...</span>
                </div>
            </div>
        );
    }
    
    const strataDate = calculateStrataDate();
    const serverTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    
    return (
        <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>Strata Date</span>
                </div>
                <div className="text-white font-semibold text-lg">{strataDate}</div>
                <div className="text-slate-400 text-sm">Turn {gameState?.current_turn_number || 1}</div>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                 <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase mb-2">
                    <Clock className="w-4 h-4" />
                    <span>Server Clock</span>
                </div>
                <div className="text-white font-semibold text-lg">{serverTime}</div>
                <div className="text-slate-400 text-sm">
                    Next turn in: <span className="text-cyan-300 font-medium">{timeUntilNextTurn || 'Calculating...'}</span>
                </div>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3 text-sm">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-300">
                        <Users className="w-4 h-4 text-green-400" />
                        <span>Active Alliances</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-300">{alliances.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-300">
                        <Swords className="w-4 h-4 text-red-400" />
                        <span>Active Wars</span>
                    </div>
                    <Badge variant="secondary" className="bg-red-500/10 text-red-300">{wars.length}</Badge>
                </div>
            </div>
        </div>
    );
}
