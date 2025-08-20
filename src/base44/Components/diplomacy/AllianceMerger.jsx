import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Alliance } from "@/entities/all";
import { proposeMerge } from "@/functions/proposeMerge";
import { Users, Loader2, AlertCircle } from 'lucide-react';

export default function AllianceMerger({ alliance, nation, onUpdate }) {
    const [allOtherAlliances, setAllOtherAlliances] = useState([]);
    const [selectedTarget, setSelectedTarget] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isProposing, setIsProposing] = useState(false);
    const [error, setError] = useState("");
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

    const isFounder = alliance?.founder_nation_id === nation?.id;
    const userRoleKey = alliance?.member_roles?.[nation?.id] || 'member';
    const userPermissions = alliance?.custom_roles?.[userRoleKey]?.permissions || {};
    const canProposeMerge = isFounder || userPermissions.disband_alliance;

    useEffect(() => {
        const fetchAlliances = async () => {
            setIsLoading(true);
            try {
                const all = await Alliance.list();
                const activeAndOther = all.filter(a => a.active && a.id !== alliance?.id);
                setAllOtherAlliances(activeAndOther);
            } catch (err) {
                console.error("Failed to load alliances:", err);
                setError("Could not load other alliances.");
            }
            setIsLoading(false);
        };
        if (canProposeMerge) {
            fetchAlliances();
        }
    }, [alliance, canProposeMerge]);
    
    const handlePropose = async () => {
        setShowConfirmDialog(false);
        setIsProposing(true);
        setError("");
        try {
            const result = await proposeMerge({ targetAllianceId: selectedTarget, message });
            if (result.data.success) {
                alert("Merge proposal sent successfully!");
                setSelectedTarget("");
                setMessage("");
                onUpdate();
            } else {
                throw new Error(result.data.error || "An unknown error occurred.");
            }
        } catch (err) {
            console.error("Failed to propose merge:", err);
            setError(err.message);
        }
        setIsProposing(false);
    };
    
    const onProposeClick = () => {
        if (!selectedTarget) {
            setError("You must select a target alliance.");
            return;
        }
        setError("");
        setShowConfirmDialog(true);
    };
    
    if (!canProposeMerge) {
        return null; // Don't render if user doesn't have permission
    }

    const targetAllianceName = allOtherAlliances.find(a => a.id === selectedTarget)?.name || "the selected alliance";

    return (
        <>
            <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-400" />
                        Alliance Merger
                    </CardTitle>
                    <CardDescription>
                        Propose to merge with another alliance. Your alliance will absorb them.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading alliances...</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Target Alliance</label>
                                <Select value={selectedTarget} onValueChange={setSelectedTarget}>
                                    <SelectTrigger className="bg-slate-700 border-slate-600">
                                        <SelectValue placeholder="Select an alliance to merge with" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allOtherAlliances.map(a => (
                                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">Message (Optional)</label>
                                <Textarea 
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Propose your terms or a greeting..."
                                    className="bg-slate-700 border-slate-600"
                                />
                            </div>

                            {error && (
                                <div className="text-red-400 text-sm flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" /> {error}
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button
                                    onClick={onProposeClick}
                                    disabled={isProposing || !selectedTarget || isLoading}
                                    className="bg-purple-600 hover:bg-purple-700"
                                >
                                    {isProposing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Propose Merger
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Merge Proposal</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to propose a merger with <span className="font-bold text-white">{targetAllianceName}</span>. 
                            If they accept, their alliance will be disbanded and all their members, treasury, and resources will be transferred to your alliance. 
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePropose} className="bg-purple-600 hover:bg-purple-700">
                            Confirm and Propose
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
