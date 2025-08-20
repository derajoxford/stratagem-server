import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { City, Nation, Resource } from '@/api/entities';
import { Loader2, Copy, AlertTriangle } from 'lucide-react';

export default function CopyCityBuildModal({ isOpen, onClose, sourceCity, allCities, onCopyToCities }) {
    const [targetCityIds, setTargetCityIds] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [feedback, setFeedback] = useState('');

    const otherCities = allCities.filter(c => c.id !== sourceCity.id);

    const handleCityToggle = (cityId) => {
        setTargetCityIds(prev =>
            prev.includes(cityId) ? prev.filter(id => id !== cityId) : [...prev, cityId]
        );
    };

    const handleSelectAll = () => {
        if (targetCityIds.length === otherCities.length) {
            setTargetCityIds([]);
        } else {
            setTargetCityIds(otherCities.map(c => c.id));
        }
    };

    const handleCopyBuild = async () => {
        if (targetCityIds.length === 0) {
            setFeedback('Please select at least one target city.');
            return;
        }
        setIsProcessing(true);
        setFeedback('Copying build...');

        try {
            await onCopyToCities(sourceCity.id, targetCityIds);
            setFeedback('Build copied successfully!');
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (error) {
            console.error("Error copying build:", error);
            setFeedback(`Error: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Copy className="w-5 h-5 text-amber-400" />
                        Copy Infrastructure from {sourceCity.name}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <p className="text-slate-400 text-sm">
                        Select target cities to replicate the infrastructure from "{sourceCity.name}". This will add buildings to match the source city's levels, respecting individual city limits and available slots. Costs will be deducted from your national treasury.
                    </p>
                    
                    <div className="border border-slate-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <Label>Target Cities</Label>
                            <Button variant="link" size="sm" onClick={handleSelectAll}>
                                {targetCityIds.length === otherCities.length ? 'Deselect All' : 'Select All'}
                            </Button>
                        </div>
                        <ScrollArea className="h-48">
                            <div className="space-y-2">
                                {otherCities.map(city => (
                                    <div key={city.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-slate-700/50">
                                        <Checkbox
                                            id={`city-${city.id}`}
                                            checked={targetCityIds.includes(city.id)}
                                            onCheckedChange={() => handleCityToggle(city.id)}
                                        />
                                        <Label htmlFor={`city-${city.id}`} className="flex-1 cursor-pointer">{city.name}</Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {feedback && (
                        <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${feedback.startsWith('Error') ? 'bg-red-900/50 text-red-300' : 'bg-blue-900/50 text-blue-300'}`}>
                           {feedback.startsWith('Error') ? <AlertTriangle className="w-4 h-4"/> : <Loader2 className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />}
                           <span>{feedback}</span>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
                    <Button onClick={handleCopyBuild} disabled={isProcessing || targetCityIds.length === 0}>
                        {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Copy className="w-4 h-4 mr-2" />}
                        Copy Build to {targetCityIds.length} Cities
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}