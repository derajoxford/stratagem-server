
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Handshake,
  Plus,
  Check,
  X,
  Clock,
  Shield,
  AlertTriangle,
  Calendar,
  Scroll
} from "lucide-react";
import { Treaty, Alliance } from "@/api/entities";
import { format, addDays, isAfter } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TREATY_TYPES = {
  "MDP": {
    name: "Mutual Defense Pact",
    description: "Both alliances agree to defend each other if attacked",
    color: "bg-red-500/20 text-red-400 border-red-500/30"
  },
  "ODoAP": {
    name: "Optional Defense Optional Aggression Pact",
    description: "Optional mutual assistance in both defense and offense",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30"
  },
  "MDoAP": {
    name: "Mutual Defense Optional Aggression Pact",
    description: "Mutual defense required, optional assistance in offense",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
  },
  "Protectorate": {
    name: "Protectorate",
    description: "One alliance protects another (asymmetric relationship)",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30"
  },
  "Extension": {
    name: "Extension",
    description: "Formal alliance extension or subsidiary relationship",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30"
  },
  "NAP": {
    name: "Non-Aggression Pact",
    description: "Agreement not to attack each other",
    color: "bg-green-500/20 text-green-400 border-green-500/30"
  }
};

export default function TreatyManagement({ myAlliance, nation, onUpdate }) {
  const [treaties, setTreaties] = useState([]);
  const [allAlliances, setAllAlliances] = useState([]);
  const [showCreateTreatyModal, setShowCreateTreatyModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create treaty form state
  const [newTreaty, setNewTreaty] = useState({
    treaty_name: "",
    treaty_type: "",
    target_alliance_id: "",
    terms: "",
    duration_days: ""
  });

  // Fix the permission check logic
  const canManageTreaties = myAlliance && nation && (
    // Check if user is the founder
    myAlliance.founder_nation_id === nation.id ||
    // Check if user has a role with manage_treaties permission
    (myAlliance.member_roles &&
     myAlliance.custom_roles &&
     myAlliance.member_roles[nation.id] &&
     myAlliance.custom_roles[myAlliance.member_roles[nation.id]]?.permissions?.manage_treaties)
  );

  // Add debugging information
  console.log('Treaty Management Debug Info:', {
    myAlliance: myAlliance?.name,
    nationId: nation?.id,
    founderId: myAlliance?.founder_nation_id,
    isFounder: myAlliance?.founder_nation_id === nation?.id,
    memberRole: myAlliance?.member_roles?.[nation?.id],
    customRoles: myAlliance?.custom_roles,
    rolePermissions: myAlliance?.custom_roles?.[myAlliance?.member_roles?.[nation?.id]]?.permissions,
    canManageTreaties
  });

  useEffect(() => {
    if (myAlliance) {
      loadTreatyData();
    }
  }, [myAlliance]);

  const loadTreatyData = async () => {
    setIsLoading(true);
    try {
      const [treatiesData, alliancesData] = await Promise.all([
        Treaty.list("-created_date"),
        Alliance.list()
      ]);

      // Filter treaties that involve our alliance
      const myTreaties = treatiesData.filter(treaty =>
        treaty.alliance_1_id === myAlliance.id || treaty.alliance_2_id === myAlliance.id
      );

      setTreaties(myTreaties);
      setAllAlliances(alliancesData.filter(a => a.id !== myAlliance.id && a.active));
    } catch (error) {
      console.error("Error loading treaty data:", error);
    }
    setIsLoading(false);
  };

  const handleCreateTreaty = () => {
    setNewTreaty({
      treaty_name: "",
      treaty_type: "",
      target_alliance_id: "",
      terms: "",
      duration_days: ""
    });
    setShowCreateTreatyModal(true);
  };

  const submitCreateTreaty = async () => {
    if (!newTreaty.treaty_name.trim() || !newTreaty.treaty_type || !newTreaty.target_alliance_id) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const treatyData = {
        treaty_name: newTreaty.treaty_name.trim(),
        treaty_type: newTreaty.treaty_type,
        alliance_1_id: myAlliance.id,
        alliance_2_id: newTreaty.target_alliance_id,
        proposed_by_alliance_id: myAlliance.id,
        terms: newTreaty.terms.trim() || `${TREATY_TYPES[newTreaty.treaty_type].description}`,
        status: "proposed"
      };

      if (newTreaty.duration_days) {
        const durationDays = parseInt(newTreaty.duration_days);
        treatyData.duration_days = durationDays;
        treatyData.expires_at = addDays(new Date(), durationDays).toISOString();
      }

      await Treaty.create(treatyData);

      setShowCreateTreatyModal(false);
      loadTreatyData();
      alert("Treaty proposal sent successfully!");
    } catch (error) {
      console.error("Error creating treaty:", error);
      alert("Failed to create treaty. Please try again.");
    }
    setIsSubmitting(false);
  };

  const handleTreatyResponse = async (treatyId, response) => {
    try {
      const updateData = { status: response };

      if (response === "active") {
        updateData.signed_at = new Date().toISOString();
      } else if (response === "cancelled") {
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancelled_by_alliance_id = myAlliance.id;
      }

      await Treaty.update(treatyId, updateData);
      loadTreatyData();

      const actionText = response === "active" ? "signed" : "rejected";
      alert(`Treaty ${actionText} successfully!`);
    } catch (error) {
      console.error(`Error ${response} treaty:`, error);
      alert(`Failed to ${response} treaty. Please try again.`);
    }
  };

  const handleCancelTreaty = async (treatyId, reason = "") => {
    if (!confirm("Are you sure you want to cancel this treaty? This action cannot be undone.")) {
      return;
    }

    try {
      await Treaty.update(treatyId, {
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by_alliance_id: myAlliance.id,
        cancellation_reason: reason
      });

      loadTreatyData();
      alert("Treaty cancelled successfully!");
    } catch (error) {
      console.error("Error cancelling treaty:", error);
      alert("Failed to cancel treaty. Please try again.");
    }
  };

  const getAllianceName = (allianceId) => {
    const alliance = allAlliances.find(a => a.id === allianceId) ||
                   (myAlliance.id === allianceId ? myAlliance : null);
    return alliance?.name || "Unknown Alliance";
  };

  const getOtherAllianceId = (treaty) => {
    return treaty.alliance_1_id === myAlliance.id ? treaty.alliance_2_id : treaty.alliance_1_id;
  };

  if (!canManageTreaties) {
    return (
      <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
        <CardContent className="text-center py-12">
          <Shield className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Access Denied</h3>
          <p className="text-slate-400 mb-4">
            You don't have permission to manage alliance treaties.
          </p>
          <div className="text-left max-w-md mx-auto bg-slate-700/50 p-4 rounded-lg">
            <h4 className="text-white font-medium mb-2">Debug Information:</h4>
            <div className="text-xs text-slate-300 space-y-1">
              <p>Alliance: {myAlliance?.name || 'None'}</p>
              <p>Your Nation ID: {nation?.id || 'Unknown'}</p>
              <p>Alliance Founder ID: {myAlliance?.founder_nation_id || 'Unknown'}</p>
              <p>Your Role: {myAlliance?.member_roles?.[nation?.id] || 'None'}</p>
              <p>Role Permissions: {JSON.stringify(myAlliance?.custom_roles?.[myAlliance?.member_roles?.[nation?.id]]?.permissions || {})}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white flex items-center gap-2">
              <Handshake className="w-5 h-5 text-blue-400" />
              Treaty Management
            </CardTitle>
            <Button onClick={handleCreateTreaty} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Propose Treaty
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="bg-slate-700 rounded-lg h-24 animate-pulse"></div>
              ))}
            </div>
          ) : treaties.length === 0 ? (
            <div className="text-center py-12">
              <Handshake className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Treaties</h3>
              <p className="text-slate-400">
                Your alliance has no treaties yet. Start building diplomatic relationships!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {treaties.map((treaty) => {
                const otherAllianceId = getOtherAllianceId(treaty);
                const otherAllianceName = getAllianceName(otherAllianceId);
                const treatyType = TREATY_TYPES[treaty.treaty_type];
                const isProposedByUs = treaty.proposed_by_alliance_id === myAlliance.id;
                const canRespond = treaty.status === "proposed" && !isProposedByUs;
                const isExpired = treaty.expires_at && isAfter(new Date(), new Date(treaty.expires_at));

                return (
                  <Card key={treaty.id} className="bg-slate-700/50 border-slate-600">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-white font-medium text-lg">{treaty.treaty_name}</h4>
                          <p className="text-slate-400 text-sm">
                            {isProposedByUs ? `Proposed to ${otherAllianceName}` : `Proposed by ${otherAllianceName}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={treatyType.color}>
                            {treaty.treaty_type}
                          </Badge>
                          <Badge
                            className={
                              treaty.status === "active" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                              treaty.status === "proposed" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                              "bg-red-500/20 text-red-400 border-red-500/30"
                            }
                          >
                            {treaty.status}
                          </Badge>
                          {isExpired && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                              Expired
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h5 className="text-slate-300 font-medium mb-1">Treaty Terms</h5>
                        <p className="text-slate-400 text-sm">{treaty.terms}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Type:</span>
                          <span className="text-white ml-2">{treatyType.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Duration:</span>
                          <span className="text-white ml-2">
                            {treaty.duration_days ? `${treaty.duration_days} days` : "Indefinite"}
                          </span>
                        </div>
                        {treaty.signed_at && (
                          <div>
                            <span className="text-slate-400">Signed:</span>
                            <span className="text-white ml-2">
                              {format(new Date(treaty.signed_at), "PPP")}
                            </span>
                          </div>
                        )}
                        {treaty.expires_at && (
                          <div>
                            <span className="text-slate-400">Expires:</span>
                            <span className="text-white ml-2">
                              {format(new Date(treaty.expires_at), "PPP")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-2 pt-4 border-t border-slate-600">
                        {canRespond && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTreatyResponse(treaty.id, "cancelled")}
                              className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleTreatyResponse(treaty.id, "active")}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Sign Treaty
                            </Button>
                          </>
                        )}

                        {treaty.status === "active" && !isExpired && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancelTreaty(treaty.id)}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel Treaty
                          </Button>
                        )}

                        {treaty.status === "proposed" && isProposedByUs && (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Awaiting Response
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Treaty Modal */}
      <Dialog open={showCreateTreatyModal} onOpenChange={setShowCreateTreatyModal}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Propose New Treaty</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a diplomatic agreement with another alliance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Treaty Name</Label>
                <Input
                  value={newTreaty.treaty_name}
                  onChange={(e) => setNewTreaty({...newTreaty, treaty_name: e.target.value})}
                  placeholder="e.g., Pacific Defense Alliance"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Treaty Type</Label>
                <Select
                  value={newTreaty.treaty_type}
                  onValueChange={(value) => setNewTreaty({...newTreaty, treaty_type: value})}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Select treaty type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TREATY_TYPES).map(([key, type]) => (
                      <SelectItem key={key} value={key}>
                        <div>
                          <div className="font-medium">{type.name}</div>
                          <div className="text-xs text-slate-400">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Target Alliance</Label>
                <Select
                  value={newTreaty.target_alliance_id}
                  onValueChange={(value) => setNewTreaty({...newTreaty, target_alliance_id: value})}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Select alliance" />
                  </SelectTrigger>
                  <SelectContent>
                    {allAlliances.map((alliance) => (
                      <SelectItem key={alliance.id} value={alliance.id}>
                        {alliance.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Duration (Days)</Label>
                <Input
                  type="number"
                  value={newTreaty.duration_days}
                  onChange={(e) => setNewTreaty({...newTreaty, duration_days: e.target.value})}
                  placeholder="Leave empty for indefinite"
                  className="bg-slate-700 border-slate-600 text-white"
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Treaty Terms</Label>
              <Textarea
                value={newTreaty.terms}
                onChange={(e) => setNewTreaty({...newTreaty, terms: e.target.value})}
                placeholder="Describe the specific terms and conditions of this treaty..."
                className="bg-slate-700 border-slate-600 text-white h-24"
                maxLength={1000}
              />
              <div className="text-xs text-slate-400 text-right">
                {newTreaty.terms.length}/1000 characters
              </div>
            </div>

            {newTreaty.treaty_type && (
              <div className="bg-slate-700/30 p-3 rounded-lg">
                <h4 className="text-slate-300 font-medium mb-1">
                  {TREATY_TYPES[newTreaty.treaty_type].name}
                </h4>
                <p className="text-slate-400 text-sm">
                  {TREATY_TYPES[newTreaty.treaty_type].description}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateTreatyModal(false)}
              className="border-slate-600 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={submitCreateTreaty}
              disabled={!newTreaty.treaty_name.trim() || !newTreaty.treaty_type || !newTreaty.target_alliance_id || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Proposing...
                </>
              ) : (
                <>
                  <Scroll className="w-4 h-4 mr-2" />
                  Propose Treaty
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
