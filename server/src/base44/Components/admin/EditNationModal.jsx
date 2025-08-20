import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, Globe, Coins, Shield, Package } from 'lucide-react';
import { Nation, Resource, Military, City } from '@/entities/all';

export default function EditNationModal({ nation, isOpen, onClose, onSave }) {
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [nationData, setNationData] = useState(null);
    const [resourceData, setResourceData] = useState(null);
    const [militaryData, setMilitaryData] = useState(null);
    const [cities, setCities] = useState([]);

    useEffect(() => {
        if (isOpen && nation) {
            loadNationData();
        }
    }, [isOpen, nation]);

    const loadNationData = async () => {
        setIsLoading(true);
        try {
            // Load all related data for the nation
            const [resources, military, cityData] = await Promise.all([
                Resource.filter({ nation_id: nation.id }),
                Military.filter({ nation_id: nation.id }),
                City.filter({ nation_id: nation.id })
            ]);

            setNationData({ ...nation });
            setResourceData(resources[0] || {
                nation_id: nation.id,
                oil: 0, gasoline: 0, iron: 0, steel: 0, aluminum: 0, coal: 0, uranium: 0,
                food: 0, gold: 0, bauxite: 0, copper: 0, diamonds: 0, wood: 0, ammo: 0
            });
            setMilitaryData(military[0] || {
                nation_id: nation.id,
                soldiers: 0, tanks: 0, aircraft: 0, warships: 0,
                conventional_bombs: 0, nuclear_weapons: 0
            });
            setCities(cityData || []);
        } catch (error) {
            console.error('Error loading nation data:', error);
        }
        setIsLoading(false);
    };

    const handleNationChange = (field, value) => {
        setNationData(prev => ({
            ...prev,
            [field]: field === 'treasury' || field === 'population' || field === 'territory' || field === 'cities' || field === 'military_strength'
                ? (value === '' ? 0 : parseFloat(value) || 0)
                : value
        }));
    };

    const handleResourceChange = (resource, value) => {
        setResourceData(prev => ({
            ...prev,
            [resource]: value === '' ? 0 : parseFloat(value) || 0
        }));
    };

    const handleMilitaryChange = (unit, value) => {
        setMilitaryData(prev => ({
            ...prev,
            [unit]: value === '' ? 0 : parseFloat(value) || 0
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update Nation
            await Nation.update(nation.id, {
                name: nationData.name,
                leader_name: nationData.leader_name,
                government_type: nationData.government_type,
                treasury: nationData.treasury,
                population: nationData.population,
                territory: nationData.territory,
                cities: nationData.cities,
                military_strength: nationData.military_strength,
                active: nationData.active,
                is_blockaded: nationData.is_blockaded
            });

            // Update or create Resources
            if (resourceData.id) {
                await Resource.update(resourceData.id, {
                    oil: resourceData.oil,
                    gasoline: resourceData.gasoline,
                    iron: resourceData.iron,
                    steel: resourceData.steel,
                    aluminum: resourceData.aluminum,
                    coal: resourceData.coal,
                    uranium: resourceData.uranium,
                    food: resourceData.food,
                    gold: resourceData.gold,
                    bauxite: resourceData.bauxite,
                    copper: resourceData.copper,
                    diamonds: resourceData.diamonds,
                    wood: resourceData.wood,
                    ammo: resourceData.ammo
                });
            } else {
                await Resource.create({
                    nation_id: nation.id,
                    oil: resourceData.oil,
                    gasoline: resourceData.gasoline,
                    iron: resourceData.iron,
                    steel: resourceData.steel,
                    aluminum: resourceData.aluminum,
                    coal: resourceData.coal,
                    uranium: resourceData.uranium,
                    food: resourceData.food,
                    gold: resourceData.gold,
                    bauxite: resourceData.bauxite,
                    copper: resourceData.copper,
                    diamonds: resourceData.diamonds,
                    wood: resourceData.wood,
                    ammo: resourceData.ammo
                });
            }

            // Update or create Military
            if (militaryData.id) {
                await Military.update(militaryData.id, {
                    soldiers: militaryData.soldiers,
                    tanks: militaryData.tanks,
                    aircraft: militaryData.aircraft,
                    warships: militaryData.warships,
                    conventional_bombs: militaryData.conventional_bombs,
                    nuclear_weapons: militaryData.nuclear_weapons
                });
            } else {
                await Military.create({
                    nation_id: nation.id,
                    soldiers: militaryData.soldiers,
                    tanks: militaryData.tanks,
                    aircraft: militaryData.aircraft,
                    warships: militaryData.warships,
                    conventional_bombs: militaryData.conventional_bombs,
                    nuclear_weapons: militaryData.nuclear_weapons
                });
            }

            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving nation data:', error);
            alert('Failed to save nation data. Please try again.');
        }
        setIsSaving(false);
    };

    const resourceTypes = [
        { key: 'oil', label: 'Oil', icon: '🛢️' },
        { key: 'gasoline', label: 'Gasoline', icon: '⛽' },
        { key: 'iron', label: 'Iron', icon: '⚙️' },
        { key: 'steel', label: 'Steel', icon: '🔩' },
        { key: 'aluminum', label: 'Aluminum', icon: '🥤' },
        { key: 'coal', label: 'Coal', icon: '⚫' },
        { key: 'uranium', label: 'Uranium', icon: '☢️' },
        { key: 'food', label: 'Food', icon: '🌾' },
        { key: 'gold', label: 'Gold', icon: '🏆' },
        { key: 'bauxite', label: 'Bauxite', icon: '🪨' },
        { key: 'copper', label: 'Copper', icon: '🟫' },
        { key: 'diamonds', label: 'Diamonds', icon: '💎' },
        { key: 'wood', label: 'Wood', icon: '🪵' },
        { key: 'ammo', label: 'Ammunition', icon: '🔫' }
    ];

    const militaryTypes = [
        { key: 'soldiers', label: 'Soldiers', icon: '👥' },
        { key: 'tanks', label: 'Tanks', icon: '🚗' },
        { key: 'aircraft', label: 'Aircraft', icon: '✈️' },
        { key: 'warships', label: 'Warships', icon: '🚢' },
        { key: 'conventional_bombs', label: 'Conventional Bombs', icon: '💣' },
        { key: 'nuclear_weapons', label: 'Nuclear Weapons', icon: '☢️' }
    ];

    if (!isOpen || !nation) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-400" />
                        Edit Nation: {nation.name}
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                    </div>
                ) : (
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 bg-slate-700">
                            <TabsTrigger value="general">General</TabsTrigger>
                            <TabsTrigger value="resources">Resources</TabsTrigger>
                            <TabsTrigger value="military">Military</TabsTrigger>
                            <TabsTrigger value="cities">Cities</TabsTrigger>
                        </TabsList>

                        <TabsContent value="general" className="space-y-4">
                            <Card className="bg-slate-700/50 border-slate-600">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Globe className="w-4 h-4 text-blue-400" />
                                        Nation Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-slate-300">Nation Name</Label>
                                            <Input
                                                value={nationData?.name || ''}
                                                onChange={(e) => handleNationChange('name', e.target.value)}
                                                className="bg-slate-600 border-slate-500 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Leader Name</Label>
                                            <Input
                                                value={nationData?.leader_name || ''}
                                                onChange={(e) => handleNationChange('leader_name', e.target.value)}
                                                className="bg-slate-600 border-slate-500 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Government Type</Label>
                                            <Select value={nationData?.government_type || 'democracy'} onValueChange={(value) => handleNationChange('government_type', value)}>
                                                <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="democracy">Democracy</SelectItem>
                                                    <SelectItem value="republic">Republic</SelectItem>
                                                    <SelectItem value="monarchy">Monarchy</SelectItem>
                                                    <SelectItem value="dictatorship">Dictatorship</SelectItem>
                                                    <SelectItem value="federation">Federation</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Treasury ($)</Label>
                                            <Input
                                                type="number"
                                                value={nationData?.treasury || ''}
                                                onChange={(e) => handleNationChange('treasury', e.target.value)}
                                                className="bg-slate-600 border-slate-500 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Population</Label>
                                            <Input
                                                type="number"
                                                value={nationData?.population || ''}
                                                onChange={(e) => handleNationChange('population', e.target.value)}
                                                className="bg-slate-600 border-slate-500 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Territory (acres)</Label>
                                            <Input
                                                type="number"
                                                value={nationData?.territory || ''}
                                                onChange={(e) => handleNationChange('territory', e.target.value)}
                                                className="bg-slate-600 border-slate-500 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Number of Cities</Label>
                                            <Input
                                                type="number"
                                                value={nationData?.cities || ''}
                                                onChange={(e) => handleNationChange('cities', e.target.value)}
                                                className="bg-slate-600 border-slate-500 text-white"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Military Strength</Label>
                                            <Input
                                                type="number"
                                                value={nationData?.military_strength || ''}
                                                onChange={(e) => handleNationChange('military_strength', e.target.value)}
                                                className="bg-slate-600 border-slate-500 text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={nationData?.active || false}
                                                onChange={(e) => handleNationChange('active', e.target.checked)}
                                                className="rounded"
                                            />
                                            <span className="text-slate-300">Active</span>
                                        </label>
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={nationData?.is_blockaded || false}
                                                onChange={(e) => handleNationChange('is_blockaded', e.target.checked)}
                                                className="rounded"
                                            />
                                            <span className="text-slate-300">Under Blockade</span>
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="resources" className="space-y-4">
                            <Card className="bg-slate-700/50 border-slate-600">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Package className="w-4 h-4 text-green-400" />
                                        Resource Stockpiles
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {resourceTypes.map(resource => (
                                            <div key={resource.key}>
                                                <Label className="text-slate-300 flex items-center gap-1">
                                                    <span>{resource.icon}</span>
                                                    {resource.label}
                                                </Label>
                                                <Input
                                                    type="number"
                                                    value={resourceData?.[resource.key] || ''}
                                                    onChange={(e) => handleResourceChange(resource.key, e.target.value)}
                                                    className="bg-slate-600 border-slate-500 text-white"
                                                    placeholder="0"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="military" className="space-y-4">
                            <Card className="bg-slate-700/50 border-slate-600">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-red-400" />
                                        Military Forces
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {militaryTypes.map(unit => (
                                            <div key={unit.key}>
                                                <Label className="text-slate-300 flex items-center gap-1">
                                                    <span>{unit.icon}</span>
                                                    {unit.label}
                                                </Label>
                                                <Input
                                                    type="number"
                                                    value={militaryData?.[unit.key] || ''}
                                                    onChange={(e) => handleMilitaryChange(unit.key, e.target.value)}
                                                    className="bg-slate-600 border-slate-500 text-white"
                                                    placeholder="0"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="cities" className="space-y-4">
                            <Card className="bg-slate-700/50 border-slate-600">
                                <CardHeader>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Coins className="w-4 h-4 text-yellow-400" />
                                        Cities Overview
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {cities.length > 0 ? (
                                        <div className="space-y-3">
                                            {cities.map(city => (
                                                <div key={city.id} className="p-3 bg-slate-600/50 rounded-lg">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <h4 className="font-medium text-white">{city.name}</h4>
                                                            <p className="text-sm text-slate-400">
                                                                Pop: {city.population?.toLocaleString()} | 
                                                                Land: {city.land_area} acres | 
                                                                Infra: {city.infrastructure_slots} points
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-green-400 font-medium">
                                                                ${(city.income_per_turn || 0).toLocaleString()}/turn
                                                            </p>
                                                            <p className="text-xs text-slate-400">Income</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400">No cities found for this nation.</p>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
