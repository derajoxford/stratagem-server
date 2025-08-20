import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MergeProposal, Alliance, Nation } from "@/entities/all";
import { respondToMergeProposal } from "@/functions/respondToMergeProposal";
import {
    CheckCircle,
    XCircle,
    Clock,
    AlertTriangle,
    Users,
    Crown,
    Shield,
    Loader2
} from "lucide-react";
import { format, isAfter } from 'date-fns';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MergeProposals({ alliance, nation, onUpdate }) {
    const [proposals, setProposals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [processingProposal, setProcessingProposal] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);

    const loadProposals = async () => {
        try {
            setIsLoading(true);
            
            // Load all merge proposals where this alliance is involved
            const allProposals = await MergeProposal.list();
            const relevantProposals = allProposals.filter(proposal => 
                (proposal.proposing_alliance_id === alliance.id || 
                 proposal.receiving_alliance_id === alliance.id) &&
                proposal.status === 'pending'
            );

            // Load alliance and nation details for each proposal
            const proposalsWithDetails = await Promise.all(
                relevantProposals.map(async (proposal) => {
                    try {
                        const [proposingAlliance, receivingAlliance, proposerNation] = await Promise.all([
                            Alliance.filter({ id: proposal.proposing_alliance_id }).then(a => a[0]),
                            Alliance.filter({ id: proposal.receiving_alliance_id }).then(a => a[0]),
                            Nation.filter({ id: proposal.proposed_by_nation_id }).then(n => n[0])
                        ]);

                        return {
                            ...proposal,
                            proposingAlliance,
                            receivingAlliance,
                            proposerNation
                        };
                    } catch (err) {
                        console.error(`Error loading details for proposal ${proposal.id}:`, err);
                        return null;
                    }
                })
            );

            setProposals(proposalsWithDetails.filter(p => p !== null));
        } catch (err) {
            console.error("Error loading merge proposals:", err);
            setError("Failed to load merge proposals. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (alliance && nation) {
            loadProposals();
        }
    }, [alliance, nation]);

    const handleProposalResponse = async (proposalId, responseAction) => {
        // Ensure we have valid parameters
        if (!proposalId || (responseAction !== 'accept' && responseAction !== 'reject')) {
            const errorMsg = `Invalid parameters for proposal response. Received: proposalId=${proposalId}, responseAction=${responseAction}`;
            console.error(errorMsg);
            setError(errorMsg);
            return;
        }

        setProcessingProposal(proposalId);
        setError("");
        
        // Construct the exact payload the backend expects
        const payload = {
            proposalId: proposalId,        // camelCase 'I'
            response: responseAction       // 'accept' or 'reject' (not 'accepted'/'rejected')
        };

        try {
            console.log("Sending merge proposal response with payload:", JSON.stringify(payload));
            
            const result = await respondToMergeProposal(payload);
            
            if (result.data && result.data.success) {
                const actionText = responseAction === 'accept' ? 'accepted' : 'rejected';
                setError("");
                onUpdate(); // Refresh the parent component
                loadProposals(); // Refresh proposals
            } else {
                const errorMsg = result.data?.error || 'An unknown error occurred while responding to the proposal.';
                throw new Error(errorMsg);
            }
        } catch (err) {
            console.error("Error responding to merge proposal:", err);
            const errorMessage = err.message || "An unexpected error occurred.";
            setError(errorMessage);
        } finally {
            setProcessingProposal(null);
            setConfirmDialog(null);
        }
    };

    const confirmProposalResponse = (proposal, action) => {
        const actionText = action === 'accept' ? 'accept' : 'reject';
        const survivalText = action === 'accept' ? 
            (proposal.surviving_alliance_id === alliance.id ? 
                `Your alliance "${alliance.name}" will survive and absorb "${proposal.merging_alliance_id === alliance.id ? proposal.proposingAlliance?.name || 'Unknown' : proposal.receivingAlliance?.name || 'Unknown'}".` :
                `Your alliance "${alliance.name}" will be merged into "${proposal.surviving_alliance_id === proposal.proposingAlliance?.id ? proposal.proposingAlliance?.name || 'Unknown' : proposal.receivingAlliance?.name || 'Unknown'}".`
            ) : '';

        setConfirmDialog({
            title: `${actionText === 'accept' ? 'Accept' : 'Reject'} Merge Proposal`,
            description: `Are you sure you want to ${actionText} this merge proposal? ${survivalText}`,
            onConfirm: () => handleProposalResponse(proposal.id, action),
            confirmText: actionText === 'accept' ? 'Accept Merge' : 'Reject Proposal',
            confirmVariant: action === 'accept' ? 'default' : 'destructive'
        });
    };

    if (isLoading) {
        return (
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardContent className="text-center py-12">
                    <Loader2 className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-spin" />
                    <p className="text-slate-400">Loading merge proposals...</p>
                </CardContent>
            </Card>
        );
    }

    const incomingProposals = proposals.filter(p => p.receiving_alliance_id === alliance.id);
    const outgoingProposals = proposals.filter(p => p.proposing_alliance_id === alliance.id);

    return (
        <div className="space-y-6">
            {error && (
                <Alert className="border-red-500/50 bg-red-500/10">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <AlertDescription className="text-red-300">
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            {/* Incoming Proposals */}
            {incomingProposals.length > 0 && (
                <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-400" />
                            Incoming Merge Proposals
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {incomingProposals.map((proposal) => {
                            const isExpired = proposal.expires_at && isAfter(new Date(), new Date(proposal.expires_at));
                            const isProcessing = processingProposal === proposal.id;
                            
                            return (
                                <div key={proposal.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="text-white font-semibold mb-1">
                                                Merge with {proposal.proposingAlliance?.name || 'Unknown Alliance'}
                                            </h4>
                                            <p className="text-sm text-slate-400">
                                                Proposed by {proposal.proposerNation?.leader_name || 'Unknown Leader'} 
                                                {proposal.created_date && (
                                                    <span> on {format(new Date(proposal.created_date), 'PPP')}</span>
                                                )}
                                            </p>
                                        </div>
                                        <Badge variant={isExpired ? "destructive" : "secondary"}>
                                            {isExpired ? 'Expired' : 'Pending'}
                                        </Badge>
                                    </div>

                                    {proposal.message && (
                                        <div className="bg-slate-800/50 rounded p-3 mb-3">
                                            <p className="text-slate-300 text-sm">{proposal.message}</p>
                                        </div>
                                    )}

                                    <div className="text-sm text-slate-400 mb-3">
                                        <p>Surviving Alliance: <span className="text-white font-medium">
                                            {proposal.surviving_alliance_id === alliance.id ? alliance.name : 
                                             proposal.proposingAlliance?.name || 'Unknown'}
                                        </span></p>
                                        <p>Merging Alliance: <span className="text-white font-medium">
                                            {proposal.merging_alliance_id === alliance.id ? alliance.name : 
                                             proposal.proposingAlliance?.name || 'Unknown'}
                                        </span></p>
                                    </div>

                                    {!isExpired && (
                                        <div className="flex gap-3">
                                            <Button
                                                onClick={() => confirmProposalResponse(proposal, 'accept')}
                                                disabled={isProcessing}
                                                className="bg-green-600 hover:bg-green-700"
                                            >
                                                {isProcessing ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                )}
                                                Accept
                                            </Button>
                                            <Button
                                                onClick={() => confirmProposalResponse(proposal, 'reject')}
                                                disabled={isProcessing}
                                                variant="destructive"
                                                className="bg-red-600 hover:bg-red-700"
                                            >
                                                {isProcessing ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                )}
                                                Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {/* Outgoing Proposals */}
            {outgoingProposals.length > 0 && (
                <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-400" />
                            Outgoing Merge Proposals
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {outgoingProposals.map((proposal) => {
                            const isExpired = proposal.expires_at && isAfter(new Date(), new Date(proposal.expires_at));
                            
                            return (
                                <div key={proposal.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="text-white font-semibold mb-1">
                                                Merge with {proposal.receivingAlliance?.name || 'Unknown Alliance'}
                                            </h4>
                                            <p className="text-sm text-slate-400">
                                                Sent {proposal.created_date && format(new Date(proposal.created_date), 'PPP')}
                                            </p>
                                        </div>
                                        <Badge variant={isExpired ? "destructive" : "secondary"}>
                                            {isExpired ? 'Expired' : 'Awaiting Response'}
                                        </Badge>
                                    </div>

                                    <div className="text-sm text-slate-400">
                                        <p>Surviving Alliance: <span className="text-white font-medium">
                                            {proposal.surviving_alliance_id === alliance.id ? alliance.name : 
                                             proposal.receivingAlliance?.name || 'Unknown'}
                                        </span></p>
                                        <p>Expires: <span className="text-white font-medium">
                                            {proposal.expires_at ? format(new Date(proposal.expires_at), 'PPP') : 'Never'}
                                        </span></p>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {proposals.length === 0 && (
                <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                    <CardContent className="text-center py-12">
                        <Users className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No Merge Proposals</h3>
                        <p className="text-slate-400">There are currently no pending merge proposals for your alliance.</p>
                    </CardContent>
                </Card>
            )}

            {/* Confirmation Dialog */}
            <AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
                <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">
                            {confirmDialog?.title}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-300">
                            {confirmDialog?.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel 
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            onClick={() => setConfirmDialog(null)}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className={confirmDialog?.confirmVariant === 'destructive' ? 
                                "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
                            onClick={confirmDialog?.onConfirm}
                        >
                            {confirmDialog?.confirmText}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
