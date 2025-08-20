
import React, { useState, useEffect } from 'react';
import { User, Nation, Message } from '@/api/entities';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Loader2, Inbox, Send, Trash2, CheckCheck, Mail, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from "@/components/ui/checkbox";
import ComposeMessageModal from '../components/communications/ComposeMessageModal';
import { formatDistanceToNow } from 'date-fns';

export default function CommunicationsPage() {
    const [myNation, setMyNation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [composeInitialData, setComposeInitialData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState(new Set());

    const loadData = async () => {
        setIsLoading(true);
        try {
            const user = await User.me();
            const nations = await Nation.filter({ created_by: user.email, active: true });
            if (nations.length > 0) {
                const nation = nations[0];
                setMyNation(nation);
                const receivedMessages = await Message.filter({ recipient_nation_id: nation.id }, '-created_date');
                setMessages(receivedMessages);
            }
        } catch (error) {
            console.error("Error loading communications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const markAsRead = async (messageId) => {
        try {
            await Message.update(messageId, { is_read: true });
            setMessages(prev => prev.map(msg =>
                msg.id === messageId ? { ...msg, is_read: true } : msg
            ));
        } catch (error) {
            console.error('Failed to mark message as read:', error);
        }
    };

    const clearAllNotifications = async () => {
        setIsProcessing(true);
        try {
            const notificationsToClear = messages.filter(msg =>
                msg.message_type !== 'direct_message' && !msg.is_read
            );

            for (const notification of notificationsToClear) {
                await Message.update(notification.id, { is_read: true });
            }

            // Update local state
            setMessages(prev => prev.map(msg =>
                msg.message_type !== 'direct_message' ? { ...msg, is_read: true } : msg
            ));
        } catch (error) {
            console.error('Failed to clear notifications:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const deleteMessage = async (messageId) => {
        setIsProcessing(true);
        try {
            await Message.delete(messageId);
            setMessages(prev => prev.filter(msg => msg.id !== messageId));

            // Clear selected message if it was the one deleted
            if (selectedMessage && selectedMessage.id === messageId) {
                setSelectedMessage(null);
            }
            // Also remove from bulk selection if it was selected
            setSelectedMessageIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(messageId);
                return newSet;
            });
        } catch (error) {
            console.error('Failed to delete message:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleToggleSelection = (messageId) => {
        setSelectedMessageIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(messageId)) {
                newSet.delete(messageId);
            } else {
                newSet.add(messageId);
            }
            return newSet;
        });
    };

    const directMessages = messages.filter(msg => msg.message_type === 'direct_message');
    const notifications = messages.filter(msg => msg.message_type !== 'direct_message');

    const handleSelectAllDirectMessages = () => {
        if (selectedMessageIds.size === directMessages.length && directMessages.length > 0) {
            setSelectedMessageIds(new Set());
        } else {
            const allDirectMessageIds = new Set(directMessages.map(msg => msg.id));
            setSelectedMessageIds(allDirectMessageIds);
        }
    };

    const handleDeleteSelectedMessages = async () => {
        setIsProcessing(true);
        try {
            for (const messageId of selectedMessageIds) {
                await Message.delete(messageId);
            }
            setMessages(prev => prev.filter(msg => !selectedMessageIds.has(msg.id)));
            if (selectedMessage && selectedMessageIds.has(selectedMessage.id)) {
                setSelectedMessage(null);
            }
            setSelectedMessageIds(new Set()); // Clear selection after deletion
        } catch (error) {
            console.error('Failed to delete selected messages:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteReadNotifications = async () => {
        setIsProcessing(true);
        try {
            const readNotifications = messages.filter(msg =>
                msg.message_type !== 'direct_message' && msg.is_read
            );
            for (const notification of readNotifications) {
                await Message.delete(notification.id);
            }
            setMessages(prev => prev.filter(msg =>
                msg.message_type === 'direct_message' || !msg.is_read
            ));
            if (selectedMessage && selectedMessage.message_type !== 'direct_message' && selectedMessage.is_read) {
                setSelectedMessage(null); // Clear selected if it was a read notification that was deleted
            }
        } catch (error) {
            console.error('Failed to delete read notifications:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReply = (message) => {
        if (message.sender_nation_id) {
            setComposeInitialData({
                recipientNationId: message.sender_nation_id,
                subject: message.subject.startsWith('Re: ') ? message.subject : `Re: ${message.subject}`
            });
            setIsComposeModalOpen(true);
        }
    };

    const handleComposeNew = () => {
        setComposeInitialData(null);
        setIsComposeModalOpen(true);
    };

    const handleComposeClose = () => {
        setIsComposeModalOpen(false);
        setComposeInitialData(null);
    };

    if (isLoading) {
        return (
            <div className="p-8 flex justify-center items-center h-full">
                <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
            </div>
        );
    }

    if (!myNation) {
        return (
            <div className="p-8 text-center">
                <Mail className="w-16 h-16 mx-auto text-slate-500 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Create Your Nation First</h2>
                <p className="text-slate-400">You need a nation to access the communications center.</p>
            </div>
        );
    }

    const unreadCount = messages.filter(msg => !msg.is_read).length;
    const unreadNotificationsCount = notifications.filter(msg => !msg.is_read).length;
    const readNotificationsCount = notifications.filter(msg => msg.is_read).length;

    const renderMessageList = (messageList, messageType) => (
        <div className="space-y-2">
            {messageType === 'notification' && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {unreadNotificationsCount > 0 && (
                        <Button
                            onClick={clearAllNotifications}
                            disabled={isProcessing}
                            variant="outline"
                            size="sm"
                            className="flex-1 border-amber-500/30 hover:bg-amber-500/10"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCheck className="w-4 h-4 mr-2" />}
                            Clear All Unread ({unreadNotificationsCount})
                        </Button>
                    )}
                    {readNotificationsCount > 0 && (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    disabled={isProcessing}
                                    variant="destructive"
                                    size="sm"
                                    className="flex-1"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Read ({readNotificationsCount})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-800 border-slate-700">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Delete Read Notifications</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                        Are you sure you want to permanently delete all {readNotificationsCount} read notifications? This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-slate-700 border-slate-600 text-slate-300">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteReadNotifications} className="bg-red-600 hover:bg-red-700">
                                        Delete Notifications
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            )}

            {messageType === 'direct_message' && directMessages.length > 0 && (
                 <div className="flex items-center justify-between p-2 rounded-md bg-slate-900/50 mb-4">
                    <div className="flex items-center gap-2">
                         <Checkbox
                            id="select-all-direct-messages"
                            checked={selectedMessageIds.size > 0 && selectedMessageIds.size === directMessages.length}
                            onCheckedChange={handleSelectAllDirectMessages}
                            aria-label="Select all direct messages"
                        />
                        <label htmlFor="select-all-direct-messages" className="text-sm text-slate-300">
                            Select All
                        </label>
                    </div>
                    {selectedMessageIds.size > 0 && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    disabled={isProcessing}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Selected ({selectedMessageIds.size})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-800 border-slate-700">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">Delete Selected Messages</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                        Are you sure you want to permanently delete {selectedMessageIds.size} selected message(s)? This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-slate-700 border-slate-600 text-slate-300">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteSelectedMessages} className="bg-red-600 hover:bg-red-700">
                                        Delete Messages
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            )}

            {messageList.length === 0 ? (
                <div className="text-center py-8">
                    <Mail className="w-12 h-12 mx-auto text-slate-500 mb-4" />
                    <p className="text-slate-400">No messages found</p>
                </div>
            ) : (
                messageList.map(message => (
                    <div key={message.id} className="flex items-center gap-3">
                        {messageType === 'direct_message' && (
                            <Checkbox
                                checked={selectedMessageIds.has(message.id)}
                                onCheckedChange={() => handleToggleSelection(message.id)}
                                aria-label={`Select message: ${message.subject}`}
                            />
                        )}
                        <div 
                          className={`flex-1 border-l-4 p-4 cursor-pointer transition-colors duration-200 ${
                            selectedMessage?.id === message.id ? 'bg-slate-700/80 border-amber-500' : 'bg-slate-800/50 border-slate-600 hover:bg-slate-700/50'
                          }`}
                          onClick={() => {
                              setSelectedMessage(message);
                              if (!message.is_read) {
                                  markAsRead(message.id);
                              }
                          }}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                                {message.sender_nation_id ? (
                                    <a 
                                        href={createPageUrl(`PublicNationProfile?nationId=${message.sender_nation_id}`)} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        onClick={(e) => e.stopPropagation()}
                                        className={`font-semibold hover:underline ${message.is_read ? 'text-slate-300' : 'text-white'}`}
                                    >
                                        {`Nation #${message.sender_nation_id}`} {/* Using ID as sender_name is not available */}
                                    </a>
                                ) : (
                                    <p className={`font-semibold ${message.is_read ? 'text-slate-300' : 'text-white'}`}>
                                        System
                                    </p>
                                )}
                              <p className={`text-sm truncate max-w-xs ${message.is_read ? 'text-slate-400' : 'text-slate-200 font-medium'}`}>
                                {message.subject}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {!message.is_read && (
                                    <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                                )}
                                <span className="text-xs text-slate-500">
                                    {formatDistanceToNow(new Date(message.created_date), { addSuffix: true })}
                                </span>
                            </div>
                          </div>
                            <p className="text-sm text-slate-400 truncate mb-2">
                                {message.body}
                            </p>
                            <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-xs">
                                    {message.message_type === 'direct_message' ? 'Direct Message' :
                                     message.message_type === 'battle_report' ? 'Battle Report' :
                                     message.message_type === 'war_declaration' ? 'War Declaration' :
                                     message.message_type === 'alliance_event' ? 'Alliance Event' :
                                     message.message_type === 'blockade_update' ? 'Blockade Update' :
                                     'System Alert'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderMessageDetails = () => {
        if (!selectedMessage) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                        <Mail className="w-16 h-16 mx-auto text-slate-500 mb-4" />
                        <p className="text-slate-400">Select a message to read</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="h-full flex flex-col">
                <div className="border-b border-slate-700 p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-2xl font-bold text-white">{selectedMessage.subject}</h2>
                        <div className="flex items-center gap-2">
                            {selectedMessage.sender_nation_id && (
                                <Button
                                    onClick={() => handleReply(selectedMessage)}
                                    className="bg-blue-600 hover:bg-blue-700"
                                    size="sm"
                                >
                                    <Send className="w-4 h-4 mr-1" />
                                    Reply
                                </Button>
                            )}
                            {selectedMessage.related_page && (
                                <Link to={createPageUrl(selectedMessage.related_page)}>
                                    <Button variant="outline" size="sm">
                                        <Eye className="w-4 h-4 mr-1" />
                                        View Details
                                    </Button>
                                </Link>
                            )}
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        disabled={isProcessing}
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4 mr-1" />
                                        )}
                                        Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-800 border-slate-700">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-white">Delete Message</AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-400">
                                            Are you sure you want to delete this message? This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="bg-slate-700 border-slate-600 text-slate-300">
                                            Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => deleteMessage(selectedMessage.id)}
                                            className="bg-red-600 hover:bg-red-700"
                                        >
                                            Delete Message
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                    <p className="text-slate-400">
                        {selectedMessage.sender_nation_id ? `From: Nation #${selectedMessage.sender_nation_id}` : 'System Message'} •
                        Received {formatDistanceToNow(new Date(selectedMessage.created_date), { addSuffix: true })}
                    </p>
                </div>
                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="prose prose-slate max-w-none">
                        <div className="text-slate-300 whitespace-pre-wrap">
                            {selectedMessage.body}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 md:p-8 h-full">
            <div className="max-w-7xl mx-auto h-full">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Communications Center</h1>
                        <p className="text-slate-400">Manage messages and notifications for {myNation.name}</p>
                    </div>
                    <Button
                        onClick={handleComposeNew}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        Compose Message
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-250px)]">
                    <div className="lg:col-span-2">
                        <Card className="bg-slate-800/80 border-slate-700 h-full">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Inbox className="w-5 h-5" />
                                        Inbox
                                    </CardTitle>
                                    {unreadCount > 0 && (
                                        <Badge variant="destructive">{unreadCount}</Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 h-[calc(100%-80px)]">
                                <Tabs defaultValue="notifications" className="h-full">
                                    <TabsList className="grid w-full grid-cols-2 mx-4 mb-4">
                                        <TabsTrigger value="notifications">
                                            Notifications ({notifications.length})
                                        </TabsTrigger>
                                        <TabsTrigger value="messages">
                                            Direct Messages ({directMessages.length})
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="notifications" className="px-4 pb-4 h-[calc(100%-60px)] overflow-y-auto">
                                        {renderMessageList(notifications, 'notification')}
                                    </TabsContent>
                                    <TabsContent value="messages" className="px-4 pb-4 h-[calc(100%-60px)] overflow-y-auto">
                                        {renderMessageList(directMessages, 'direct_message')}
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="lg:col-span-3">
                        <Card className="bg-slate-800/80 border-slate-700 h-full">
                            <CardHeader className="pb-0">
                                <CardTitle className="text-white">Message Details</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0 h-[calc(100%-60px)]">
                                {renderMessageDetails()}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <ComposeMessageModal
                    isOpen={isComposeModalOpen}
                    onClose={handleComposeClose}
                    onMessageSent={loadData}
                    myNation={myNation}
                    initialData={composeInitialData}
                />
            </div>
        </div>
    );
}
