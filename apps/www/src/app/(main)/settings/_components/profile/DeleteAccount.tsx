import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import { Trash2 } from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import { toast } from "@workspace/ui/components/sonner";
import { deleteAccountAction } from "../../_actions/delete-account";

const CONFIRM_TEXT = "delete my account";

export default function DeleteAccount() {
  const [confirmText, setConfirmText] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleConfirmDelete = () => {
    setIsDeleting(true);
    toast.promise(deleteAccountAction, {
      loading: "Deleting...",
      success: "Account successfully deleted",
      error: (err) => {
        if (err instanceof Error) {
          return err.message;
        }
        return "Something went wrong while deleting your account";
      },
      finally: () => {
        setIsDeleting(false);
      },
    });
  };

  return (
    <div className="p-4 border border-red-500 rounded-md">
      <h3 className="text-2xl font-semibold mb-4">Delete Account</h3>
      <p className="mb-2 text-muted-foreground">
        Deleting your account will remove all existing data from our servers.
        This action is <strong>not</strong> reversible. Everything within the
        app such as (but not limited to): profile information, authentications,
        preferences, stats, history, imports, exports, developer tools (API
        keys, Access Tokens) will be wiped forever.
      </p>
      <p className="font-medium mb-4 text-muted-foreground">
        This action will <strong>not harm</strong> your <strong>Spotify</strong>{" "}
        account.
      </p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">
            <Trash2 className="size-4" /> Delete Account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-4">
                By following through with this action all data will be
                completely wiped from our servers. Your listening stats,
                imports, connections, and profile information will not be
                recoverable.
              </p>
              <p className="font-medium mb-2">
                this action does not affect your Spotify account
              </p>
              <p>
                To confirm type{" "}
                <span className="font-semibold">{CONFIRM_TEXT}</span>:
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={confirmText}
            className="!ring-destructive !border-destructive"
            onChange={({ target }) => setConfirmText(target.value)}
            placeholder={confirmText}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={confirmText !== CONFIRM_TEXT || isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
