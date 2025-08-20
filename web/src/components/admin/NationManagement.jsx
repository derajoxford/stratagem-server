import React, { useState, useEffect } from 'react';
import { Nation, User } from "@/api/entities";
import { Loader2, Search, Globe, Shield, Trash2, ShieldBan, ShieldCheck, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { deleteNation } from '@/api/functions';
import EditNationModal from './EditNationModal';

export default function NationManagement({ onUpdate }) {
    const [nations, setNations] = useState([]);
    const [users, setUsers] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleting, setIsDeleting] = useState(null);
    const [editingNation, setEditingNation] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        loadNationsAndUsers();
    }, []);

    const loadNationsAndUsers = async () => {
        setIsLoading(true);
        try {
            const [nationData, userData] = await Promise.all([
                Nation.list('-created_date'),
                User.list()
            ]);
            setNations(nationData);
            
            const userMap = {};
            userData.forEach(user => {
                userMap[user.email] = user;
            });
            setUsers(userMap);
            
        } catch (error) {
            console.error("Error loading nations and users:", error);
        }
        setIsLoading(false);
    };

    const handleDeleteNation = async (nationId) => {
        if (window.confirm("Are you sure you want to permanently delete this nation and all associated data? This is irreversible.")) {
            setIsDeleting(nationId);
            try {
                await deleteNation({ nation_id: nationId });
                alert('Nation deleted successfully.');
                loadNationsAndUsers();
            } catch (error) {
                console.error("Error deleting nation:", error);
                alert(`Failed to delete nation: ${error.message}`);
            } finally {
                setIsDeleting(null);
            }
        }
    };
    
    const handleToggleBlockade = async (nation) => {
        const action = nation.is_blockaded ? 'lift' : 'enforce';
        if (window.confirm(`Are you sure you want to ${action} the blockade on ${nation.name}?`)) {
            try {
                await Nation.update(nation.id, { is_blockaded: !nation.is_blockaded });
                loadNationsAndUsers();
            } catch (error) {
                console.error(`Error toggling blockade for ${nation.name}:`, error);
                alert(`Failed to ${action} blockade.`);
            }
        }
    };

    const handleEditNation = (nation) => {
        setEditingNation(nation);
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
        setEditingNation(null);
    };

    const handleSaveNation = () => {
        loadNationsAndUsers(); // Refresh the list after saving
    };

    const filteredNations = nations.filter(nation =>
        nation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nation.leader_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (users[nation.created_by]?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (users[nation.created_by]?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-400" />
                        Nation Management
                    </CardTitle>
                    <CardDescription>View, manage, and take administrative actions on all nations.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                type="text"
                                placeholder="Search by nation, leader, or player email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-slate-700 border-slate-600 pl-10 text-white"
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                            {filteredNations.map(nation => {
                                const user = users[nation.created_by];
                                return (
                                    <div key={nation.id} className="bg-slate-700/50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-white">{nation.name}</h3>
                                                {nation.is_blockaded && <Badge variant="destructive" className="animate-pulse">Blockaded</Badge>}
                                            </div>
                                            <p className="text-sm text-slate-400">Leader: {nation.leader_name}</p>
                                            {user && <p className="text-xs text-slate-500">Player: {user.full_name} ({user.email})</p>}
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Button 
                                                size="sm"
                                                variant="outline"
                                                className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                                                onClick={() => handleEditNation(nation)}
                                            >
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit
                                            </Button>
                                            <Button 
                                                size="sm"
                                                variant="outline"
                                                className={nation.is_blockaded ? "border-green-500/50 text-green-400 hover:bg-green-500/10" : "border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"}
                                                onClick={() => handleToggleBlockade(nation)}
                                            >
                                                {nation.is_blockaded ? <ShieldCheck className="w-4 h-4 mr-2" /> : <ShieldBan className="w-4 h-4 mr-2" />}
                                                {nation.is_blockaded ? 'Lift Blockade' : 'Enforce Blockade'}
                                            </Button>
                                            <Button 
                                                variant="destructive" 
                                                size="sm"
                                                onClick={() => handleDeleteNation(nation.id)}
                                                disabled={isDeleting === nation.id}
                                            >
                                                {isDeleting === nation.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <EditNationModal
                nation={editingNation}
                isOpen={isEditModalOpen}
                onClose={handleCloseEditModal}
                onSave={handleSaveNation}
            />
        </>
    );
}