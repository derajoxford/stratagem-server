
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  Crown, 
  Shield,
  Users,
  DollarSign,
  UserPlus,
  FileText,
  Handshake
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alliance } from "@/entities/all";

const PERMISSION_DESCRIPTIONS = {
  manage_alliance: "Edit alliance name, description, and settings",
  manage_members: "Remove members and manage member roles",
  manage_roles: "Create, edit, and delete custom roles",
  manage_bank: "View alliance bank details and transaction history",
  withdraw_funds: "Withdraw money and resources from alliance bank",
  send_invitations: "Send invitations to nations to join the alliance",
  review_applications: "Approve or reject alliance membership applications",
  manage_treaties: "Create, modify, and cancel treaties with other alliances",
  disband_alliance: "Permanently disband the alliance"
};

const PERMISSION_ICONS = {
  manage_alliance: Settings,
  manage_members: Users,
  manage_roles: Crown,
  manage_bank: DollarSign,
  withdraw_funds: DollarSign,
  send_invitations: UserPlus,
  review_applications: FileText,
  manage_treaties: Handshake,
  disband_alliance: Trash2
};

export default function RoleManagement({ alliance, nation, onUpdate }) {
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newRolePermissions, setNewRolePermissions] = useState({});
  const [newRoleRank, setNewRoleRank] = useState(50);
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  // Fix the permission check logic
  const canManageRoles = alliance && nation && (
    // Check if user is the founder
    alliance.founder_nation_id === nation.id ||
    // Check if user has a role with manage_roles permission
    (alliance.member_roles &&
     alliance.custom_roles &&
     alliance.member_roles[nation.id] &&
     alliance.custom_roles[alliance.member_roles[nation.id]]?.permissions?.manage_roles)
  );

  const myRole = alliance?.custom_roles?.[alliance?.member_roles?.[nation?.id]] || alliance?.custom_roles?.member;

  // Add debugging information
  console.log('Role Management Debug Info:', {
    alliance: alliance?.name,
    nationId: nation?.id,
    founderId: alliance?.founder_nation_id,
    isFounder: alliance?.founder_nation_id === nation?.id,
    memberRole: alliance?.member_roles?.[nation?.id],
    customRoles: alliance?.custom_roles,
    rolePermissions: alliance?.custom_roles?.[alliance?.member_roles?.[nation?.id]]?.permissions,
    canManageRoles
  });

  if (!canManageRoles) {
    return (
      <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
        <CardContent className="text-center py-12">
          <Shield className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
          <p className="text-slate-400 mb-4">
            You don't have permission to manage alliance roles.
          </p>
          <div className="text-left max-w-md mx-auto bg-slate-700/50 p-4 rounded-lg">
            <h4 className="text-white font-medium mb-2">Debug Information:</h4>
            <div className="text-xs text-slate-300 space-y-1">
              <p>Alliance: {alliance?.name || 'None'}</p>
              <p>Your Nation ID: {nation?.id || 'Unknown'}</p>
              <p>Alliance Founder ID: {alliance?.founder_nation_id || 'Unknown'}</p>
              <p>Your Role: {alliance?.member_roles?.[nation?.id] || 'None'}</p>
              <p>Role Permissions: {JSON.stringify(alliance?.custom_roles?.[alliance?.member_roles?.[nation?.id]]?.permissions || {})}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCreateRole = () => {
    setNewRoleTitle("");
    setNewRolePermissions({
      manage_alliance: false,
      manage_members: false,
      manage_roles: false,
      manage_bank: false,
      withdraw_funds: false,
      send_invitations: false,
      review_applications: false,
      manage_treaties: false,
      disband_alliance: false
    });
    setNewRoleRank(50);
    setShowCreateRoleModal(true);
  };

  const submitCreateRole = async () => {
    if (!newRoleTitle.trim()) return;

    setIsCreatingRole(true);
    try {
      const roleId = `role_${Date.now()}`;
      const updatedCustomRoles = {
        ...alliance.custom_roles,
        [roleId]: {
          title: newRoleTitle.trim(),
          permissions: newRolePermissions,
          rank: newRoleRank,
          is_system_role: false
        }
      };

      await Alliance.update(alliance.id, {
        custom_roles: updatedCustomRoles
      });

      setShowCreateRoleModal(false);
      onUpdate();
    } catch (error) {
      console.error("Error creating role:", error);
      alert("Failed to create role. Please try again.");
    }
    setIsCreatingRole(false);
  };

  const handleDeleteRole = async (roleId) => {
    if (alliance.custom_roles[roleId]?.is_system_role) {
      alert("Cannot delete system roles.");
      return;
    }

    if (!confirm("Are you sure you want to delete this role? Members with this role will be set to 'Member'.")) {
      return;
    }

    try {
      const updatedCustomRoles = { ...alliance.custom_roles };
      delete updatedCustomRoles[roleId];

      // Update member roles - change any members with deleted role to 'member'
      const updatedMemberRoles = { ...alliance.member_roles };
      Object.keys(updatedMemberRoles).forEach(nationId => {
        if (updatedMemberRoles[nationId] === roleId) {
          updatedMemberRoles[nationId] = 'member';
        }
      });

      await Alliance.update(alliance.id, {
        custom_roles: updatedCustomRoles,
        member_roles: updatedMemberRoles
      });

      onUpdate();
    } catch (error) {
      console.error("Error deleting role:", error);
      alert("Failed to delete role. Please try again.");
    }
  };

  const sortedRoles = Object.entries(alliance.custom_roles || {}).sort((a, b) => {
    return (a[1].rank || 99) - (b[1].rank || 99);
  });

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              Role Management
            </CardTitle>
            <Button onClick={handleCreateRole} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sortedRoles.map(([roleId, role]) => (
            <Card key={roleId} className="bg-slate-700/50 border-slate-600">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Badge 
                      className={role.is_system_role ? 
                        "bg-blue-500/20 text-blue-400 border-blue-500/30" : 
                        "bg-purple-500/20 text-purple-400 border-purple-500/30"
                      }
                    >
                      Rank {role.rank}
                    </Badge>
                    <h4 className="text-white font-medium">{role.title}</h4>
                    {role.is_system_role && (
                      <Badge variant="outline" className="text-slate-400 border-slate-600">
                        System Role
                      </Badge>
                    )}
                  </div>
                  {!role.is_system_role && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRole(roleId)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(role.permissions || {}).map(([permission, hasPermission]) => {
                    const Icon = PERMISSION_ICONS[permission] || Shield;
                    return (
                      <div key={permission} className={`flex items-center gap-2 p-2 rounded ${hasPermission ? 'bg-green-500/10 text-green-400' : 'bg-slate-600/20 text-slate-500'}`}>
                        <Icon className="w-4 h-4" />
                        <span className="text-sm capitalize">{permission.replace(/_/g, ' ')}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Create Role Modal */}
      <Dialog open={showCreateRoleModal} onOpenChange={setShowCreateRoleModal}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-white">Create Custom Role</DialogTitle>
            <DialogDescription className="text-slate-400">
              Define a new role with specific permissions for your alliance members.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Role Title</Label>
                <Input
                  value={newRoleTitle}
                  onChange={(e) => setNewRoleTitle(e.target.value)}
                  placeholder="e.g., Minister of Defense"
                  className="bg-slate-700 border-slate-600 text-white"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Rank (1-99)</Label>
                <Input
                  type="number"
                  value={newRoleRank}
                  onChange={(e) => setNewRoleRank(parseInt(e.target.value) || 50)}
                  min={1}
                  max={99}
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <p className="text-xs text-slate-500">Lower numbers = higher authority</p>
              </div>
            </div>

            <div>
              <Label className="text-slate-300 mb-4 block">Permissions</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(PERMISSION_DESCRIPTIONS).map(([permission, description]) => {
                  const Icon = PERMISSION_ICONS[permission];
                  return (
                    <div key={permission} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <Switch
                        checked={newRolePermissions[permission] || false}
                        onCheckedChange={(checked) => 
                          setNewRolePermissions({
                            ...newRolePermissions,
                            [permission]: checked
                          })
                        }
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4 text-slate-400" />
                          <span className="text-white font-medium capitalize">
                            {permission.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateRoleModal(false)}
              className="border-slate-600 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={submitCreateRole}
              disabled={!newRoleTitle.trim() || isCreatingRole}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isCreatingRole ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Role
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
