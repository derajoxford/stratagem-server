import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { City, Nation } from "@/entities/all";
import { MapPin, Wrench, DollarSign, Building2, Loader2, Calculator } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function BulkCityManagement({ nation, cities, gameConfig, onUpdate }) {
    const [landQuantity, setLandQuantity] = useState(1);
    const [infraQuantity, setInfraQuantity] = useState(50);
    const [isProcessing, setIsProcessing] = useState(false);
    const [feedback, setFeedback] = useState(null);

    // Calculate costs
    const landCostPerUnit = (gameConfig?.city_creation_base_cost || 500000) / 100;
    const infraCostPerUnit = gameConfig?.infrastructure_cost_per_point || 1000;
    
    const totalLandCost = landCostPerUnit * landQuantity * cities.length;
    const totalInfraCost = infraCostPerUnit * infraQuantity * cities.length;

    const canAffordLand = (nation?.treasury || 0) >= totalLandCost;
    const canAffordInfra = (nation?.treasury || 0) >= totalInfraCost;

    const handleBulkLandPurchase = async () => {
        if (!canAffordLand || landQuantity <= 0) return;
        
        setIsProcessing(true);
        setFeedback({ type: 'info', message: `Purchasing ${landQuantity} acres for ${cities.length} cities...` });

        try {
            const updatePromises = cities.map(city => 
                City.update(city.id, { 
                    land_area: (city.land_area || 0) + landQuantity 
                })
            );
            
            updatePromises.push(
                Nation.update(nation.id, { 
                    treasury: (nation.treasury || 0) - totalLandCost 
                })
            );

            await Promise.all(updatePromises);
            
            setFeedback({ type: 'success', message: `Successfully purchased ${landQuantity} acres for all ${cities.length} cities!` });
            onUpdate();
        } catch (error) {
            console.error("Error purchasing land:", error);
            setFeedback({ type: 'error', message: 'Failed to purchase land. Please try again.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkInfraPurchase = async () => {
        if (!canAffordInfra || infraQuantity <= 0) return;
        
        setIsProcessing(true);
        setFeedback({ type: 'info', message: `Purchasing ${infraQuantity} infrastructure points for ${cities.length} cities...` });

        try {
            const updatePromises = cities.map(city => 
                City.update(city.id, { 
                    infrastructure_slots: (city.infrastructure_slots || 0) + infraQuantity 
                })
            );
            
            updatePromises.push(
                Nation.update(nation.id, { 
                    treasury: (nation.treasury || 0) - totalInfraCost 
                })
            );

            await Promise.all(updatePromises);
            
            setFeedback({ type: 'success', message: `Successfully purchased ${infraQuantity} infrastructure points for all ${cities.length} cities!` });
            onUpdate();
        } catch (error) {
            console.error("Error purchasing infrastructure:", error);
            setFeedback({ type: 'error', message: 'Failed to purchase infrastructure. Please try again.' });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-purple-400" />
                    Bulk City Management
                </CardTitle>
                <div className="flex gap-2 pt-2">
                    <Badge className="bg-blue-500/20 text-blue-400">
                        {cities.length} Cities
                    </Badge>
                    <Badge className="bg-green-500/20 text-green-400">
                        ${(nation?.treasury || 0).toLocaleString()} Treasury
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="land" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                        <TabsTrigger value="land" className="data-[state=active]:bg-slate-600">
                            <MapPin className="w-4 h-4 mr-2" />
                            Bulk Land
                        </TabsTrigger>
                        <TabsTrigger value="infra" className="data-[state=active]:bg-slate-600">
                            <Wrench className="w-4 h-4 mr-2" />
                            Bulk Infrastructure
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="land" className="space-y-4 mt-4">
                        <div className="p-4 bg-slate-700/50 rounded-lg">
                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                <div>
                                    <span className="text-slate-400">Cost per acre:</span>
                                    <span className="text-white ml-2">${landCostPerUnit.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Cities affected:</span>
                                    <span className="text-white ml-2">{cities.length}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div>
                                    <Label htmlFor="landQty" className="text-slate-300">Acres per city</Label>
                                    <Input
                                        id="landQty"
                                        type="number"
                                        value={landQuantity}
                                        onChange={(e) => setLandQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="bg-slate-700 border-slate-600"
                                        min="1"
                                        disabled={isProcessing}
                                    />
                                </div>
                                
                                <div className="p-3 bg-slate-800 rounded border">
                                    <div className="flex justify-between items-center text-lg">
                                        <span className="text-slate-300">Total Cost:</span>
                                        <span className={`font-bold ${canAffordLand ? 'text-green-400' : 'text-red-400'}`}>
                                            ${totalLandCost.toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {landQuantity} acres × {cities.length} cities × ${landCostPerUnit.toLocaleString()}/acre
                                    </p>
                                </div>

                                <Button 
                                    onClick={handleBulkLandPurchase}
                                    disabled={!canAffordLand || landQuantity <= 0 || isProcessing}
                                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <MapPin className="w-4 h-4 mr-2" />
                                    )}
                                    Purchase Land for All Cities
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="infra" className="space-y-4 mt-4">
                        <div className="p-4 bg-slate-700/50 rounded-lg">
                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                <div>
                                    <span className="text-slate-400">Cost per point:</span>
                                    <span className="text-white ml-2">${infraCostPerUnit.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Cities affected:</span>
                                    <span className="text-white ml-2">{cities.length}</span>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <div>
                                    <Label htmlFor="infraQty" className="text-slate-300">Infrastructure points per city</Label>
                                    <Input
                                        id="infraQty"
                                        type="number"
                                        value={infraQuantity}
                                        onChange={(e) => setInfraQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="bg-slate-700 border-slate-600"
                                        min="1"
                                        step="50"
                                        disabled={isProcessing}
                                    />
                                    <p className="text-xs text-slate-400 mt-1">
                                        Tip: Every 50 points = 1 building slot
                                    </p>
                                </div>
                                
                                <div className="p-3 bg-slate-800 rounded border">
                                    <div className="flex justify-between items-center text-lg">
                                        <span className="text-slate-300">Total Cost:</span>
                                        <span className={`font-bold ${canAffordInfra ? 'text-green-400' : 'text-red-400'}`}>
                                            ${totalInfraCost.toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {infraQuantity} points × {cities.length} cities × ${infraCostPerUnit.toLocaleString()}/point
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Total building slots gained: {Math.floor(infraQuantity / 50) * cities.length}
                                    </p>
                                </div>

                                <Button 
                                    onClick={handleBulkInfraPurchase}
                                    disabled={!canAffordInfra || infraQuantity <= 0 || isProcessing}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Wrench className="w-4 h-4 mr-2" />
                                    )}
                                    Purchase Infrastructure for All Cities
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                {feedback && (
                    <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 text-sm ${
                        feedback.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        feedback.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}>
                        {feedback.type === 'success' && <Building2 className="w-4 h-4 mt-0.5" />}
                        {feedback.type === 'error' && <Building2 className="w-4 h-4 mt-0.5" />}
                        {feedback.type === 'info' && <Loader2 className="w-4 h-4 mt-0.5 animate-spin" />}
                        <span>{feedback.message}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
