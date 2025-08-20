
import React, { useState, useEffect } from 'react';
import { Nation, Message } from '@/entities/all';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2, Search } from 'lucide-react';

export default function ComposeMessageModal({ isOpen, onClose, onMessageSent, myNation, initialData }) {
    const [allNations, setAllNations] = useState([]);
    const [recipientNationId, setRecipientNationId] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [recipientDetails, setRecipientDetails] = useState(null); // New state for static display

    useEffect(() => {
        const setupModal = async () => {
            if (isOpen) {
                try {
                    const nations = await Nation.filter({ active: true });
                    const otherNations = nations.filter(nation => nation.id !== myNation.id);
                    setAllNations(otherNations);
                    
                    if (initialData) {
                        setRecipientNationId(initialData.recipientNationId || '');
                        setSubject(initialData.subject || '');
                        const recipient = otherNations.find(n => n.id === initialData.recipientNationId);
                        setRecipientDetails(recipient);
                    } else {
                        // Reset form for new messages
                        setRecipientNationId('');
                        setSubject('');
                        setRecipientDetails(null);
                    }
                    setBody('');
                } catch (error) {
                    console.error('Failed to load nations:', error);
                }
            }
        };
        setupModal();
    }, [isOpen, initialData, myNation?.id]);

    const handleSend = async () => {
        if (!recipientNationId || !subject.trim() || !body.trim()) {
            alert('Please fill in all fields');
            return;
        }

        setIsSending(true);
        try {
            await Message.create({
                sender_nation_id: myNation.id,
                recipient_nation_id: recipientNationId,
                subject: subject.trim(),
                body: body.trim(),
                message_type: 'direct_message'
            });

            onMessageSent();
            onClose();
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message. Please try again.');
        }
        setIsSending(false);
    };

    const handleClose = () => {
        setRecipientNationId('');
        setSubject('');
        setBody('');
        setSearchTerm('');
        setRecipientDetails(null); // Reset recipient details on close
        onClose();
    };

    const filteredNations = allNations.filter(nation =>
        nation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nation.leader_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] bg-slate-800 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Send className="w-5 h-5" />
                        {initialData ? 'Reply to Message' : 'Compose Message'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="recipient" className="text-slate-300">To:</Label>
                        {recipientDetails ? (
                            <div className="flex items-center p-3 rounded-md bg-slate-700 border border-slate-600">
                                <div className="flex flex-col">
                                    <span className="font-medium text-white">{recipientDetails.name}</span>
                                    <span className="text-sm text-slate-400">Led by {recipientDetails.leader_name}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <Input
                                        placeholder="Search nations..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 bg-slate-700 border-slate-600 text-white"
                                    />
                                </div>
                                <Select value={recipientNationId} onValueChange={setRecipientNationId}>
                                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                        <SelectValue placeholder="Select recipient nation" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-700 border-slate-600">
                                        {filteredNations.map(nation => (
                                            <SelectItem key={nation.id} value={nation.id} className="text-white hover:bg-slate-600">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{nation.name}</span>
                                                    <span className="text-sm text-slate-400">Led by {nation.leader_name}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subject" className="text-slate-300">Subject:</Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter message subject"
                            className="bg-slate-700 border-slate-600 text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="body" className="text-slate-300">Message:</Label>
                        <Textarea
                            id="body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Enter your message here..."
                            rows={8}
                            className="bg-slate-700 border-slate-600 text-white resize-none"
                        />
                        <div className="text-right text-xs text-slate-400">
                            {body.length}/1000 characters
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button 
                        variant="outline" 
                        onClick={handleClose}
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSend}
                        disabled={isSending || !recipientNationId || !subject.trim() || !body.trim()}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        {isSending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Message
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
