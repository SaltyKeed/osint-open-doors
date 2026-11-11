"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Warning shown 20 seconds before the automatic erase, so a visitor still reading
// does not lose everything at once.
export function InactivityDialog({
  open,
  secondsLeft,
  onStay,
  onEraseNow,
}: {
  open: boolean;
  secondsLeft: number;
  onStay: () => void;
  onEraseNow: () => void;
}) {
  // The screen reader hears the countdown every 5 seconds only.
  const spoken = Math.ceil(secondsLeft / 5) * 5;
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onStay()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-3xl font-bold">Tu es toujours là&nbsp;?</AlertDialogTitle>
          <AlertDialogDescription className="text-lg">
            <span aria-hidden>Tout sera effacé dans {secondsLeft} secondes pour le visiteur suivant.</span>
            <span className="sr-only" aria-live="polite">
              Tout sera effacé dans {spoken} secondes.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay} className="h-12 px-6 text-base">
            Je suis encore là
          </AlertDialogCancel>
          <AlertDialogAction onClick={onEraseNow} className="h-12 px-6 text-base">
            Effacer maintenant
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
