
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alliance, Nation } from "@/entities/all";
import { Crown, UserCog, Loader2, Users, User } from 'lucide-react';
import { createPageUrl } from "@/utils";

export default function AllianceMembers({ alliance, currentUserNation, onUpdate }) {
    const [members, setMembers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdatingRole, setIsUpdatingRole] = useState(null);

    // Debug logging
    console.log('AllianceMembers Debug:', {
        alliance: alliance?.name,
        founderId: alliance?.founder_nation_id,
        memberNations: alliance?.member_nations,
        currentUserNation: currentUserNation?.id,
        currentUserName: currentUserNation?.name
    });

    const myRoleKey = alliance?.founder_nation_id === currentUserNation?.id
        ? 'founder'
        : alliance?.member_roles?.[currentUserNation?.id] || 'member';

    const myPermissions = (myRoleKey && alliance?.custom_roles?.[myRoleKey]?.permissions) || {};
    const canManageMembers = myPermissions.manage_members || myPermissions.manage_roles || alliance?.founder_nation_id === currentUserNation?.id;

    console.log('Permission Debug:', {
        myRoleKey,
        myPermissions,
        canManageMembers,
        isFounder: alliance?.founder_nation_id === currentUserNation?.id
    });

    useEffect(() => {
        const fetchMembers = async () => {
            setIsLoading(true);
            console.log('Fetching members for alliance:', alliance?.name);

            if (!alliance) {
                console.log('No alliance provided');
                setMembers([]);
                setIsLoading(false);
                return;
            }

            try {
                // Get all member IDs including founder
                const memberIds = [];
                if (alliance.founder_nation_id) {
                    memberIds.push(alliance.founder_nation_id);
                }
                if (alliance.member_nations && Array.isArray(alliance.member_nations)) {
                    memberIds.push(...alliance.member_nations);
                }

                console.log('Member IDs to fetch:', memberIds);

                if (memberIds.length === 0) {
                    console.log('No member IDs found');
                    setMembers([]);
                    setIsLoading(false);
                    return;
                }

                // Remove duplicates
                const uniqueMemberIds = [...new Set(memberIds)];

                // Fetch all nations
                const allNations = await Nation.list();
                console.log('Total nations fetched:', allNations.length);

                // Filter to get member nations
                const memberNations = allNations.filter(n => uniqueMemberIds.includes(n.id));
                console.log('Member nations found:', memberNations.map(n => ({id: n.id, name: n.name})));

                setMembers(memberNations);

            } catch (error) {
                console.error("Failed to fetch alliance members:", error);
                setMembers([]);
            }
            setIsLoading(false);
        };

        fetchMembers();
    }, [alliance]);

    const handleRoleChange = async (memberId, newRoleId) => {
        if (!canManageMembers || memberId === alliance.founder_nation_id) {
            console.log('Cannot change role:', { canManageMembers, isFounder: memberId === alliance.founder_nation_id });
            return;
        }

        console.log('Changing role for member:', memberId, 'to:', newRoleId);
        setIsUpdatingRole(memberId);

        try {
            const updatedMemberRoles = { ...alliance.member_roles, [memberId]: newRoleId };
            await Alliance.update(alliance.id, { member_roles: updatedMemberRoles });
            console.log('Role updated successfully');
            onUpdate();
        } catch (error) {
            console.error("Failed to update role:", error);
        }
        setIsUpdatingRole(null);
    };

    if (isLoading) {
        return (
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                </CardContent>
            </Card>
        );
    }

    if (!alliance) {
        return (
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardContent className="text-center py-12">
                    <Users className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">No Alliance</h3>
                    <p className="text-slate-400">You are not currently a member of any alliance.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Alliance Members
                </CardTitle>
                <CardDescription>
                    Manage members and assign roles within {alliance.name}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {members.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                        <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                        <p>No members found for this alliance.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {members.map(member => {
                            const isFounder = member.id === alliance.founder_nation_id;
                            const currentRoleId = isFounder ? 'founder' : (alliance.member_roles?.[member.id] || 'member');
                            const currentRole = alliance.custom_roles?.[currentRoleId];
                            const isUpdating = isUpdatingRole === member.id;

                            return (
                                <div key={member.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-700/50 rounded-lg gap-3">
                                    <div className="flex items-center gap-3">
                                        {member.profile_image_url ? (
                                            <img src={member.profile_image_url} alt={member.name} className="w-10 h-10 rounded-md object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-md bg-slate-600 flex items-center justify-center">
                                                <User className="w-5 h-5 text-slate-300" />
                                            </div>
                                        )}
                                        <div>
                                            <a href={createPageUrl(`PublicNationProfile?nationId=${member.id}`)} target="_blank" rel="noopener noreferrer" className="font-semibold text-white hover:underline">
                                                {member.name}
                                            </a>
                                            <p className="text-slate-400 text-sm">Led by {member.leader_name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {isFounder && <Crown className="w-4 h-4 text-amber-400" />}
                                                <Badge className={isFounder ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-blue-500/20 text-blue-400 border-blue-500/30"}>
                                                    {currentRole?.title || 'Unknown Role'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {canManageMembers && !isFounder && (
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            <Select
                                                value={currentRoleId}
                                                onValueChange={(newRoleId) => handleRoleChange(member.id, newRoleId)}
                                                disabled={isUpdating}
                                            >
                                                <SelectTrigger className="w-full sm:w-[200px] bg-slate-600 border-slate-500">
                                                    <SelectValue placeholder="Select Role" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(alliance.custom_roles || {})
                                                        .filter(([roleId]) => roleId !== 'founder')
                                                        .sort(([,a], [,b]) => (a.rank || 99) - (b.rank || 99))
                                                        .map(([roleId, role]) => (
                                                            <SelectItem key={roleId} value={roleId}>
                                                                {role.title}
                                                            </SelectItem>
                                                        ))
                                                    }
                                                </SelectContent>
                                            </Select>
                                            {isUpdating && (
                                                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
