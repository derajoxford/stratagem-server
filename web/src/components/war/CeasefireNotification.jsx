import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Handshake, Clock, MessageSquare } from "lucide-react";

export default function CeasefireNotification({ proposal, onRespond, isResponding, opponentName }) {
    if (!proposal) return null;

    const timeLeft = proposal.expires_at ? 
        Math.max(0, Math.floor((new Date(proposal.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60))) : 0;

    return (
        <Card className="bg-blue-900/50 border-blue-500/50 animate-pulse">
            <CardHeader>
                <CardTitle className="text-blue-300 flex items-center gap-2">
                    <Handshake className="w-6 h-6" />
                    Ceasefire Proposal Received
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-blue-200">
                    <Clock className="w-4 h-4" />
                    <span>Expires in {timeLeft} hours</span>
                </div>
                
                <p className="text-blue-100">
                    <strong>{opponentName}</strong> has proposed a ceasefire to end this conflict peacefully.
                </p>

                {proposal.message && (
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-600">
                        <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-400">Message from {opponentName}:</span>
                        </div>
                        <p className="text-slate-200 text-sm italic">"{proposal.message}"</p>
                    </div>
                )}

                <div className="flex gap-3">
                    <Button 
                        onClick={() => onRespond('accepted')}
                        disabled={isResponding}
                        className="bg-green-600 hover:bg-green-700 flex-1"
                    >
                        <Handshake className="w-4 h-4 mr-2" />
                        Accept Ceasefire
                    </Button>
                    <Button 
                        onClick={() => onRespond('rejected')}
                        disabled={isResponding}
                        variant="destructive"
                        className="flex-1"
                    >
                        Decline
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}