import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Nation } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { Loader2, Save, Image as ImageIcon, Edit } from "lucide-react";

export default function NationProfileEditor({ nation, onUpdate }) {
    const [description, setDescription] = useState('');
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [bannerImageUrl, setBannerImageUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        if (nation) {
            setDescription(nation.public_description || '');
            setProfileImageUrl(nation.profile_image_url || '');
            setBannerImageUrl(nation.banner_image_url || '');
        }
    }, [nation]);

    const handleFileUpload = async (file, type) => {
        if (!file) return;
        setFeedback(`Uploading ${type} image...`);
        try {
            const { file_url } = await UploadFile({ file });
            if (type === 'profile') {
                setProfileImageUrl(file_url);
            } else {
                setBannerImageUrl(file_url);
            }
            setFeedback(`${type.charAt(0).toUpperCase() + type.slice(1)} image uploaded successfully!`);
        } catch (error) {
            console.error(`Error uploading ${type} image:`, error);
            setFeedback(`Failed to upload ${type} image.`);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setFeedback('Saving profile...');
        try {
            await Nation.update(nation.id, {
                public_description: description,
                profile_image_url: profileImageUrl,
                banner_image_url: bannerImageUrl,
            });
            setFeedback('Profile saved successfully!');
            onUpdate(); // Refresh parent component data
        } catch (error) {
            console.error("Error saving nation profile:", error);
            setFeedback('Failed to save profile.');
        }
        setIsSaving(false);
        setTimeout(() => setFeedback(''), 3000);
    };

    if (!nation) return null;

    return (
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm mt-8">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Edit className="w-5 h-5 text-amber-400" />
                    Edit Public Nation Profile
                </CardTitle>
                <CardDescription>Customize what other leaders see on your nation's public page.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <Label className="text-slate-300 mb-2 block">Public Description</Label>
                    <div className="bg-white text-slate-900 rounded-md">
                        <ReactQuill theme="snow" value={description} onChange={setDescription} />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="profileImage" className="text-slate-300">Profile Image (e.g., Flag or Leader Portrait)</Label>
                        {profileImageUrl && <img src={profileImageUrl} alt="Profile Preview" className="w-24 h-24 rounded-md object-cover border border-slate-600" />}
                        <Input id="profileImage" type="file" onChange={(e) => handleFileUpload(e.target.files[0], 'profile')} className="bg-slate-700 border-slate-600" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bannerImage" className="text-slate-300">Banner Image (Wide Header)</Label>
                        {bannerImageUrl && <img src={bannerImageUrl} alt="Banner Preview" className="w-full h-24 rounded-md object-cover border border-slate-600" />}
                        <Input id="bannerImage" type="file" onChange={(e) => handleFileUpload(e.target.files[0], 'banner')} className="bg-slate-700 border-slate-600" />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-4">
                    {feedback && <p className="text-sm text-amber-400">{feedback}</p>}
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Profile
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}