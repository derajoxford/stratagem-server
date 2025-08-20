import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BatteryCharging, Zap } from 'lucide-react';

export default function ActionPointsBar({ currentPoints, maxPoints }) {
    const safeCurrentPoints = currentPoints ?? 0;
    const safeMaxPoints = maxPoints ?? 10;
    const percentage = safeMaxPoints > 0 ? (safeCurrentPoints / safeMaxPoints) * 100 : 0;
    const pointsNeeded = safeMaxPoints - safeCurrentPoints;

    return (
        <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg text-yellow-400 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Your Tactical Points (This War)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center text-sm text-slate-300">
                    <BatteryCharging className="w-5 h-5 mr-3 text-green-400" />
                    <div className="flex-1">
                        <p className="font-bold text-white">Tactical Energy</p>
                        <p className="text-xs text-slate-400">Command capacity available</p>
                    </div>
                    <div className="text-lg font-bold text-white">
                        {safeCurrentPoints} / {safeMaxPoints} Action Points
                    </div>
                </div>

                <Progress value={percentage} className="w-full h-3 [&>*]:bg-green-500" />
                
                <div className="text-xs text-center space-y-1">
                    {safeCurrentPoints >= safeMaxPoints ? (
                        <p className="text-green-400 flex items-center justify-center gap-1">
                            <Zap className="w-3 h-3" /> Full tactical capacity - Ready for operations
                        </p>
                    ) : (
                        <>
                            <p className="text-yellow-400 flex items-center justify-center gap-1">
                                <Zap className="w-3 h-3" /> {pointsNeeded} energy needed for maximum capacity
                            </p>
                            <p className="text-slate-400">{safeCurrentPoints} / {safeMaxPoints} points available</p>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}