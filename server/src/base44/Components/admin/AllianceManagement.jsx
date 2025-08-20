
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Users,
    Crown,
    Settings,
    UserCog,
    Shield,
    Trash2,
    Save,
    Plus,
    AlertTriangle,
    CheckCircle
} from "lucide-react";
import { Alliance, Nation } from "@/entities/all";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function AllianceManagement() {
    const [alliances, setAlliances] = useState([]);
    const [selectedAlliance, setSelectedAlliance] = useState(null);
    const [allianceMembers, setAllianceMembers] = useState([]);
    const [allNations, setAllNations] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [allianceToDelete, setAllianceToDelete] = useState(null);
    const [feedback, setFeedback] = useState(null);

    // New state for role management
    const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
    const [showEditRoleModal, setShowEditRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState(null); // Stores the ID of the role being edited
    const [roleForm, setRoleForm] = useState({
        id: '',
        title: '',
        rank: 50, // Default rank
        permissions: {
            manage_alliance: false,
            manage_members: false,
            manage_roles: false,
            manage_bank: false,
            withdraw_funds: false,
            send_invitations: false,
            review_applications: false,
            manage_treaties: false,
            disband_alliance: false
        }
    });

    // Form state for alliance editing
    const [editForm, setEditForm] = useState({
        name: "",
        description: "",
        treasury: 0,
        tax_rate: 0
    });

    useEffect(() => {
        loadAllianceData();
    }, []);

    const loadAllianceData = async () => {
        setIsLoading(true);
        try {
            const [alliancesData, nationsData] = await Promise.all([
                Alliance.list("-created_date"),
                Nation.list()
            ]);

            // Ensure system roles are present for all alliances, or initialize default custom roles
            const processedAlliances = alliancesData.map(alliance => {
                const defaultCustomRoles = {
                    founder: { title: 'Founder', rank: 0, permissions: {
                        manage_alliance: true, manage_members: true, manage_roles: true, manage_bank: true, withdraw_funds: true, send_invitations: true, review_applications: true, manage_treaties: true, disband_alliance: true
                    }, is_system_role: true },
                    leader: { title: 'Leader', rank: 10, permissions: {
                        manage_alliance: true, manage_members: true, manage_roles: false, manage_bank: true, withdraw_funds: true, send_invitations: true, review_applications: true, manage_treaties: true, disband_alliance: false
                    }, is_system_role: true },
                    officer: { title: 'Officer', rank: 20, permissions: {
                        manage_alliance: false, manage_members: true, manage_roles: false, manage_bank: false, withdraw_funds: false, send_invitations: true, review_applications: true, manage_treaties: false, disband_alliance: false
                    }, is_system_role: true },
                    member: { title: 'Member', rank: 50, permissions: {
                        manage_alliance: false, manage_members: false, manage_roles: false, manage_bank: false, withdraw_funds: false, send_invitations: false, review_applications: false, manage_treaties: false, disband_alliance: false
                    }, is_system_role: true }
                };
                return {
                    ...alliance,
                    custom_roles: { ...defaultCustomRoles, ...(alliance.custom_roles || {}) }
                };
            });

            setAlliances(processedAlliances);

            const nationsMap = {};
            nationsData.forEach(nation => {
                nationsMap[nation.id] = nation;
            });
            setAllNations(nationsMap);

        } catch (error) {
            console.error("Error loading alliance data:", error);
            setFeedback({ type: 'error', message: 'Failed to load alliance data.' });
        }
        setIsLoading(false);
    };

    const handleSelectAlliance = async (alliance) => {
        setSelectedAlliance(alliance);
        setEditForm({
            name: alliance.name,
            description: alliance.description || "",
            treasury: alliance.treasury || 0,
            tax_rate: alliance.tax_rate || 0
        });

        // Load all members (founder + member nations)
        const founderNation = allNations[alliance.founder_nation_id];
        const memberNations = (alliance.member_nations || []).map(id => allNations[id]).filter(Boolean);
        const allMembers = [founderNation, ...memberNations].filter(Boolean);
        setAllianceMembers(allMembers);
    };

    const handleSaveBasicInfo = async () => {
        if (!selectedAlliance) return;

        setIsSaving(true);
        setFeedback(null);
        try {
            await Alliance.update(selectedAlliance.id, {
                name: editForm.name,
                description: editForm.description,
                treasury: parseFloat(editForm.treasury) || 0,
                tax_rate: parseFloat(editForm.tax_rate) || 0
            });

            // Update local state
            const updatedAlliances = alliances.map(a =>
                a.id === selectedAlliance.id
                    ? { ...a, ...editForm, treasury: parseFloat(editForm.treasury) || 0, tax_rate: parseFloat(editForm.tax_rate) || 0 }
                    : a
            );
            setAlliances(updatedAlliances);
            setSelectedAlliance({ ...selectedAlliance, ...editForm, treasury: parseFloat(editForm.treasury) || 0, tax_rate: parseFloat(editForm.tax_rate) || 0 });

            setFeedback({ type: 'success', message: 'Alliance updated successfully!' });
        } catch (error) {
            console.error("Error updating alliance:", error);
            setFeedback({ type: 'error', message: 'Failed to update alliance.' });
        }
        setIsSaving(false);
    };

    const handleRemoveMember = async (nationId) => {
        if (!selectedAlliance || selectedAlliance.founder_nation_id === nationId) {
            setFeedback({ type: 'error', message: 'Cannot remove the alliance founder.' });
            return;
        }

        if (!confirm(`Are you sure you want to remove ${allNations[nationId]?.name} from the alliance?`)) {
            return;
        }

        setFeedback(null);
        try {
            const updatedMemberNations = selectedAlliance.member_nations.filter(id => id !== nationId);
            const updatedMemberRoles = { ...selectedAlliance.member_roles };
            delete updatedMemberRoles[nationId];

            await Alliance.update(selectedAlliance.id, {
                member_nations: updatedMemberNations,
                member_roles: updatedMemberRoles
            });

            // Update local state
            setSelectedAlliance({
                ...selectedAlliance,
                member_nations: updatedMemberNations,
                member_roles: updatedMemberRoles
            });

            const updatedMembers = allianceMembers.filter(m => m.id !== nationId);
            setAllianceMembers(updatedMembers);

            setFeedback({
                type: 'success',
                message: `${allNations[nationId]?.name} removed from alliance`
            });
        } catch (error) {
            console.error("Error removing member:", error);
            setFeedback({ type: 'error', message: 'Failed to remove member.' });
        }
    };

    const handleAdminRoleChange = async (nationId, newRoleId) => {
        if (!selectedAlliance || nationId === selectedAlliance.founder_nation_id) return;

        setFeedback(null);
        setIsSaving(true);
        try {
            const updatedMemberRoles = {
                ...selectedAlliance.member_roles,
                [nationId]: newRoleId
            };

            await Alliance.update(selectedAlliance.id, {
                member_roles: updatedMemberRoles
            });

            const updatedAlliance = { ...selectedAlliance, member_roles: updatedMemberRoles };
            setSelectedAlliance(updatedAlliance);

            const updatedAlliances = alliances.map(a => a.id === selectedAlliance.id ? updatedAlliance : a);
            setAlliances(updatedAlliances);

            setFeedback({ type: 'success', message: 'Member role updated successfully!' });
        } catch (error) {
            console.error("Error updating member role:", error);
            setFeedback({ type: 'error', message: 'Failed to update member role.' });
        }
        setIsSaving(false);
    };

    const handleCreateRole = async () => {
        if (!selectedAlliance || !roleForm.title.trim()) {
            setFeedback({ type: 'error', message: 'Role title cannot be empty.' });
            return;
        }

        setIsSaving(true);
        setFeedback(null);
        try {
            const roleId = roleForm.title.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            if (selectedAlliance.custom_roles[roleId]) {
                setFeedback({ type: 'error', message: `Role with ID '${roleId}' already exists. Please choose a different title.` });
                setIsSaving(false);
                return;
            }

            const newRole = {
                title: roleForm.title,
                rank: parseInt(roleForm.rank),
                permissions: { ...roleForm.permissions },
                is_system_role: false
            };

            const updatedCustomRoles = {
                ...selectedAlliance.custom_roles,
                [roleId]: newRole
            };

            await Alliance.update(selectedAlliance.id, {
                custom_roles: updatedCustomRoles
            });

            setSelectedAlliance({
                ...selectedAlliance,
                custom_roles: updatedCustomRoles
            });

            const updatedAlliances = alliances.map(a =>
                a.id === selectedAlliance.id
                    ? { ...a, custom_roles: updatedCustomRoles }
                    : a
            );
            setAlliances(updatedAlliances);

            setFeedback({ type: 'success', message: `Role "${roleForm.title}" created successfully!` });
            setShowCreateRoleModal(false);
            resetRoleForm();
        } catch (error) {
            console.error("Error creating role:", error);
            setFeedback({ type: 'error', message: 'Failed to create role.' });
        }
        setIsSaving(false);
    };

    const handleEditRole = (roleId) => {
        const role = selectedAlliance.custom_roles[roleId];
        if (!role) return;

        setEditingRole(roleId);
        setRoleForm({
            id: roleId,
            title: role.title,
            rank: role.rank,
            permissions: { ...role.permissions }
        });
        setShowEditRoleModal(true);
    };

    const handleUpdateRole = async () => {
        if (!selectedAlliance || !editingRole || !roleForm.title.trim()) {
            setFeedback({ type: 'error', message: 'Role title cannot be empty.' });
            return;
        }

        setIsSaving(true);
        setFeedback(null);
        try {
            const updatedRole = {
                ...selectedAlliance.custom_roles[editingRole], // Keep existing properties if not updated
                title: roleForm.title,
                rank: parseInt(roleForm.rank),
                permissions: { ...roleForm.permissions }
            };

            const updatedCustomRoles = {
                ...selectedAlliance.custom_roles,
                [editingRole]: updatedRole
            };

            await Alliance.update(selectedAlliance.id, {
                custom_roles: updatedCustomRoles
            });

            setSelectedAlliance({
                ...selectedAlliance,
                custom_roles: updatedCustomRoles
            });

            const updatedAlliances = alliances.map(a =>
                a.id === selectedAlliance.id
                    ? { ...a, custom_roles: updatedCustomRoles }
                    : a
            );
            setAlliances(updatedAlliances);

            setFeedback({ type: 'success', message: `Role "${roleForm.title}" updated successfully!` });
            setShowEditRoleModal(false);
            resetRoleForm();
            setEditingRole(null);
        } catch (error) {
            console.error("Error updating role:", error);
            setFeedback({ type: 'error', message: 'Failed to update role.' });
        }
        setIsSaving(false);
    };

    const handleDeleteRole = async (roleId) => {
        if (!selectedAlliance) return;

        const role = selectedAlliance.custom_roles[roleId];
        if (!role) return;

        if (role.is_system_role) {
            setFeedback({ type: 'error', message: 'Cannot delete system roles.' });
            return;
        }

        if (!confirm(`Are you sure you want to delete the role "${role.title}"? This action cannot be undone.`)) return;

        setFeedback(null);
        try {
            const updatedCustomRoles = { ...selectedAlliance.custom_roles };
            delete updatedCustomRoles[roleId];

            // Reassign members with this role to 'member'
            const updatedMemberRoles = { ...selectedAlliance.member_roles };
            Object.keys(updatedMemberRoles).forEach(nationId => {
                if (updatedMemberRoles[nationId] === roleId) {
                    updatedMemberRoles[nationId] = 'member'; // Default to member role
                }
            });

            await Alliance.update(selectedAlliance.id, {
                custom_roles: updatedCustomRoles,
                member_roles: updatedMemberRoles
            });

            setSelectedAlliance({
                ...selectedAlliance,
                custom_roles: updatedCustomRoles,
                member_roles: updatedMemberRoles
            });

            const updatedAlliances = alliances.map(a =>
                a.id === selectedAlliance.id
                    ? { ...a, custom_roles: updatedCustomRoles, member_roles: updatedMemberRoles }
                    : a
            );
            setAlliances(updatedAlliances);

            setFeedback({ type: 'success', message: `Role "${role.title}" deleted successfully!` });
        } catch (error) {
            console.error("Error deleting role:", error);
            setFeedback({ type: 'error', message: 'Failed to delete role.' });
        }
    };

    const resetRoleForm = () => {
        setRoleForm({
            id: '',
            title: '',
            rank: 50,
            permissions: {
                manage_alliance: false,
                manage_members: false,
                manage_roles: false,
                manage_bank: false,
                withdraw_funds: false,
                send_invitations: false,
                review_applications: false,
                manage_treaties: false,
                disband_alliance: false
            }
        });
    };

    const handleDeleteAlliance = async () => {
        if (!allianceToDelete) return;

        try {
            // Note: Asset transfer logic from original file was removed based on outline.
            await Alliance.delete(allianceToDelete.id);

            setAlliances(alliances.filter(a => a.id !== allianceToDelete.id));
            if (selectedAlliance?.id === allianceToDelete.id) {
                setSelectedAlliance(null);
                setAllianceMembers([]);
            }

            setFeedback({ type: 'success', message: `Alliance "${allianceToDelete.name}" deleted successfully!` });
        } catch (error) {
            console.error("Error deleting alliance:", error);
            setFeedback({ type: 'error', message: 'Failed to delete alliance.' });
        }

        setShowDeleteConfirm(false);
        setAllianceToDelete(null);
    };

    const getCurrentRole = (nationId) => {
        if (!selectedAlliance) return 'member';

        // Founder always has founder role
        if (selectedAlliance.founder_nation_id === nationId) {
            return 'founder';
        }

        // Return assigned role or default to member
        return selectedAlliance.member_roles?.[nationId] || 'member';
    };

    const getAvailableRoles = () => {
        if (!selectedAlliance?.custom_roles) return [];
        return Object.keys(selectedAlliance.custom_roles).map(roleId => ({
            id: roleId,
            ...selectedAlliance.custom_roles[roleId]
        })).sort((a, b) => a.rank - b.rank);
    };

    const getRoleColor = (roleId) => {
        const colors = {
            founder: 'bg-red-500/20 text-red-400 border-red-500/30',
            leader: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            officer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            member: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
        };
        // Fallback for custom roles not explicitly defined in the map, or if ID matches a system role
        return colors[roleId] || 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    };

    const getPermissionLabel = (permission) => {
        const labels = {
            manage_alliance: 'Manage Alliance',
            manage_members: 'Manage Members',
            manage_roles: 'Manage Roles',
            manage_bank: 'Manage Bank',
            withdraw_funds: 'Withdraw Funds',
            send_invitations: 'Send Invitations',
            review_applications: 'Review Applications',
            manage_treaties: 'Manage Treaties',
            disband_alliance: 'Disband Alliance'
        };
        return labels[permission] || permission.replace(/_/g, ' ');
    };

    if (isLoading) {
        return (
            <Card className="bg-slate-800/80 border-slate-700">
                <CardContent className="p-8 text-center">
                    <div className="text-slate-400">Loading alliance data...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-purple-400" />
                        Alliance Management
                    </CardTitle>
                    <CardDescription>
                        Manage alliance details, member roles, and disbanding.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {feedback && (
                        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                            feedback.type === 'success'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                            {feedback.type === 'success' ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : (
                                <AlertTriangle className="w-4 h-4" />
                            )}
                            {feedback.message}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Alliance Selection */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-white">All Alliances</h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {alliances.map(alliance => (
                                    <div
                                        key={alliance.id}
                                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                            selectedAlliance?.id === alliance.id
                                                ? 'bg-blue-500/20 border border-blue-500/30'
                                                : 'bg-slate-700/50 hover:bg-slate-700/70'
                                        }`}
                                        onClick={() => handleSelectAlliance(alliance)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-white">{alliance.name}</p>
                                                <p className="text-sm text-slate-400">
                                                    Founder: {allNations[alliance.founder_nation_id]?.name || 'Unknown'}
                                                </p>
                                                <p className="text-sm text-slate-400">
                                                    Members: {(alliance.member_nations?.length || 0) + 1} |
                                                    Treasury: ${(alliance.treasury || 0).toLocaleString()}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAllianceToDelete(alliance);
                                                    setShowDeleteConfirm(true);
                                                }}
                                                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Alliance Details Editor */}
                        <div className="lg:col-span-2">
                            {selectedAlliance ? (
                                <Tabs defaultValue="basic" className="w-full">
                                    <TabsList className="grid w-full grid-cols-3 bg-slate-700">
                                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                                        <TabsTrigger value="members">Members & Roles</TabsTrigger>
                                        <TabsTrigger value="roles">Role Management</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="basic" className="space-y-4 mt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label className="text-slate-300">Alliance Name</Label>
                                                <Input
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                                    className="bg-slate-700 border-slate-600 text-white"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-slate-300">Tax Rate (%)</Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="25"
                                                    value={editForm.tax_rate}
                                                    onChange={(e) => setEditForm({...editForm, tax_rate: e.target.value})}
                                                    className="bg-slate-700 border-slate-600 text-white"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Description</Label>
                                            <Textarea
                                                value={editForm.description}
                                                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                                className="bg-slate-700 border-slate-600 text-white"
                                                rows={3}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-slate-300">Treasury ($)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={editForm.treasury}
                                                onChange={(e) => setEditForm({...editForm, treasury: e.target.value})}
                                                className="bg-slate-700 border-slate-600 text-white"
                                            />
                                        </div>
                                        <div className="flex justify-end">
                                            <Button
                                                onClick={handleSaveBasicInfo}
                                                disabled={isSaving}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                <Save className="w-4 h-4 mr-2" />
                                                {isSaving ? 'Saving...' : 'Save Changes'}
                                            </Button>
                                        </div>
                                    </TabsContent>

                                <TabsContent value="members" className="mt-6">
                                    <Card className="bg-slate-800 border-slate-700">
                                        <CardHeader>
                                            <CardTitle>Alliance Members</CardTitle>
                                            <CardDescription>Manage members and assign roles.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {allianceMembers.map(member => {
                                                const isFounder = member.id === selectedAlliance.founder_nation_id;
                                                const currentRole = selectedAlliance.member_roles?.[member.id] || (isFounder ? 'founder' : '');
                                                return (
                                                    <div key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-700/50 rounded-lg gap-3">
                                                        <div>
                                                            <p className="font-medium text-white">{member.name}</p>
                                                            <p className="text-sm text-slate-400">{member.leader_name}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                                            <Select
                                                                value={currentRole}
                                                                onValueChange={(newRoleId) => handleAdminRoleChange(member.id, newRoleId)}
                                                                disabled={isFounder}
                                                            >
                                                                <SelectTrigger className="w-full sm:w-[200px] bg-slate-600 border-slate-500">
                                                                    <SelectValue placeholder="Assign Role" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {Object.entries(selectedAlliance.custom_roles || {}).sort(([,a],[,b]) => (a.rank || 99) - (b.rank || 99)).map(([roleId, role]) => (
                                                                        <SelectItem key={roleId} value={roleId} disabled={role.is_system_role && roleId !== 'founder'}>
                                                                            {role.title}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {isFounder && <Badge className="bg-amber-500/20 text-amber-400"><Crown className="w-3 h-3 mr-1"/>Founder</Badge>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                    <TabsContent value="roles" className="space-y-4 mt-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-lg font-medium text-white">Manage Custom Roles</h4>
                                            <Button
                                                onClick={() => {
                                                    resetRoleForm();
                                                    setShowCreateRoleModal(true);
                                                }}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Create Role
                                            </Button>
                                        </div>
                                        <div className="space-y-3">
                                            {getAvailableRoles().map(role => (
                                                <div key={role.id} className="p-4 bg-slate-700/50 rounded-lg">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <Badge className={getRoleColor(role.id)}>
                                                                {role.title}
                                                            </Badge>
                                                            <span className="text-sm text-slate-400">Rank: {role.rank}</span>
                                                            {role.is_system_role && (
                                                                <Badge variant="outline" className="bg-slate-600/50 text-slate-300">
                                                                    System Role
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleEditRole(role.id)}
                                                                className="text-blue-400 hover:text-blue-300"
                                                                disabled={role.is_system_role}
                                                            >
                                                                <Settings className="w-4 h-4" />
                                                            </Button>
                                                            {!role.is_system_role && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteRole(role.id)}
                                                                    className="text-red-400 hover:text-red-300"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        {Object.entries(role.permissions).map(([permission, hasPermission]) => (
                                                            <div
                                                                key={permission}
                                                                className={`px-2 py-1 rounded text-center ${
                                                                    hasPermission
                                                                        ? 'bg-green-500/20 text-green-400'
                                                                        : 'bg-slate-600/50 text-slate-500'
                                                                }`}
                                                            >
                                                                {getPermissionLabel(permission)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="danger" className="space-y-4 mt-4">
                                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="w-6 h-6 text-red-400 mt-1" />
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-red-400 mb-2">Disband Alliance</h4>
                                                    <p className="text-sm text-slate-300 mb-4">
                                                        This action will permanently delete the alliance.
                                                        This cannot be undone.
                                                    </p>
                                                    <Button
                                                        onClick={() => {
                                                            setAllianceToDelete(selectedAlliance);
                                                            setShowDeleteConfirm(true);
                                                        }}
                                                        variant="destructive"
                                                        className="bg-red-600 hover:bg-red-700"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Disband Alliance
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            ) : (
                                <div className="text-center py-12 text-slate-400">
                                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Select an alliance to manage its details</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Create Role Modal */}
            <Dialog open={showCreateRoleModal} onOpenChange={setShowCreateRoleModal}>
                <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white">Create New Role</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Define a new role with specific permissions for alliance members.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="role-title" className="text-slate-300">Role Title</Label>
                                <Input
                                    id="role-title"
                                    value={roleForm.title}
                                    onChange={(e) => setRoleForm({...roleForm, title: e.target.value})}
                                    className="bg-slate-700 border-slate-600 text-white"
                                    placeholder="e.g., Diplomat, Recruiter"
                                />
                            </div>
                            <div>
                                <Label htmlFor="role-rank" className="text-slate-300">Rank (Lower = Higher Authority)</Label>
                                <Input
                                    id="role-rank"
                                    type="number"
                                    min="0" // Ranks can start from 0 for founder like roles
                                    max="99"
                                    value={roleForm.rank}
                                    onChange={(e) => setRoleForm({...roleForm, rank: parseInt(e.target.value) || 0})}
                                    className="bg-slate-700 border-slate-600 text-white"
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-slate-300 mb-3 block">Permissions</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(roleForm.permissions).map(([permission, hasPermission]) => (
                                    <div key={permission} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`perm-${permission}`}
                                            checked={hasPermission}
                                            onChange={(e) => setRoleForm({
                                                ...roleForm,
                                                permissions: {
                                                    ...roleForm.permissions,
                                                    [permission]: e.target.checked
                                                }
                                            })}
                                            className="rounded border-slate-600 text-blue-500 bg-slate-700 focus:ring-blue-500"
                                        />
                                        <Label htmlFor={`perm-${permission}`} className="text-sm text-slate-300">
                                            {getPermissionLabel(permission)}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => { setShowCreateRoleModal(false); resetRoleForm(); }}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateRole}
                            disabled={isSaving || !roleForm.title.trim()}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isSaving ? 'Creating...' : 'Create Role'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Role Modal */}
            <Dialog open={showEditRoleModal} onOpenChange={setShowEditRoleModal}>
                <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-white">Edit Role</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Modify the role's title, rank, and permissions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-role-title" className="text-slate-300">Role Title</Label>
                                <Input
                                    id="edit-role-title"
                                    value={roleForm.title}
                                    onChange={(e) => setRoleForm({...roleForm, title: e.target.value})}
                                    className="bg-slate-700 border-slate-600 text-white"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-role-rank" className="text-slate-300">Rank (Lower = Higher Authority)</Label>
                                <Input
                                    id="edit-role-rank"
                                    type="number"
                                    min="0"
                                    max="99"
                                    value={roleForm.rank}
                                    onChange={(e) => setRoleForm({...roleForm, rank: parseInt(e.target.value) || 0})}
                                    className="bg-slate-700 border-slate-600 text-white"
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-slate-300 mb-3 block">Permissions</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(roleForm.permissions).map(([permission, hasPermission]) => (
                                    <div key={permission} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`edit-perm-${permission}`}
                                            checked={hasPermission}
                                            onChange={(e) => setRoleForm({
                                                ...roleForm,
                                                permissions: {
                                                    ...roleForm.permissions,
                                                    [permission]: e.target.checked
                                                }
                                            })}
                                            className="rounded border-slate-600 text-blue-500 bg-slate-700 focus:ring-blue-500"
                                        />
                                        <Label htmlFor={`edit-perm-${permission}`} className="text-sm text-slate-300">
                                            {getPermissionLabel(permission)}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowEditRoleModal(false);
                                setEditingRole(null);
                                resetRoleForm();
                            }}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateRole}
                            disabled={isSaving || !roleForm.title.trim()}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSaving ? 'Updating...' : 'Update Role'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="bg-slate-800 border-slate-700">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            Confirm Alliance Disbanding
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Are you sure you want to disband "{allianceToDelete?.name}"?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowDeleteConfirm(false);
                            setAllianceToDelete(null);
                        }} className="border-slate-600 text-slate-300 hover:bg-slate-700">
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteAlliance} className="bg-red-600 hover:bg-red-700">
                            Disband Alliance
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
