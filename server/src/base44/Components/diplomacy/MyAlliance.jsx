
import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Crown, Shield, DollarSign, Calendar, Building2,
  Banknote, Package, Send, X, Edit, Trash2, UserX,
  FileText, MessageSquare, ClipboardEdit, Loader2, Settings, UserPlus, Image as ImageIcon, Save
} from "lucide-react";
import { format } from "date-fns";
import { Nation, Alliance, Resource, AllianceTransaction } from "@/entities/all";
import { UploadFile } from "@/integrations/Core";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import AllianceMerger from "./AllianceMerger";
import AllianceLogoUpload from "./AllianceLogoUpload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import AllianceProfileSettings from './AllianceProfileSettings'; // New component import

const resourceTypes = [
  'oil', 'iron', 'steel', 'aluminum', 'coal', 'uranium',
  'food', 'gold', 'bauxite', 'copper', 'diamonds', 'wood', 'ammo'
];

const resourceIcons = {
  oil: Package, iron: Package, steel: Package, aluminum: Package, coal: Package, uranium: Package,
  food: Package, gold: Package, bauxite: Package, copper: Package, diamonds: Package, wood: Package, ammo: Package
};

function AllianceBank({ alliance, nation, myNationResources, allNationsData, allianceTransactions, onUpdate }) {
  const [moneyDeposit, setMoneyDeposit] = useState('');
  const [resourceDeposits, setResourceDeposits] = useState({});
  const [moneyWithdraw, setMoneyWithdraw] = useState('');
  const [resourceWithdrawals, setResourceWithdrawals] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [recipientId, setRecipientId] = useState(nation.id);

  // Check permissions based on outline
  const myRoleKey = alliance?.founder_nation_id === nation?.id
    ? 'founder'
    : alliance?.member_roles?.[nation?.id] || 'member';
  const myPermissions = (myRoleKey && alliance?.custom_roles?.[myRoleKey]?.permissions) || {};
  const canWithdraw = myPermissions.withdraw_funds || alliance?.founder_nation_id === nation?.id;

  // Renamed from handleResourceDepositChange
  const handleResourceDeposit = (resource, value) => {
    const amount = parseInt(value) || 0;
    const maxAmount = myNationResources?.[resource] || 0;
    setResourceDeposits(prev => ({
      ...prev,
      [resource]: Math.max(0, Math.min(amount, maxAmount))
    }));
  };

  // Renamed from handleResourceWithdrawChange
  const handleResourceWithdrawal = (resource, value) => {
    const amount = parseInt(value) || 0;
    const maxAmount = alliance.resources?.[resource] || 0;
    setResourceWithdrawals(prev => ({
      ...prev,
      [resource]: Math.max(0, Math.min(amount, maxAmount))
    }));
  };

  // Consolidated handleDeposit for money and resources
  const handleDeposit = async () => {
    setIsProcessing(true);

    const moneyToDeposit = parseInt(moneyDeposit) || 0;
    const resourceChanges = {};
    Object.entries(resourceDeposits).forEach(([res, amount]) => {
      if (amount > 0) {
        resourceChanges[res] = amount;
      }
    });

    if (moneyToDeposit <= 0 && Object.keys(resourceChanges).length === 0) {
      setIsProcessing(false);
      return;
    }

    // Validate funds
    if (nation.treasury < moneyToDeposit) {
      console.error("Not enough money to deposit.");
      setIsProcessing(false);
      return;
    }
    for (const res in resourceChanges) {
      if ((myNationResources?.[res] || 0) < resourceChanges[res]) {
        console.error(`Not enough ${res} to deposit.`);
        setIsProcessing(false);
        return;
      }
    }

    try {
      const nationResourceUpdate = { ...myNationResources };
      const allianceResourceUpdate = { ...(alliance.resources || {}) };

      for (const res in resourceChanges) {
        const amount = resourceChanges[res];
        nationResourceUpdate[res] = (nationResourceUpdate[res] || 0) - amount;
        allianceResourceUpdate[res] = (allianceResourceUpdate[res] || 0) + amount;
      }

      // Log transaction
      await AllianceTransaction.create({
        alliance_id: alliance.id,
        transaction_type: 'deposit',
        initiator_nation_id: nation.id,
        amount: moneyToDeposit,
        resources: resourceChanges,
        description: `Deposited ${moneyToDeposit > 0 ? `$${moneyToDeposit.toLocaleString()}` : ''}${moneyToDeposit > 0 && Object.keys(resourceChanges).length > 0 ? ' and ' : ''}${Object.keys(resourceChanges).length > 0 ? 'resources' : ''}`
      });

      await Promise.all([
        Nation.update(nation.id, { treasury: nation.treasury - moneyToDeposit }),
        Resource.update(myNationResources.id, nationResourceUpdate),
        Alliance.update(alliance.id, {
          treasury: (alliance.treasury || 0) + moneyToDeposit,
          resources: allianceResourceUpdate
        })
      ]);

      setMoneyDeposit('');
      setResourceDeposits({});
      onUpdate(); // Trigger parent's data reload
    } catch (error) {
      console.error("Error depositing to alliance bank:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Consolidated handleWithdraw for money and resources
  const handleWithdraw = async () => {
    if (!canWithdraw) return;

    setIsProcessing(true);

    const moneyToWithdraw = parseInt(moneyWithdraw) || 0;
    const resourceChanges = {};

    Object.entries(resourceWithdrawals).forEach(([res, amount]) => {
      if (amount > 0) {
        resourceChanges[res] = amount;
      }
    });

    if (moneyToWithdraw <= 0 && Object.keys(resourceChanges).length === 0) {
      setIsProcessing(false);
      return;
    }

    // Validate alliance funds
    if ((alliance.treasury || 0) < moneyToWithdraw) {
      console.error("Not enough money in alliance treasury.");
      setIsProcessing(false);
      return;
    }
    for (const res in resourceChanges) {
      if ((alliance.resources?.[res] || 0) < resourceChanges[res]) {
        console.error(`Not enough ${res} in alliance stockpile.`);
        setIsProcessing(false);
        return;
      }
    }

    try {
      // NEW: Find recipient nation and fetch their resources
      const recipientNation = allNationsData.find(n => n.id === recipientId);
      if (!recipientNation) {
          console.error("Recipient nation not found.");
          setIsProcessing(false);
          return;
      }
      
      const recipientResourcesList = await Resource.filter({ nation_id: recipientId });
      const recipientResources = recipientResourcesList[0];

      if (!recipientResources) {
        console.error("Recipient nation resources not found.");
        setIsProcessing(false);
        return;
      }

      const recipientResourceUpdate = { ...recipientResources };
      const allianceResourceUpdate = { ...(alliance.resources || {}) };

      for (const res in resourceChanges) {
        const amount = resourceChanges[res];
        recipientResourceUpdate[res] = (recipientResourceUpdate[res] || 0) + amount;
        allianceResourceUpdate[res] = (allianceResourceUpdate[res] || 0) - amount;
      }

      // Log transaction
      await AllianceTransaction.create({
        alliance_id: alliance.id,
        transaction_type: 'withdrawal',
        initiator_nation_id: nation.id,
        recipient_nation_id: recipientNation.id, // Log selected recipient
        amount: moneyToWithdraw,
        resources: resourceChanges,
        description: `Withdrew to ${recipientNation.name}`
      });

      await Promise.all([
        Nation.update(recipientNation.id, { treasury: recipientNation.treasury + moneyToWithdraw }),
        Resource.update(recipientResources.id, recipientResourceUpdate),
        Alliance.update(alliance.id, {
          treasury: (alliance.treasury || 0) - moneyToWithdraw,
          resources: allianceResourceUpdate
        })
      ]);

      setMoneyWithdraw('');
      setResourceWithdrawals({});
      setRecipientId(nation.id); // Reset recipient to self
      onUpdate(); // Trigger parent's data reload

    } catch (error) {
      console.error("Error withdrawing from alliance bank:", error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // NEW: Helper to render transaction list
  const renderTransactions = () => {
    if (!allianceTransactions || allianceTransactions.length === 0) {
      return <p className="text-center text-slate-400 py-4">No transactions recorded yet.</p>;
    }
    
    const nationsMap = allNationsData.reduce((acc, n) => ({ ...acc, [n.id]: n.name }), {});

    return (
        <ScrollArea className="h-72 pr-4">
            <div className="space-y-3">
                {allianceTransactions.map(tx => {
                    const initiatorName = nationsMap[tx.initiator_nation_id] || "Unknown";
                    const recipientName = nationsMap[tx.recipient_nation_id] || "";
                    const isDeposit = tx.transaction_type === 'deposit';

                    return (
                        <div key={tx.id} className="text-sm p-3 bg-slate-700/30 rounded-lg border border-slate-600">
                            <div className="flex justify-between items-center mb-2">
                                <div className="font-semibold text-white">
                                    <Badge variant={isDeposit ? "secondary" : "destructive"} className={isDeposit ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}>
                                        {tx.transaction_type.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                </div>
                                <span className="text-xs text-slate-400">{format(new Date(tx.created_date), 'MMM d, yyyy h:mm a')}</span>
                            </div>
                            <p className="text-slate-300">
                                Initiated by: <span className="font-medium text-amber-400">{initiatorName}</span>
                                {recipientName && ` | To: `}
                                {recipientName && <span className="font-medium text-blue-400">{recipientName}</span>}
                            </p>
                            {(tx.amount > 0 || Object.values(tx.resources || {}).some(v => v > 0)) && (
                                <div className="mt-2 pt-2 border-t border-slate-600/50">
                                    {tx.amount > 0 && <p className={isDeposit ? 'text-green-400' : 'text-red-400'}>Amount: ${tx.amount.toLocaleString()}</p>}
                                    {Object.entries(tx.resources || {}).filter(([, val]) => val > 0).map(([key, val]) => (
                                        <p key={key} className="text-slate-300 capitalize">{key}: {val.toLocaleString()}</p>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
  };
  
  const allianceMembers = allNationsData.filter(n => n.alliance_id === alliance.id);

  return (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-400">
          <Banknote /> Alliance Bank & Stockpile
        </CardTitle>
        <CardDescription className="text-slate-400">
          Manage your alliance's shared treasury and resources.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column: Operations (Deposit/Withdraw) */}
          <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-green-400" /> Bank Operations
              </CardTitle>
              <CardDescription className="text-slate-400">
                Deposit or withdraw funds and resources.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                <p className="text-sm text-slate-400">Alliance Treasury</p>
                <p className="text-3xl font-bold text-green-400">${(alliance.treasury || 0).toLocaleString()}</p>
              </div>

              <Tabs defaultValue="deposit-money">
                <TabsList className="grid w-full grid-cols-2 bg-slate-700/50">
                  <TabsTrigger value="deposit-money" className="data-[state=active]:bg-slate-600">Deposit</TabsTrigger>
                  <TabsTrigger value="withdraw-money" disabled={!canWithdraw} className="data-[state=active]:bg-slate-600">Withdraw</TabsTrigger>
                </TabsList>
                <TabsContent value="deposit-money" className="pt-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-slate-300">Deposit Money</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder={`Your treasury: $${nation.treasury.toLocaleString()}`}
                          value={moneyDeposit}
                          onChange={(e) => setMoneyDeposit(e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                        <Button
                          onClick={handleDeposit}
                          disabled={isProcessing || ((parseInt(moneyDeposit) || 0) <= 0 && Object.values(resourceDeposits).every(v => (v || 0) <= 0))}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-300">Deposit Resources</Label>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2 bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                        {resourceTypes.map(res => {
                          const Icon = resourceIcons[res] || Package;
                          const available = myNationResources?.[res] || 0;
                          return (
                            <div key={res} className="grid grid-cols-3 items-center gap-2">
                              <div className="flex items-center gap-2 col-span-1">
                                <Icon className="w-4 h-4 text-slate-400" />
                                <Label className="capitalize text-slate-300">{res}</Label>
                              </div>
                              <span className="text-xs text-slate-400 text-right">({available.toLocaleString()} avail.)</span>
                              <Input
                                type="number"
                                placeholder="0"
                                value={resourceDeposits[res] || ''}
                                onChange={(e) => handleResourceDeposit(res, e.target.value)}
                                className="bg-slate-700 border-slate-600 h-8 text-white"
                                disabled={isProcessing}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="withdraw-money" className="pt-4">
                  {canWithdraw ? (
                    <div className="space-y-4">
                      {/* NEW: Recipient Selection */}
                      <div>
                        <Label className="text-slate-300">Recipient Nation</Label>
                        <Select value={recipientId} onValueChange={setRecipientId}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue placeholder="Select a recipient..." />
                          </SelectTrigger>
                          <SelectContent>
                            {allianceMembers.map(member => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name} {member.id === nation.id && "(Myself)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    
                      <div>
                        <Label className="text-slate-300">Withdraw Money</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder={`Alliance treasury: $${(alliance.treasury || 0).toLocaleString()}`}
                            value={moneyWithdraw}
                            onChange={(e) => setMoneyWithdraw(e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                          <Button
                            onClick={handleWithdraw}
                            disabled={isProcessing || ((parseInt(moneyWithdraw) || 0) <= 0 && Object.values(resourceWithdrawals).every(v => (v || 0) <= 0))}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-300">Withdraw Resources</Label>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                          {resourceTypes.map(res => {
                            const Icon = resourceIcons[res] || Package;
                            const available = alliance.resources?.[res] || 0;
                            return (
                              <div key={res} className="grid grid-cols-3 items-center gap-2">
                                <div className="flex items-center gap-2 col-span-1">
                                  <Icon className="w-4 h-4 text-slate-400" />
                                  <Label className="capitalize text-slate-300">{res}</Label>
                                </div>
                                <span className="text-xs text-slate-400 text-right">({available.toLocaleString()} avail.)</span>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={resourceWithdrawals[res] || ''}
                                  onChange={(e) => handleResourceWithdrawal(res, e.target.value)}
                                  className="bg-slate-700 border-slate-600 h-8 text-white"
                                  disabled={isProcessing}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Shield className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                      <p className="text-slate-400">You do not have permission to withdraw funds.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Right Column: Transaction History */}
          <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Transaction History
              </CardTitle>
              <CardDescription className="text-slate-400">
                All recorded deposits, withdrawals, and transfers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderTransactions()}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyAlliance({ alliance, nation, onUpdate }) {
  const [founderNation, setFounderNation] = useState(null);
  const [myNationResources, setMyNationResources] = useState(null); // Renamed from nationResources
  const [allianceTransactions, setAllianceTransactions] = useState([]); // New state
  const [allNationsData, setAllNationsData] = useState([]); // New state
  const [isLoadingDetails, setIsLoadingDetails] = useState(true); // Replaces isLoading

  const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedDescription, setEditedDescription] = useState(alliance ? alliance.description : '');
  const [isDisbanding, setIsDisbanding] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [memberNations, setMemberNations] = useState([]); // State for member nations (still used for calculating member count, etc)

  const isFounder = alliance?.founder_nation_id === nation?.id;

  useEffect(() => {
    if (alliance && nation) {
      loadMyAllianceDetailsData();
      setEditedDescription(alliance.description);
    }
  }, [alliance, nation]);

  const loadMyAllianceDetailsData = async () => {
    setIsLoadingDetails(true);
    try {
      const [
        allNationsList,
        nationResourcesList,
        allianceTransactionsList,
        founderData
      ] = await Promise.all([
        Nation.list(),
        Resource.filter({ nation_id: nation.id }),
        AllianceTransaction.filter({ alliance_id: alliance.id }, '-created_date', 20),
        Nation.get(alliance.founder_nation_id)
      ]);

      setAllNationsData(allNationsList);
      setMyNationResources(nationResourcesList[0]);
      setAllianceTransactions(allianceTransactionsList);
      setFounderNation(founderData);

      if (alliance) {
        const members = allNationsList.filter(n =>
          n.id === alliance.founder_nation_id ||
          alliance.member_nations.includes(n.id)
        );
        setMemberNations(members);
      }

    } catch (error) {
      console.error("Error loading alliance details data:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const onUpdateDescription = async () => {
    if (!alliance) return;
    try {
      // This function is now deprecated in favor of the new component.
      // We keep it here to avoid breaking old references if any, but new edits will use AllianceProfileSettings.
      await Alliance.update(alliance.id, { description: editedDescription });
      setIsEditing(false);
      onUpdate(); // Trigger refresh of alliance data in parent
    } catch (error) {
      console.error("Error updating alliance description:", error);
    }
  };

  const handleDisband = async () => {
    setIsDisbanding(true);
    if (!alliance || !nation || !isFounder) { // Using isFounder here for the action
      setIsDisbanding(false);
      return;
    }

    try {
      await Alliance.update(alliance.id, { active: false });
      onUpdate(); // Triggers a reload of user's state, removing alliance if active = false implies that
    } catch (error) {
      console.error("Error disbanding alliance:", error);
    } finally {
      setShowDisbandConfirm(false);
      setIsDisbanding(false);
    }
  };

  const handleLeaveAlliance = async () => {
    if (isFounder || !nation || !alliance) return;
    setIsLeaving(true);

    try {
      // 1. Remove nation from members list
      const newMemberNations = alliance.member_nations.filter(id => id !== nation.id);
      const newMemberRoles = { ...alliance.member_roles };
      delete newMemberRoles[nation.id];

      // 2. Recalculate alliance stats
      // Use allNationsData from state, which is loaded by loadMyAllianceDetailsData
      const remainingNationIds = [alliance.founder_nation_id, ...newMemberNations];
      const remainingNationsData = allNationsData.filter(n => remainingNationIds.includes(n.id));

      const newMilitaryStrength = remainingNationsData.reduce((sum, n) => sum + (n.military_strength || 0), 0);
      const newTotalCities = remainingNationsData.reduce((sum, n) => sum + (n.cities || 0), 0);

      // 3. Update the alliance
      await Alliance.update(alliance.id, {
        member_nations: newMemberNations,
        member_roles: newMemberRoles,
        total_military_strength: newMilitaryStrength,
        total_cities: newTotalCities,
      });

      // FIX: Clear the leaving nation's alliance_id
      await Nation.update(nation.id, { alliance_id: null });

      // 4. Refresh parent component, which will change the view (user no longer in alliance)
      onUpdate();

    } catch (error) {
      console.error("Failed to leave alliance:", error);
    } finally {
      setIsLeaving(false);
      setShowLeaveConfirm(false);
    }
  };

  if (!alliance) {
    return (
      <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
        <CardContent className="text-center py-12">
          <Users className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Alliance</h3>
          <p className="text-slate-400 mb-6">
            You are not currently a member of any alliance. Join an existing alliance or create your own.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Get current user's role and permissions
  const userRole = isFounder ? 'founder' : (alliance.member_roles?.[nation?.id] || 'member');
  const roleDefinition = alliance.custom_roles?.[userRole] || alliance.custom_roles?.member;
  const userPermissions = roleDefinition?.permissions || {};

  // Check if user has specific permissions
  const canManageAlliance = isFounder || userPermissions.manage_alliance;
  const canDisbandAlliance = isFounder || userPermissions.disband_alliance;


  return (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-white">{alliance.name}</CardTitle>
              <CardDescription className="text-slate-400">{alliance.description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800/50">
            <TabsTrigger value="overview"><FileText className="w-4 h-4 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="bank"><Banknote className="w-4 h-4 mr-1" />Bank</TabsTrigger>
            {canManageAlliance && <TabsTrigger value="merger"><Users className="w-4 h-4 mr-1" />Merger</TabsTrigger>}
            <TabsTrigger value="profile"><ImageIcon className="w-4 h-4 mr-1" />Profile</TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-1" />Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span className="text-slate-400">Total Cities:</span>
                <span className="text-white font-medium">{alliance.total_cities || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-slate-400">Members:</span>
                <span className="text-white font-medium">{(alliance.member_nations?.length || 0) + (alliance.founder_nation_id ? 1 : 0)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-red-400" />
                <span className="text-slate-400">Military Power:</span>
                <span className="text-white font-medium">{(alliance.total_military_strength || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span className="text-slate-400">Treasury:</span>
                <span className="text-white font-medium">${(alliance.treasury || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 font-medium">Leadership</span>
              </div>
              <div className="text-sm text-slate-400">
                Founded by: <span className="text-white font-medium">{founderNation?.name || 'Unknown Nation'}</span> on {format(new Date(alliance.created_date), "PPP")}
              </div>
            </div>

            {isFounder && (
              <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Edit className="w-5 h-5" />
                    Edit Alliance Description
                  </CardTitle>
                  <CardDescription>Update the public description of your alliance.</CardDescription>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <Input
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        className="bg-slate-600 border-slate-500"
                      />
                      <div className="flex gap-2">
                        <Button onClick={onUpdateDescription}>Save</Button>
                        <Button variant="outline" onClick={() => { setIsEditing(false); setEditedDescription(alliance.description); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <p className="text-slate-400 italic">{alliance.description}</p>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="bank" className="mt-6">
            {isLoadingDetails ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              </div>
            ) : (
              <AllianceBank
                key={`alliance-bank-${alliance.updated_date || alliance.id}-v4`}
                alliance={alliance}
                nation={nation}
                myNationResources={myNationResources}
                allNationsData={allNationsData}
                allianceTransactions={allianceTransactions}
                onUpdate={loadMyAllianceDetailsData}
              />
            )}
          </TabsContent>

          {canManageAlliance && (
            <TabsContent value="merger" className="mt-6">
              <AllianceMerger
                alliance={alliance}
                nation={nation}
                onUpdate={onUpdate}
              />
            </TabsContent>
          )}

          <TabsContent value="profile" className="mt-6">
            {canManageAlliance ? (
                <AllianceProfileSettings alliance={alliance} onUpdate={onUpdate} />
            ) : (
                 <Card className="bg-slate-800/80 border-slate-700">
                    <CardContent className="text-center py-12">
                        <Shield className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
                        <p className="text-slate-400">
                           You do not have the required permissions to edit the alliance's public profile.
                        </p>
                    </CardContent>
                </Card>
            )}
          </TabsContent>

          <TabsContent value="settings" className="mt-6 space-y-6">
            {canManageAlliance && (
              <AllianceLogoUpload
                alliance={alliance}
                nation={nation}
                onUpdate={onUpdate}
              />
            )}

            {canDisbandAlliance && (
              <Card className="bg-slate-800/80 border-red-500/30">
                <CardHeader>
                  <CardTitle className="text-red-400 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Disband Alliance
                  </CardTitle>
                  <CardDescription>Permanently disband your alliance. This action cannot be undone.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setShowDisbandConfirm(true)} variant="destructive">
                    <X className="w-4 h-4 mr-2" /> Disband Alliance
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isFounder && (
              <Card className="bg-slate-800/80 border-red-500/30">
                  <CardHeader>
                      <CardTitle className="text-red-400 flex items-center gap-2">
                        <UserX className="w-5 h-5" />
                        Membership Actions
                      </CardTitle>
                      <CardDescription>Actions that will remove you from this alliance.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <div className="flex justify-between items-center">
                          <div>
                              <h4 className="font-semibold text-white">Leave Alliance</h4>
                              <p className="text-sm text-slate-400">You will no longer be a member and will lose all associated benefits and permissions.</p>
                          </div>
                          <Button variant="destructive" onClick={() => setShowLeaveConfirm(true)} disabled={isLeaving}>
                              <X className="w-4 h-4 mr-2" />
                              Leave Alliance
                          </Button>
                      </div>
                  </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <AlertDialog open={showDisbandConfirm} onOpenChange={setShowDisbandConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently disband your alliance, and all members will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisbanding}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisband} disabled={isDisbanding} className="bg-red-600 hover:bg-red-700">
              {isDisbanding ? 'Disbanding...' : 'Disband Alliance'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. You will be removed from {alliance.name}. You will lose any roles and permissions you have. To rejoin, you would need to be invited again.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel disabled={isLeaving}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveAlliance} disabled={isLeaving} className="bg-red-600 hover:bg-red-700">
                      {isLeaving ? 'Leaving...' : 'Yes, Leave Alliance'}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
