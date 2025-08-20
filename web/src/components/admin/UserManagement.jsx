import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Nation } from "@/api/entities";
import { Users, Shield } from "lucide-react";

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState({});
    const [feedback, setFeedback] = useState(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const [userData, currentUserData] = await Promise.all([User.list(), User.me()]);
            setUsers(userData);
            setCurrentUser(currentUserData);
        } catch (error) {
            console.error("Failed to load users", error);
            setFeedback({ type: 'error', message: 'Failed to load users.' });
        }
        setIsLoading(false);
    };

    const handleRoleChange = async (userId, newRole, userEmail) => {
        if (userEmail === 'deraj.oxford@gmail.com' && currentUser?.email !== 'deraj.oxford@gmail.com') {
            setFeedback({ type: 'error', message: 'Only the super admin can modify the super admin role.' });
            return;
        }
        setIsUpdating(prev => ({ ...prev, [userId]: true }));
        try {
            await User.update(userId, { role: newRole });
            setFeedback({ type: 'success', message: 'User role updated successfully!' });
            loadUsers();
        } catch (error) {
            setFeedback({ type: 'error', message: 'Failed to update user role.' });
        }
        setIsUpdating(prev => ({ ...prev, [userId]: false }));
    };

    const handleBanUser = async (userId, userEmail) => {
        if (userEmail === 'deraj.oxford@gmail.com') {
            setFeedback({ type: 'error', message: 'Cannot ban the super admin.' });
            return;
        }
        if (!window.confirm(`Are you sure you want to ban this user?`)) return;
        setIsUpdating(prev => ({ ...prev, [userId]: true }));
        try {
            await User.update(userId, { is_banned: true });
            const nations = await Nation.filter({ created_by: userEmail });
            if (nations.length > 0) {
                await Nation.update(nations[0].id, { active: false });
            }
            setFeedback({ type: 'success', message: 'User has been banned.' });
            loadUsers();
        } catch (error) {
            setFeedback({ type: 'error', message: 'Failed to ban user.' });
        }
        setIsUpdating(prev => ({ ...prev, [userId]: false }));
    };

    const handleUnbanUser = async (userId) => {
        setIsUpdating(prev => ({ ...prev, [userId]: true }));
        try {
            await User.update(userId, { is_banned: false });
            setFeedback({ type: 'success', message: 'User has been unbanned.' });
            loadUsers();
        } catch (error) {
            setFeedback({ type: 'error', message: 'Failed to unban user.' });
        }
        setIsUpdating(prev => ({ ...prev, [userId]: false }));
    };

    if (isLoading) return <p className="text-slate-400">Loading users...</p>;

    const isSuperAdmin = currentUser?.email === 'deraj.oxford@gmail.com';

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader><CardTitle className="text-white flex items-center gap-2"><Users className="w-5 h-5 text-blue-400" />User Management</CardTitle></CardHeader>
            <CardContent className="space-y-6">
                {feedback && <div className={`p-3 rounded-lg text-sm ${feedback.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{feedback.message}</div>}
                <div className="space-y-3">
                    {users.map((user) => {
                        const isUserSuperAdmin = user.email === 'deraj.oxford@gmail.com';
                        const canModifyRole = isSuperAdmin || !isUserSuperAdmin;
                        return (
                            <div key={user.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                <div>
                                    <div className="text-white font-medium">{user.full_name || user.email}</div>
                                    <div className="text-sm text-slate-400">{user.email}</div>
                                    {isUserSuperAdmin && <div className="flex items-center gap-1 mt-1"><Shield className="w-3 h-3 text-amber-400" /><span className="text-xs text-amber-400">Super Admin</span></div>}
                                    {user.is_banned && <Badge variant="destructive" className="mt-1 bg-red-500/20 text-red-400">Banned</Badge>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select value={user.role || 'user'} onValueChange={(newRole) => handleRoleChange(user.id, newRole, user.email)} disabled={isUpdating[user.id] || !canModifyRole}>
                                        <SelectTrigger className={`w-32 ${canModifyRole ? 'bg-slate-600 border-slate-500' : 'bg-slate-700 border-slate-600 opacity-50'}`}><SelectValue /></SelectTrigger>
                                        <SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                                    </Select>
                                    {!isUserSuperAdmin && (
                                        user.is_banned ? 
                                        <Button onClick={() => handleUnbanUser(user.id)} disabled={isUpdating[user.id]} className="bg-green-600 hover:bg-green-700" size="sm">{isUpdating[user.id] ? '...' : 'Unban'}</Button> : 
                                        <Button onClick={() => handleBanUser(user.id, user.email)} disabled={isUpdating[user.id]} variant="destructive" size="sm">{isUpdating[user.id] ? '...' : 'Ban'}</Button>
                                    )}
                                    {!canModifyRole && <div className="text-xs text-slate-500 ml-2">Protected</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}