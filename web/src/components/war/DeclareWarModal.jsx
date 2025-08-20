import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Swords, AlertTriangle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function DeclareWarModal({
  isOpen,
  onClose,
  attackerNation,
  defenderNation,
  onWarDeclared,
}) {
  const [warReason, setWarReason] = useState('');
  const [warName, setWarName] = useState('');
  const [isDeclaring, setIsDeclaring] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // Check if target is alliance member
  const isAllianceMember = attackerNation?.alliance_id &&
                          defenderNation?.alliance_id &&
                          attackerNation.alliance_id === defenderNation.alliance_id;

  const showError = (message) => {
    setErrorMessage(message);
    setShowErrorDialog(true);
  };

  const handleDeclareWar = async () => {
    if (!warReason.trim() || isDeclaring) return;

    // Additional frontend check for alliance members
    if (isAllianceMember) {
      showError('Cannot declare war on an alliance member! Alliance members are bound by mutual defense agreements.');
      return;
    }

    setIsDeclaring(true);

    try {
      // Dynamic import for declareWar
      const { declareWar } = await import('@/api/functions');
      const response = await declareWar({
        targetNationId: defenderNation.id,
        warReason: warReason.trim(),
        warName: warName.trim() || undefined
      });

      // Handle both successful and error responses
      if (response.status === 200) {
        const responseData = response.data;
        if (responseData.success) {
          onWarDeclared(responseData.war);
          onClose();
          setWarReason('');
          setWarName('');
        } else {
          showError(responseData.error || 'Unknown error occurred.');
        }
      } else {
        // Handle HTTP error responses (400, 401, etc.)
        const errorData = response.data;
        showError(errorData.error || 'Server error occurred.');
      }
    } catch (error) {
      console.error('Error declaring war:', error);
      
      // Check if error response has data
      if (error.response && error.response.data) {
        showError(error.response.data.error || 'An error occurred.');
      } else {
        showError('An unexpected error occurred while declaring war. Please try again.');
      }
    } finally {
      setIsDeclaring(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <Swords className="w-5 h-5" />
              Declare War on {defenderNation?.name}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              This action will initiate military conflict. Consider diplomatic solutions first.
            </DialogDescription>
          </DialogHeader>

          {/* Alliance member warning */}
          {isAllianceMember && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Alliance Member Conflict</span>
              </div>
              <p className="text-red-300 text-sm mt-2">
                You cannot declare war on {defenderNation?.name} because they are a member of your alliance.
                Alliance members are bound by mutual defense agreements.
              </p>
            </div>
          )}

          <div className="space-y-4">
              <div>
                  <p className="text-slate-300">You are about to declare war on <strong className="text-amber-400">{defenderNation?.name}</strong>.</p>
                  <p className="text-xs text-slate-400">This action is irreversible and will have significant consequences.</p>
              </div>

              <div className="space-y-2">
                  <Label htmlFor="warName" className="text-slate-300">War Name (Optional)</Label>
                  <Input
                      id="warName"
                      type="text"
                      value={warName}
                      onChange={(e) => setWarName(e.target.value)}
                      placeholder={`e.g., The Great Expansion`}
                      className="bg-slate-700 border-slate-600"
                  />
                   <p className="text-xs text-slate-500">If left blank, a default name will be generated.</p>
              </div>

              <div className="space-y-2">
                  <Label htmlFor="warReason" className="text-slate-300">Reason for War (Casus Belli)</Label>
                  <Textarea
                      id="warReason"
                      value={warReason}
                      onChange={(e) => setWarReason(e.target.value)}
                      placeholder="Provide a justification for this declaration of war..."
                      rows={3}
                      className="bg-slate-700 border-slate-600"
                      required
                  />
                  <p className="text-xs text-slate-500">This will be visible to all nations and recorded in the war logs.</p>
              </div>
          </div>

          <DialogFooter className="gap-3">
              <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                  Cancel
              </Button>
              <Button
                  type="button"
                  onClick={handleDeclareWar}
                  disabled={!warReason.trim() || isDeclaring || isAllianceMember}
                  className="bg-red-600 hover:bg-red-700"
              >
                  {isDeclaring ? (
                      <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Declaring War...
                      </>
                  ) : (
                      <>
                          <Swords className="mr-2 h-4 w-4" />
                          Declare War
                      </>
                  )}
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              War Declaration Failed
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setShowErrorDialog(false)}
              className="bg-slate-700 hover:bg-slate-600 text-white"
            >
              Understood
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}