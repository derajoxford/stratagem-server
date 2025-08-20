
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Search,
  Calendar,
  User
} from "lucide-react";
import { AllianceInvitation, AllianceApplication, Nation, Alliance } from "@/entities/all";
import { format, isAfter } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AllianceInvitations({ nation, onUpdate }) {
  const [incomingInvitations, setIncomingInvitations] = useState([]);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [allNations, setAllNations] = useState({});
  const [myAlliance, setMyAlliance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Invitation modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [invitationMessage, setInvitationMessage] = useState("");
  const [selectedNation, setSelectedNation] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadInvitationData();
  }, [nation]);

  const loadInvitationData = async () => {
    setIsLoading(true);
    try {
      // Load all nations for reference
      const nationsData = await Nation.list();
      const nationsMap = {};
      nationsData.forEach(n => { nationsMap[n.id] = n; });
      setAllNations(nationsMap);

      // Find user's alliance
      const alliancesData = await Alliance.list();
      const userAlliance = alliancesData.find(alliance =>
        alliance.founder_nation_id === nation.id ||
        alliance.member_nations.includes(nation.id)
      );
      setMyAlliance(userAlliance);

      // Load incoming invitations for this nation
      const incomingInvites = await AllianceInvitation.filter({
        invited_nation_id: nation.id,
        status: "pending"
      });
      setIncomingInvitations(incomingInvites);

      if (userAlliance) {
        // Load sent invitations from this alliance
        const sentInvites = await AllianceInvitation.filter({
          alliance_id: userAlliance.id
        });
        setSentInvitations(sentInvites);

        // Load pending applications to this alliance
        const applications = await AllianceApplication.filter({
          alliance_id: userAlliance.id,
          status: "pending"
        });
        setPendingApplications(applications);
      }

    } catch (error) {
      console.error("Error loading invitation data:", error);
    }
    setIsLoading(false);
  };

  const handleInvitationResponse = async (invitationId, response) => {
    try {
      await AllianceInvitation.update(invitationId, {
        status: response,
        responded_at: new Date().toISOString()
      });

      if (response === "accepted") {
        // Add nation to alliance and update alliance
        const invitation = incomingInvitations.find(inv => inv.id === invitationId);
        const alliance = await Alliance.get(invitation.alliance_id);

        const memberNationIds = alliance.member_nations || [];
        await Alliance.update(alliance.id, {
          member_nations: [...memberNationIds, nation.id],
          member_roles: { ...alliance.member_roles, [nation.id]: 'member' }
        });

        // FIX: Update the nation's own alliance_id record
        await Nation.update(nation.id, { alliance_id: alliance.id });

        onUpdate(); // Refresh parent data
      } else {
        loadInvitationData(); // Just refresh local data for decline/expire
      }

    } catch (error) {
      console.error("Error responding to invitation:", error);
    }
  };

  const handleApplicationResponse = async (applicationId, response, reviewMessage = "") => {
    try {
      await AllianceApplication.update(applicationId, {
        status: response,
        reviewed_by: nation.id,
        review_message: reviewMessage,
        reviewed_at: new Date().toISOString()
      });

      if (response === "approved") {
        // Add applicant to alliance
        const application = pendingApplications.find(app => app.id === applicationId);
        const memberNationIds = myAlliance.member_nations || [];

        await Alliance.update(myAlliance.id, {
          member_nations: [...memberNationIds, application.applicant_nation_id],
          member_roles: { ...myAlliance.member_roles, [application.applicant_nation_id]: 'member' }
        });

        // FIX: Update the applicant's nation record
        await Nation.update(application.applicant_nation_id, { alliance_id: myAlliance.id });

        onUpdate(); // Refresh parent data
      } else {
        loadInvitationData(); // Just refresh local data for rejection
      }

    } catch (error) {
      console.error("Error responding to application:", error);
    }
  };

  const sendInvitation = async () => {
    if (!selectedNation || !myAlliance || !invitationMessage.trim()) return;

    setIsSubmitting(true);
    try {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 7); // 7 days from now

      await AllianceInvitation.create({
        alliance_id: myAlliance.id,
        invited_nation_id: selectedNation.id,
        inviter_nation_id: nation.id,
        invitation_message: invitationMessage.trim(),
        expires_at: expirationDate.toISOString()
      });

      setShowInviteModal(false);
      setSelectedNation(null);
      setInvitationMessage("");
      setSearchTerm("");

      alert(`Invitation sent to ${selectedNation.name}!`);
      loadInvitationData();

    } catch (error) {
      console.error("Error sending invitation:", error);
      alert("Failed to send invitation. Please try again.");
    }
    setIsSubmitting(false);
  };

  const canInvite = myAlliance && ['founder', 'leader', 'officer'].includes(myAlliance.member_roles?.[nation.id]);
  const canReviewApplications = myAlliance && ['founder', 'leader'].includes(myAlliance.member_roles?.[nation.id]);

  const availableNations = Object.values(allNations).filter(n =>
    n.id !== nation.id && // Not self
    !myAlliance?.member_nations.includes(n.id) && // Not already in alliance
    myAlliance?.founder_nation_id !== n.id && // Not alliance founder
    n.name.toLowerCase().includes(searchTerm.toLowerCase()) // Matches search
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="bg-slate-700 rounded-lg h-32 animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Incoming Invitations */}
      <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-400" />
            Incoming Invitations ({incomingInvitations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {incomingInvitations.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Mail className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p>No pending alliance invitations.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {incomingInvitations.map((invitation) => {
                const alliance = allNations[invitation.alliance_id];
                const inviter = allNations[invitation.inviter_nation_id];
                const isExpired = invitation.expires_at && isAfter(new Date(), new Date(invitation.expires_at));

                return (
                  <div key={invitation.id} className="bg-slate-700/50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="text-white font-medium">
                          Invitation from Alliance "{alliance?.name || 'Unknown'}"
                        </h4>
                        <p className="text-slate-400 text-sm">
                          Invited by {inviter?.name || 'Unknown Nation'}
                        </p>
                      </div>
                      {isExpired && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                          Expired
                        </Badge>
                      )}
                    </div>

                    <p className="text-slate-300 text-sm mb-4">{invitation.invitation_message}</p>

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">
                        Expires: {invitation.expires_at ? format(new Date(invitation.expires_at), "PPP") : "Never"}
                      </span>
                      {!isExpired && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleInvitationResponse(invitation.id, "declined")}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleInvitationResponse(invitation.id, "accepted")}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Applications (only if user can review) */}
      {canReviewApplications && (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              Pending Applications ({pendingApplications.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingApplications.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Clock className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p>No pending applications to review.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingApplications.map((application) => {
                  const applicant = allNations[application.applicant_nation_id];

                  return (
                    <div key={application.id} className="bg-slate-700/50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="text-white font-medium">
                            Application from {applicant?.name || 'Unknown Nation'}
                          </h4>
                          <p className="text-slate-400 text-sm">
                            Applied {format(new Date(application.created_date), "PPP")}
                          </p>
                        </div>
                      </div>

                      <p className="text-slate-300 text-sm mb-4">{application.application_message}</p>

                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplicationResponse(application.id, "rejected")}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApplicationResponse(application.id, "approved")}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Send Invitations (only if user can invite) */}
      {canInvite && (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-400" />
              Recruit Nations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => setShowInviteModal(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sent Invitations */}
      {myAlliance && (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-green-400" />
              Sent Invitations ({sentInvitations.filter(inv => inv.status === 'pending').length} pending)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sentInvitations.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Send className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p>No invitations sent yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sentInvitations.slice(0, 5).map((invitation) => {
                  const invitedNation = allNations[invitation.invited_nation_id];
                  const inviter = allNations[invitation.inviter_nation_id];

                  return (
                    <div key={invitation.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                      <div>
                        <span className="text-white font-medium">
                          {invitedNation?.name || 'Unknown Nation'}
                        </span>
                        <p className="text-slate-400 text-sm">
                          Invited by {inviter?.name} • {format(new Date(invitation.created_date), "MMM d")}
                        </p>
                      </div>
                      <Badge
                        className={
                          invitation.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                          invitation.status === 'accepted' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          'bg-red-500/20 text-red-400 border-red-500/30'
                        }
                      >
                        {invitation.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Invite Nation Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              Invite Nation to {myAlliance?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Search for and invite a nation to join your alliance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Search Nations
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by nation name..."
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {searchTerm && (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {availableNations.slice(0, 10).map((nation) => (
                  <div
                    key={nation.id}
                    onClick={() => setSelectedNation(nation)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedNation?.id === nation.id
                        ? 'bg-purple-500/20 border border-purple-500/50'
                        : 'bg-slate-700/50 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="text-white font-medium">{nation.name}</div>
                        <div className="text-slate-400 text-sm">Led by {nation.leader_name}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {availableNations.length === 0 && (
                  <div className="text-center py-4 text-slate-400">
                    No nations found matching your search.
                  </div>
                )}
              </div>
            )}

            {selectedNation && (
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">
                  Invitation Message to {selectedNation.name}
                </label>
                <Textarea
                  value={invitationMessage}
                  onChange={(e) => setInvitationMessage(e.target.value)}
                  placeholder="Write a personal message explaining why you're inviting them to join..."
                  className="bg-slate-700 border-slate-600 text-white h-32"
                  maxLength={500}
                />
                <div className="text-xs text-slate-400 text-right mt-1">
                  {invitationMessage.length}/500 characters
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowInviteModal(false);
                setSelectedNation(null);
                setInvitationMessage("");
                setSearchTerm("");
              }}
              className="border-slate-600 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={sendInvitation}
              disabled={!selectedNation || !invitationMessage.trim() || isSubmitting}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
