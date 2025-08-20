import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Handshake, MessageSquare } from "lucide-react";

export default function ProposeCeasefireModal({ isOpen, onClose, onPropose, isProposing, opponentName }) {
    const [message, setMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onPropose(message);
        setMessage('');
    };

    const handleClose = () => {
        setMessage('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Handshake className="w-5 h-5 text-blue-400" />
                        Propose Ceasefire to {opponentName}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        End this conflict through diplomatic negotiation. Your opponent will have 24 hours to respond.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="message" className="text-slate-300 flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4" />
                            Optional Message
                        </Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Explain your reasons for proposing this ceasefire..."
                            className="bg-slate-700 border-slate-600 text-white"
                            rows={4}
                            maxLength={500}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            {message.length}/500 characters
                        </p>
                    </div>

                    <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                        <h4 className="text-blue-300 font-medium mb-2">Ceasefire Terms:</h4>
                        <ul className="text-sm text-blue-200 space-y-1">
                            <li>• All hostilities will immediately cease</li>
                            <li>• No winner or loser will be declared</li>
                            <li>• Both nations retain their current territories</li>
                            <li>• War status will be marked as "Ceasefire"</li>
                        </ul>
                    </div>

                    <div className="flex gap-3">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={handleClose}
                            className="flex-1 border-slate-600"
                            disabled={isProposing}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit"
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            disabled={isProposing}
                        >
                            {isProposing ? (
                                <>
                                    <div className="animate-spin w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Handshake className="w-4 h-4 mr-2" />
                                    Send Proposal
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}