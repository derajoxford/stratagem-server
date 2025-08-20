import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateAllianceDescription } from "@/api/functions";
import { ImageIcon, Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AllianceProfileSettings({ alliance, onUpdate }) {
    const [publicDescription, setPublicDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (alliance) {
            setPublicDescription(alliance.public_description || '');
        }
    }, [alliance]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { data, error } = await updateAllianceDescription({
                allianceId: alliance.id,
                description: publicDescription,
            });

            if (error) {
                throw new Error(error.error || 'Failed to save profile.');
            }

            toast({
                title: "Profile Saved",
                description: "Your alliance's public profile has been updated.",
            });
            onUpdate();
        } catch (error) {
            console.error("Error saving alliance profile:", error);
            toast({
                variant: "destructive",
                title: "Save Failed",
                description: error.message,
            });
        }
        setIsSaving(false);
    };
    
    return (
        <Card className="bg-slate-800/80 border-slate-700 mt-4">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-purple-400" />
                    Edit Public Alliance Profile
                </CardTitle>
                <CardDescription>Customize your alliance's public-facing page. Your changes will be visible to all players.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <label className="text-slate-300 mb-2 block font-medium">Public Description</label>
                    <div className="bg-slate-900 text-slate-200 rounded-md border border-slate-600">
                         <ReactQuill 
                            theme="snow" 
                            value={publicDescription} 
                            onChange={setPublicDescription}
                            className="[&_.ql-toolbar]:border-slate-600 [&_.ql-container]:border-slate-600"
                         />
                    </div>
                </div>
                
                <div className="flex items-center justify-end gap-4">
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Description
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}