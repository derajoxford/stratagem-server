import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Image, Loader2 } from "lucide-react";
import { Alliance } from "@/api/entities";
import { UploadFile } from "@/api/integrations";

export default function AllianceLogoUpload({ alliance, nation, onUpdate }) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const canManageAlliance = alliance && nation && (
    alliance.founder_nation_id === nation.id ||
    (alliance.member_roles &&
     alliance.custom_roles &&
     alliance.member_roles[nation.id] &&
     alliance.custom_roles[alliance.member_roles[nation.id]]?.permissions?.manage_alliance)
  );

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !canManageAlliance) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file: selectedFile });
      
      await Alliance.update(alliance.id, { logo_url: file_url });
      
      setSelectedFile(null);
      onUpdate();
      
    } catch (error) {
      console.error("Error uploading alliance logo:", error);
      alert("Failed to upload logo. Please try again.");
    }
    setIsUploading(false);
  };

  const handleRemoveLogo = async () => {
    if (!canManageAlliance) return;
    
    try {
      await Alliance.update(alliance.id, { logo_url: null });
      onUpdate();
    } catch (error) {
      console.error("Error removing alliance logo:", error);
      alert("Failed to remove logo. Please try again.");
    }
  };

  if (!canManageAlliance) {
    return null;
  }

  return (
    <Card className="bg-slate-800/80 border-slate-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Image className="w-5 h-5 text-purple-400" />
          Alliance Logo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alliance.logo_url && (
          <div className="space-y-3">
            <div className="flex items-center justify-center p-4 bg-slate-700/50 rounded-lg">
              <img 
                src={alliance.logo_url} 
                alt={`${alliance.name} logo`}
                className="max-w-32 max-h-32 object-contain rounded"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <Button
              variant="outline"
              onClick={handleRemoveLogo}
              className="w-full border-red-500/50 text-red-400 hover:bg-red-500/20"
            >
              Remove Current Logo
            </Button>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label htmlFor="logo-upload" className="text-slate-300">
              {alliance.logo_url ? 'Upload New Logo' : 'Upload Alliance Logo'}
            </Label>
            <Input
              id="logo-upload"
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="bg-slate-700 border-slate-600 text-white file:bg-slate-600 file:text-white file:border-0 file:rounded"
            />
            <p className="text-xs text-slate-400 mt-1">
              Accepts JPG, PNG, GIF. Max size: 2MB. Recommended: 128x128px
            </p>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <span className="text-slate-300 text-sm">{selectedFile.name}</span>
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}