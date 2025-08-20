
import React from 'react';
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Coins, Shield, Map, Building, Atom, Bomb, Ship, Plane, ShieldBan, Mail, X, Swords } from 'lucide-react'; // Added Swords icon
import { Button } from "@/components/ui/button";

export default function NationDetailsModal({ isOpen, onClose, nation, military, resources, onDeclareWar, onSendMessage }) {
    if (!isOpen || !nation) return null;

    const handleOpenCompose = () => {
        if (onSendMessage) {
            onSendMessage({ recipientNationId: nation.id });
        }
    };
    
    const handleDeclareWarClick = () => {
        if (onDeclareWar) {
            onDeclareWar(nation);
        }
    };

    const militaryDetails = [
        { name: 'Soldiers', value: military?.soldiers, icon: Users },
        { name: 'Tanks', value: military?.tanks, icon: Shield },
        { name: 'Aircraft', value: military?.aircraft, icon: Plane },
        { name: 'Warships', value: military?.warships, icon: Ship },
        { name: 'Conventional Bombs', value: military?.conventional_bombs, icon: Bomb },
        { name: 'Nuclear Weapons', value: military?.nuclear_weapons, icon: Atom },
    ];

    // Helper function to determine government type badge color
    const getGovernmentColor = (governmentType) => {
        switch (governmentType?.toLowerCase()) {
            case 'democracy':
                return 'bg-blue-600 text-white border-blue-600';
            case 'communism':
                return 'bg-red-600 text-white border-red-600';
            case 'dictatorship':
                return 'bg-gray-700 text-white border-gray-700';
            case 'monarchy':
                return 'bg-yellow-600 text-black border-yellow-600';
            case 'theocracy':
                return 'bg-purple-600 text-white border-purple-600';
            default:
                return 'bg-slate-500 text-white border-slate-500';
        }
    };

    return (
        <>
            {isOpen && ( // Conditionally render the modal wrapper
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"> {/* Adjusted max-w, bg-color, added max-h and flex-col for scrolling */}
                        {/* Header Section */}
                        <div className="p-6 border-b border-slate-700 flex justify-between items-start">
                            <div className="flex flex-col">
                                <div className="flex flex-wrap items-center gap-4 mb-2">
                                    <h2 className="text-2xl font-bold text-amber-400">{nation.name}</h2> {/* Replaced DialogTitle, preserved text-amber-400 */}
                                    {nation.is_blockaded && (
                                        <Badge variant="destructive" className="animate-pulse">
                                            <ShieldBan className="w-4 h-4 mr-2" />
                                            Under Naval Blockade
                                        </Badge>
                                    )}
                                    <Badge variant="outline" className={`${getGovernmentColor(nation.government_type)}`}>
                                        {nation.government_type}
                                    </Badge>
                                </div>
                                <p className="text-slate-400">Led by {nation.leader_name}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="destructive" onClick={handleDeclareWarClick}>
                                    <Swords className="w-4 h-4 mr-2" />
                                    Declare War
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleOpenCompose}>
                                    <Mail className="w-4 h-4 mr-2" />
                                    Message
                                </Button>
                                <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>

                        {/* Scrollable Content Area */}
                        <div className="overflow-y-auto p-6 flex-grow">
                            {/* CardContent is used here to maintain its inherent padding and spacing properties */}
                            <CardContent className="space-y-6 p-0"> {/* Removed pt-0 as parent div provides padding, used p-0 for CardContent */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div className="bg-slate-700/50 p-3 rounded-lg">
                                        <Users className="w-6 h-6 mx-auto text-blue-400 mb-2"/>
                                        <p className="text-sm text-slate-400">Population</p>
                                        <p className="font-bold text-white">{nation.population?.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-slate-700/50 p-3 rounded-lg">
                                        <Coins className="w-6 h-6 mx-auto text-green-400 mb-2"/>
                                        <p className="text-sm text-slate-400">Treasury</p>
                                        <p className="font-bold text-white">${nation.treasury?.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-slate-700/50 p-3 rounded-lg">
                                        <Building className="w-6 h-6 mx-auto text-indigo-400 mb-2"/>
                                        <p className="text-sm text-slate-400">Cities</p>
                                        <p className="font-bold text-white">{nation.cities}</p>
                                    </div>
                                    <div className="bg-slate-700/50 p-3 rounded-lg">
                                        <Map className="w-6 h-6 mx-auto text-orange-400 mb-2"/>
                                        <p className="text-sm text-slate-400">Territory</p>
                                        <p className="font-bold text-white">{nation.territory?.toLocaleString()} ac</p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-white mb-3">Military Forces</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {militaryDetails.map(item => (
                                            <div key={item.name} className="flex items-center gap-3 p-2 bg-slate-700/50 rounded-md">
                                                <item.icon className="w-5 h-5 text-red-400"/>
                                                <div>
                                                    <p className="text-sm text-slate-400">{item.name}</p>
                                                    <p className="font-medium text-white">{item.value?.toLocaleString() || 0}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
