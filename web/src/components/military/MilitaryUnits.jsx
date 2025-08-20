
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label'; // Added Label import
import { Shield, Plus, Minus, Loader2, AlertTriangle, Users, Ship, Plane, Bomb, Biohazard, DollarSign, Home, Maximize2, ShieldBan } from 'lucide-react';
import { Nation, Military, Resource, FinancialTransaction, GameState } from '@/api/entities';
import { ResourceTransaction } from "@/api/entities";

export default function MilitaryUnits({ nation, military, resources, cities, gameConfig, onUpdate }) {
    const [quantities, setQuantities] = useState({}); // Changed from purchaseAmounts
    const [isProcessing, setIsProcessing] = useState(false); // Renamed from isLoading for consistency
    const [feedback, setFeedback] = useState({ message: '', type: 'info' });

    // Calculate military base and airport capacities
    const totalMilitaryBases = cities?.reduce((sum, city) => sum + (city.infrastructure?.military_bases || 0), 0) || 0;
    const totalAirports = cities?.reduce((sum, city) => sum + (city.infrastructure?.airports || 0), 0) || 0;
    const totalSeaports = cities?.reduce((sum, city) => sum + (city.infrastructure?.seaports || 0), 0) || 0;
    const totalBombFactories = cities?.reduce((sum, city) => sum + (city.infrastructure?.bomb_factories || 0), 0) || 0;
    const totalHEWCenters = cities?.reduce((sum, city) => sum + (city.infrastructure?.high_energy_weapons_center || 0), 0) || 0;

    const militaryBaseCapacities = gameConfig?.military_base_unit_capacities || { soldiers: 10000, tanks: 1000 };
    const airportCapacities = gameConfig?.airport_unit_capacities || { aircraft: 20 };
    const seaportCapacities = gameConfig?.seaport_unit_capacities || { warships: 5 };
    const bombFactoryCapacities = gameConfig?.bomb_factory_unit_capacities || { conventional_bombs: 50 };
    const hewCenterCapacities = gameConfig?.high_energy_weapons_center_capacities || { nuclear_weapons: 1 };

    const maxSoldiers = totalMilitaryBases * (militaryBaseCapacities.soldiers || 0);
    const maxTanks = totalMilitaryBases * (militaryBaseCapacities.tanks || 0);
    const maxAircraft = totalAirports * (airportCapacities.aircraft || 0);
    const maxWarships = totalSeaports * (seaportCapacities.warships || 0);
    const maxConventionalBombs = totalBombFactories * (bombFactoryCapacities.conventional_bombs || 0);
    const maxNuclearWeapons = totalHEWCenters * (hewCenterCapacities.nuclear_weapons || 0);

    const getUnitCapacity = (unitType) => {
        switch (unitType) {
            case 'soldiers': return maxSoldiers;
            case 'tanks': return maxTanks;
            case 'aircraft': return maxAircraft;
            case 'warships': return maxWarships;
            case 'conventional_bombs': return maxConventionalBombs;
            case 'nuclear_weapons': return maxNuclearWeapons;
            default: return 0;
        }
    };

    const getHousingInfo = (housingType) => {
        switch (housingType) {
            case 'military_bases': return totalMilitaryBases;
            case 'airports': return totalAirports;
            case 'seaports': return totalSeaports;
            case 'bomb_factories': return totalBombFactories;
            case 'high_energy_weapons_center': return totalHEWCenters;
            default: return 0;
        }
    };

    const unitConfigs = [
        {
            type: 'soldiers',
            name: 'Infantry',
            description: 'Ground forces for territorial control and occupation',
            icon: '👤',
            color: 'blue',
            cost: gameConfig?.soldiers_cost?.money || 1000,
            resourceRequirements: gameConfig?.soldiers_cost?.resources || { steel: 1 },
            capacity: getUnitCapacity('soldiers'),
            housingType: 'military_bases'
        },
        {
            type: 'tanks',
            name: 'Armored Units',
            description: 'Heavy armor for breakthrough operations and defense',
            icon: '🚗',
            color: 'orange',
            cost: gameConfig?.tanks_cost?.money || 10000,
            resourceRequirements: gameConfig?.tanks_cost?.resources || { steel: 10, aluminum: 5 },
            capacity: getUnitCapacity('tanks'),
            housingType: 'military_bases'
        },
        {
            type: 'aircraft',
            name: 'Air Force',
            description: 'Strategic air power for precision strikes and air superiority',
            icon: '✈️',
            color: 'sky',
            cost: gameConfig?.aircraft_cost?.money || 50000,
            resourceRequirements: gameConfig?.aircraft_cost?.resources || { steel: 25, aluminum: 15 },
            capacity: getUnitCapacity('aircraft'),
            housingType: 'airports'
        },
        {
            type: 'warships',
            name: 'Naval Fleet',
            description: 'Naval dominance and power projection across the seas',
            icon: '🚢',
            color: 'blue',
            cost: gameConfig?.warships_cost?.money || 100000,
            resourceRequirements: gameConfig?.warships_cost?.resources || { steel: 50, aluminum: 10 },
            capacity: getUnitCapacity('warships'),
            housingType: 'seaports'
        },
        {
            type: 'conventional_bombs',
            name: 'Conventional Bombs',
            description: 'High-explosive ordnance for infrastructure destruction',
            icon: '💣',
            color: 'red',
            cost: gameConfig?.conventional_bombs_cost?.money || 25000,
            resourceRequirements: gameConfig?.conventional_bombs_cost?.resources || { steel: 5, uranium: 1 },
            capacity: getUnitCapacity('conventional_bombs'),
            housingType: 'bomb_factories'
        },
        {
            type: 'nuclear_weapons',
            name: 'Nuclear Arsenal',
            description: 'Ultimate deterrent and weapons of mass destruction',
            icon: '☢️',
            color: 'purple',
            cost: gameConfig?.nuclear_weapons_cost?.money || 500000,
            resourceRequirements: gameConfig?.nuclear_weapons_cost?.resources || { uranium: 50, steel: 10 },
            capacity: getUnitCapacity('nuclear_weapons'),
            housingType: 'high_energy_weapons_center'
        }
    ];

    const handleQuantityChange = (unitType, value) => {
        setQuantities(prev => ({ ...prev, [unitType]: value }));
    };

    const handleMaxQuantity = (unitType) => {
        const config = unitConfigs.find(uc => uc.type === unitType);
        if (!config || !nation || !resources) return;

        const currentCount = military?.[config.type] || 0;

        // Calculate max based on treasury
        const maxByTreasury = Math.floor((nation.treasury || 0) / config.cost);
        
        // Calculate max based on resources
        let maxByResources = Infinity;
        for (const [resource, qty] of Object.entries(config.resourceRequirements)) {
            if (qty > 0) {
                const availableResource = resources[resource] || 0;
                maxByResources = Math.min(maxByResources, Math.floor(availableResource / qty));
            }
        }
        if (maxByResources === Infinity) maxByResources = maxByTreasury; // If no resources needed, treasury is the limit

        // Calculate max based on housing capacity
        let maxByCapacity = Infinity;
        if (config.capacity !== Infinity) {
            maxByCapacity = Math.max(0, config.capacity - currentCount);
        }

        const maxPurchase = Math.max(0, Math.min(maxByTreasury, maxByResources, maxByCapacity));
        setQuantities(prev => ({ ...prev, [unitType]: maxPurchase }));
    };

    const handlePurchase = async (config) => {
        const amount = quantities[config.type] || 0;
        if (amount <= 0) {
            setFeedback({ message: 'Please enter a valid amount to purchase.', type: 'error' });
            return;
        }

        setIsProcessing(true);
        setFeedback({ message: '', type: 'info' });

        try {
            const [gameStateData] = await Promise.all([
                GameState.list().then(res => res[0]) // Assuming GameState.list() returns an array
            ]);
            const currentTurn = gameStateData?.current_turn_number || 0;

            const totalCost = amount * config.cost;

            // Treasury check
            if (nation.treasury < totalCost) {
                throw new Error('Insufficient funds.');
            }

            // Resource check
            for (const [resource, qty] of Object.entries(config.resourceRequirements)) {
                if ((resources[resource] || 0) < amount * qty) {
                    throw new Error(`Insufficient ${resource}. Need ${amount * qty}, have ${resources[resource] || 0}.`);
                }
            }

            // Capacity Check
            if (config.capacity !== Infinity) {
                const currentAmount = military?.[config.type] || 0;
                const totalCapacity = config.capacity;
                if (currentAmount + amount > totalCapacity) {
                    let housingTypeName = config.housingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    throw new Error(`Insufficient housing capacity for ${config.name}. You can house ${totalCapacity.toLocaleString()}, but you need space for ${(currentAmount + amount).toLocaleString()}. Build more ${housingTypeName}.`);
                }
            }

            // Update Nation Treasury
            const newTreasury = nation.treasury - totalCost;
            
            // Update Military
            const newMilitaryCount = (military[config.type] || 0) + amount;

            // Prepare new resources object and resource transaction promises
            const newResources = { ...resources };
            let resourcesChanged = false;
            const resourceTransactionPromises = [];

            for (const [resourceType, requiredPerUnit] of Object.entries(config.resourceRequirements)) {
                if (requiredPerUnit > 0) {
                    newResources[resourceType] -= amount * requiredPerUnit;
                    resourcesChanged = true;

                    resourceTransactionPromises.push(
                        ResourceTransaction.create({
                            nation_id: nation.id,
                            resource_type: resourceType,
                            transaction_type: 'outflow',
                            category: 'Military',
                            sub_category: `Purchase: ${amount}x ${config.name}`,
                            amount: amount * requiredPerUnit,
                            new_stockpile: newResources[resourceType], // Use the final new stock
                            turn_number: currentTurn
                        })
                    );
                }
            }
            
            await Promise.all([
                Nation.update(nation.id, { treasury: newTreasury }),
                Military.update(military.id, { [config.type]: newMilitaryCount }),
                resourcesChanged ? Resource.update(resources.id, newResources) : Promise.resolve(), // Only update Resources if changes occurred
                FinancialTransaction.create({
                    nation_id: nation.id,
                    transaction_type: 'outflow',
                    category: 'Military',
                    sub_category: `Purchase: ${amount}x ${config.name}`,
                    amount: totalCost,
                    new_balance: newTreasury,
                    turn_number: currentTurn
                }),
                ...resourceTransactionPromises // Include the new promises
            ]);

            setFeedback({ message: `Successfully purchased ${amount.toLocaleString()} ${config.name}.`, type: 'success' });
            setQuantities(prev => ({ ...prev, [config.type]: '' }));
            onUpdate();
        } catch (error) {
            setFeedback({ message: `Purchase failed: ${error.message}`, type: 'error' });
        }

        setIsProcessing(false);
    };

    const colorClassMap = {
        blue: { badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30', bar: 'bg-blue-500' },
        orange: { badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', bar: 'bg-orange-500' },
        sky: { badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30', bar: 'bg-sky-500' },
        red: { badge: 'bg-red-500/20 text-red-400 border-red-500/30', bar: 'bg-red-500' },
        purple: { badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30', bar: 'bg-purple-500' },
    };

    const UnitCard = ({ config }) => {
        const currentCount = military?.[config.type] || 0;
        const quantity = quantities[config.type] || 1; // Default to 1 if not set
        const totalCost = quantity * config.cost;

        const maxAffordable = Math.floor((nation?.treasury || 0) / config.cost);
        
        let maxByResources = Infinity;
        for (const [resource, required] of Object.entries(config.resourceRequirements)) {
            if (required > 0) {
                const available = resources?.[resource] || 0;
                maxByResources = Math.min(maxByResources, Math.floor(available / required));
            }
        }
        if (Object.keys(config.resourceRequirements).length === 0 || maxByResources === Infinity) {
            maxByResources = maxAffordable; // If no specific resources, base it on money
        }

        const maxByCapacity = config.capacity === Infinity ? Infinity : Math.max(0, config.capacity - currentCount);

        const calculatedMaxPurchase = Math.max(0, Math.min(maxAffordable, maxByResources, maxByCapacity));

        const canAfford = nation?.treasury >= totalCost;
        
        // Check resource requirements for the 'quantity' entered by user
        const hasRequiredResources = Object.entries(config.resourceRequirements).every(([resource, required]) => {
            const available = resources?.[resource] || 0;
            const totalRequired = required * quantity;
            return available >= totalRequired;
        });

        // Check capacity for the 'quantity' entered by user
        const hasCapacity = config.capacity === Infinity || (currentCount + quantity <= config.capacity);
        
        const canPurchase = quantity > 0 && canAfford && hasRequiredResources && hasCapacity && !isProcessing;

        // Filter out resources that are not required (i.e., required quantity is 0)
        const requiredResourceEntries = Object.entries(config.resourceRequirements).filter(([_, required]) => required > 0);


        // Determine badge class
        const badgeColorClass = colorClassMap[config.color]?.badge || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
        const barColorClass = colorClassMap[config.color]?.bar || 'bg-slate-500';

        return (
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="text-3xl">{config.icon}</div>
                            <div>
                                <CardTitle className="text-white text-xl">{config.name}</CardTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className={badgeColorClass}>
                                        Active: {currentCount.toLocaleString()} / {config.capacity.toLocaleString()}
                                        {config.capacity < 999999 && ` (${getHousingInfo(config.housingType)})`}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-green-400">
                                ${config.cost.toLocaleString()}
                            </div>
                            <div className="text-sm text-slate-400">per unit</div>
                        </div>
                    </div>
                    
                    <div className="w-full bg-slate-700 rounded-full h-2 mt-3">
                        <div 
                            className={`${barColorClass} h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${Math.min((currentCount / config.capacity) * 100, 100)}%` }}
                        ></div>
                    </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                    <p className="text-slate-400 text-sm">{config.description}</p>
                    
                    <div className="space-y-3">
                        <h4 className="text-white font-medium">Resource Requirements:</h4>
                        <div className="flex flex-wrap gap-2">
                            {requiredResourceEntries.length > 0 ? (
                                requiredResourceEntries.map(([resource, required]) => {
                                    const available = resources?.[resource] || 0;
                                    const totalRequired = required * quantity;
                                    const hasEnough = available >= totalRequired;
                                    
                                    return (
                                        <Badge 
                                            key={resource}
                                            className={`${
                                                hasEnough 
                                                    ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                                            }`}
                                        >
                                            {totalRequired} {resource} (Have: {available.toLocaleString()})
                                        </Badge>
                                    );
                                })
                            ) : (
                                <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
                                    No specific resource requirements
                                </Badge>
                            )}
                        </div>
                        
                        {config.capacity < 999999 && (
                            <p className="text-slate-500 text-xs">
                                Requires: {config.housingType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} {getHousingInfo(config.housingType) === 0 ? '(None Built)' : `(${getHousingInfo(config.housingType)} Built)`}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <Label htmlFor={`quantity-${config.type}`} className="text-slate-300 text-sm">
                                Quantity
                            </Label>
                            <Input
                                id={`quantity-${config.type}`}
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => handleQuantityChange(config.type, parseInt(e.target.value) || 0)}
                                className="bg-slate-700 border-slate-600 text-white mt-1 placeholder:text-slate-500"
                                disabled={isProcessing || calculatedMaxPurchase <= 0}
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMaxQuantity(config.type)}
                            disabled={isProcessing || calculatedMaxPurchase <= 0}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700 self-end"
                            title={`Buy maximum (${calculatedMaxPurchase.toLocaleString()})`}
                        >
                            <Maximize2 className="w-4 h-4" />
                        </Button>
                        <div className="text-right min-w-24">
                            <div className="text-slate-400 text-xs">Total Cost</div>
                            <div className="text-white font-bold">
                                ${totalCost.toLocaleString()}
                            </div>
                        </div>
                        <Button
                            onClick={() => handlePurchase(config)}
                            disabled={!canPurchase || isProcessing}
                            className={`min-w-16 ${canPurchase ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-600'}`}
                        >
                            {isProcessing && quantities[config.type] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                        </Button>
                    </div>

                    {calculatedMaxPurchase > 0 && (
                        <div className="text-xs text-blue-400 mt-2 flex items-center gap-1">
                            <Maximize2 className="w-3 h-3" />
                            Max: {calculatedMaxPurchase.toLocaleString()} units
                        </div>
                    )}

                    {quantity > 0 && (
                        <>
                            {!canAfford && (
                                <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    Insufficient funds
                                </div>
                            )}
                            {!hasRequiredResources && (
                                <div className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Insufficient resources
                                </div>
                            )}
                            {!hasCapacity && (
                                <div className="text-xs text-red-400 mt-2 flex items-center gap-1">
                                    <Home className="w-3 h-3" />
                                    Insufficient housing capacity
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        );
    };

    // Overall loading check for the MilitaryUnits component itself
    const isLoadingData = !nation || !military || !resources || !cities || !gameConfig;

    if (isLoadingData) {
        return (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-600 backdrop-blur-sm">
                <div className="p-8 text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-amber-400 mx-auto" />
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">Loading Arsenal</h3>
                        <p className="text-slate-400">Accessing military databases...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Card className="bg-slate-800/60 border-slate-700">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-6 h-6 text-amber-400" />
                    Military Procurement
                </CardTitle>
                <CardDescription className="text-slate-400">
                    Build and expand your nation's military forces
                </CardDescription>
            </CardHeader>
            <CardContent>
                {feedback.message && (
                    <div className={`mb-4 p-3 rounded-lg ${
                        feedback.type === 'success'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                    }`}>
                        {feedback.message}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {unitConfigs.map((config) => (
                        <UnitCard key={config.type} config={config} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
