"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { toast } from "@workspace/ui/components/sonner";
import { Settings } from "lucide-react";
import { useState } from "react";
import { ZodError } from "zod";
import { updateWebhookNameAction } from "../../_actions/update-webhook-name";

interface Props {
  webhookName: string;
  webhookUrl: string;
}

export default function SettingsDialog({ webhookName, webhookUrl }: Props) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [name, setName] = useState<string>(webhookName);

  const updateName = () => {
    setIsLoading(true);
    toast.promise(updateWebhookNameAction(name), {
      loading: "Updating name...",
      success: "Name changed!",
      error: (err) => {
        if (err instanceof Error || err instanceof ZodError) return err.message;
        return "Something went wrong while updating name";
      },
      finally: () => {
        setIsLoading(false);
      },
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Settings className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{webhookName} settings</DialogTitle>
        </DialogHeader>
        <div>
          <span className="font-medium">Name</span>
          <Input
            value={name}
            onChange={({ target }) => setName(target.value)}
            type="text"
          />
        </div>
        <div>
          <span className="font-medium">URL</span>
          <Input
            className="read-only:bg-muted read-only:text-muted-foreground"
            defaultValue={webhookUrl}
            readOnly
            type="text"
          />
        </div>
        <DialogFooter>
          <Button onClick={updateName} disabled={isLoading}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
