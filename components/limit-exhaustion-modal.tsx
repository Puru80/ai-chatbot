'use client';

import {
  AlertDialog,
  AlertDialogAction,
  // AlertDialogCancel, // Not using Cancel for this design
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link'; // For the Upgrade button link

interface LimitExhaustionModalProps {
  isOpen: boolean;
  onClose: () => void;
  // onUpgrade is optional and could navigate or trigger other logic
  onUpgrade?: () => void;
}

export function LimitExhaustionModal({ isOpen, onClose, onUpgrade }: LimitExhaustionModalProps) {
  // We control the open state via the isOpen prop passed to AlertDialog's open prop.
  // The onOpenChange callback of AlertDialog is used to signal closure intent from the dialog (e.g. ESC key, overlay click).

  // No need to return null if !isOpen, AlertDialog handles its visibility based on the `open` prop.
  // If we were manually managing a portal or visibility without relying on AlertDialog's `open`, then returning null would be common.

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Daily Limit Reached</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ve used all your prompts for today. Your prompt quota will reset at 5:30 AM IST.
            Please wait until then or consider upgrading for more prompts.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {/* Using Button for "Got it" for consistent styling if AlertDialogCancel is not preferred */}
          <Button variant="outline" onClick={onClose}>Got it</Button>

          {/*
            The onUpgrade prop is optional. If provided, it's used.
            Otherwise, we can default to a Link component or nothing.
            For this example, let's make the "Upgrade to Pro" button always visible
            and use the onUpgrade handler if provided, else link to /upgrade.
          */}
          {onUpgrade ? (
            <Button onClick={onUpgrade}>Upgrade to Pro</Button>
          ) : (
            <Button asChild>
              <Link href="/upgrade">Upgrade to Pro</Link>
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
