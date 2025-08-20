import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Zap, DollarSign, ArrowLeftRight, Loader2, Info } from 'lucide-react';
import { Nation, GameConfig, GameState } from '@/api/entities';
import { FinancialTransaction } from '@/api/entities';

export default function ManageInfrastructure({ city, nation, onUpdate }) {
    const [pointsToBuy, setPointsToBuy] = useState(1);
    const [pointsToSell, setPointsToSell] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [gameConfig, setGameConfig] = useState(null);
    const [gameState, setGameState] = useState(null);

    useEffect(() => {
        async function loadConfig() {
            try {
                const configs = await GameConfig.list();
                if (configs.length > 0) {
                    const parsedConfig = JSON.parse(configs[0].config_data_json);
                    setGameConfig(parsedConfig);
                }
                const gameStates = await GameState.list();
                if (gameStates.length > 0) {
                    setGameState(gameStates[0]);
                }
            } catch (e) {
                console.error("Failed to load game config for infra management", e);
            }
        }
        loadConfig();
    }, []);

    const {
        baseCost,
        scalingFactor,
        sellPercentage
    } = useMemo(() => ({
        baseCost: gameConfig?.infrastructure_cost_per_point || 1000,
        scalingFactor: gameConfig?.infrastructure_scaling_factor || 1.02,
        sellPercentage: (gameConfig?.infrastructure_sell_percentage || 50) / 100
    }), [gameConfig]);


    const calculateCost = (points, startLevel) => {
        let totalCost = 0;
        for (let i = 0; i < points; i++) {
            totalCost += Math.floor(baseCost * Math.pow(scalingFactor, startLevel + i));
        }
        return totalCost;
    };

    const totalBuyCost = useMemo(() => {
        if (!pointsToBuy || isNaN(pointsToBuy) || pointsToBuy <= 0) return 0;
        return calculateCost(pointsToBuy, city.infrastructure_slots || 0);
    }, [pointsToBuy, city.infrastructure_slots, baseCost, scalingFactor]);

    const totalSellValue = useMemo(() => {
        if (!pointsToSell || isNaN(pointsToSell) || pointsToSell <= 0) return 0;
        const points = Math.min(pointsToSell, city.infrastructure_slots || 0);
        const costToBuild = calculateCost(points, (city.infrastructure_slots || 0) - points);
        return Math.floor(costToBuild * sellPercentage);
    }, [pointsToSell, city.infrastructure_slots, baseCost, scalingFactor, sellPercentage]);

    const handleBuyPoints = async () => {
        if (pointsToBuy <= 0 || totalBuyCost > nation.treasury) {
            setError("Not enough funds or invalid amount.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const currentTurn = gameState?.current_turn_number || 0;
            const updatedSlots = (city.infrastructure_slots || 0) + pointsToBuy;
            const newTreasury = nation.treasury - totalBuyCost;

            await Promise.all([
                Nation.update(nation.id, { treasury: newTreasury }),
                FinancialTransaction.create({
                    nation_id: nation.id,
                    transaction_type: 'outflow',
                    category: 'Infrastructure',
                    sub_category: `Purchase: ${pointsToBuy} Infrastructure Points`,
                    amount: totalBuyCost,
                    new_balance: newTreasury,
                    related_entity_id: city.id,
                    turn_number: currentTurn
                })
            ]);
            
            // The city update should reflect the new slots
            onUpdate({ ...city, infrastructure_slots: updatedSlots });

        } catch (e) {
            console.error("Failed to buy infrastructure points", e);
            setError("An error occurred during purchase.");
        }
        setIsLoading(false);
    };

    const handleSellPoints = async () => {
        if (pointsToSell <= 0 || pointsToSell > city.infrastructure_slots) {
            setError("Invalid amount to sell.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const currentTurn = gameState?.current_turn_number || 0;
            const updatedSlots = (city.infrastructure_slots || 0) - pointsToSell;
            const newTreasury = nation.treasury + totalSellValue;

            await Promise.all([
                Nation.update(nation.id, { treasury: newTreasury }),
                FinancialTransaction.create({
                    nation_id: nation.id,
                    transaction_type: 'inflow',
                    category: 'Infrastructure',
                    sub_category: `Sale: ${pointsToSell} Infrastructure Points`,
                    amount: totalSellValue,
                    new_balance: newTreasury,
                    related_entity_id: city.id,
                    turn_number: currentTurn
                })
            ]);
            
            onUpdate({ ...city, infrastructure_slots: updatedSlots });
        } catch (e) {
            console.error("Failed to sell infrastructure points", e);
            setError("An error occurred during sale.");
        }
        setIsLoading(false);
    };

    if (!gameConfig) {
        return <div className="flex justify-center items-center h-24"><Loader2 className="w-6 h-6 animate-spin" /></div>;
    }

    return (
        <Card className="bg-slate-800/80 border-slate-700">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Manage Infrastructure Points
                </CardTitle>
                <CardDescription>Buy or sell raw infrastructure points for this city. Each point consumes 1 power.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Buy Section */}
                    <div className="space-y-4 p-4 bg-slate-700/50 rounded-lg">
                        <h3 className="font-semibold text-white">Buy Infrastructure</h3>
                        <div>
                            <Label htmlFor="buy-points" className="text-slate-300">Points to Buy</Label>
                            <Input
                                id="buy-points"
                                type="number"
                                value={pointsToBuy}
                                onChange={(e) => setPointsToBuy(parseInt(e.target.value) || 1)}
                                min="1"
                                className="bg-slate-600 border-slate-500"
                            />
                        </div>
                        <div className="text-sm text-slate-400">
                            Total Cost: <span className="font-bold text-amber-400">${totalBuyCost.toLocaleString()}</span>
                        </div>
                        <Button onClick={handleBuyPoints} disabled={isLoading || totalBuyCost > nation.treasury} className="w-full bg-green-600 hover:bg-green-700">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4 mr-2" />}
                            Buy Points
                        </Button>
                    </div>

                    {/* Sell Section */}
                    <div className="space-y-4 p-4 bg-slate-700/50 rounded-lg">
                        <h3 className="font-semibold text-white">Sell Infrastructure</h3>
                        <div>
                            <Label htmlFor="sell-points" className="text-slate-300">Points to Sell</Label>
                            <Input
                                id="sell-points"
                                type="number"
                                value={pointsToSell}
                                onChange={(e) => setPointsToSell(parseInt(e.target.value) || 1)}
                                min="1"
                                max={city.infrastructure_slots || 0}
                                className="bg-slate-600 border-slate-500"
                            />
                        </div>
                        <div className="text-sm text-slate-400">
                            Total Value: <span className="font-bold text-green-400">${totalSellValue.toLocaleString()}</span>
                        </div>
                        <Button onClick={handleSellPoints} disabled={isLoading || pointsToSell > city.infrastructure_slots} className="w-full bg-red-600 hover:bg-red-700">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4 mr-2" />}
                            Sell Points
                        </Button>
                    </div>
                </div>
                 <Alert className="border-blue-500/30 bg-blue-500/10">
                    <Info className="h-4 w-4 text-blue-400" />
                    <AlertTitle className="text-blue-300">How Costs are Calculated</AlertTitle>
                    <AlertDescription className="text-blue-400/80 text-xs">
                        The cost of each infrastructure point increases based on how many you already have (Base Cost: ${baseCost.toLocaleString()}, Scaling: {scalingFactor}). Selling points refunds {sellPercentage * 100}% of their original purchase price.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}