"use client";

import type React from "react";

import { useId, useState, useEffect } from "react";
import { CheckCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { toast } from "@workspace/ui/components/sonner";
import { useCharacterLimit } from "@/hooks/use-character-limit";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { createKeyAction } from "@/app/developer.stats.skylerx.ir/_actions/create-key";

// KEY: 22044e26ba79aa858185714150bfa5cfb0bc1874360b07953a7cdd2e473499ef

export default function CreateAPIKeyModal() {
  const [open, setOpen] = useState(false);
  const [keyCreated, setKeyCreated] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const id = useId();
  const maxLength = 50;

  const {
    value,
    characterCount,
    handleChange,
    maxLength: limit,
  } = useCharacterLimit({ maxLength });

  useEffect(() => {
    if (!open) {
      handleChange({
        target: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>);
      if (keyCreated) {
        setKeyCreated(false);
        setKey(null);
      }
    }
  }, [open, handleChange, keyCreated]);

  const handleCreateKey = async () => {
    if (!value.trim()) return;

    setIsLoading(true);
    toast.promise(createKeyAction(value), {
      loading: "Creating key...",
      success: (data) => {
        setKeyCreated(true);
        setKey(data);
        return "API key created successfully!";
      },
      error: (err) => {
        return err instanceof Error ? err.message : "Failed to create key";
      },
      finally: () => {
        setIsLoading(false);
      },
    });
  };

  return (
    <div className="flex items-center gap-2">
      {keyCreated && !open ? (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-5 w-5" />
          <span>API key created</span>
        </div>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create key</Button>
          </DialogTrigger>
          <DialogContent className="!max-w-2xl !w-auto !min-w-[32rem] transition-all">
            <DialogHeader>
              <DialogTitle>Generate API Key</DialogTitle>
              <DialogDescription>
                Fill in the information below to create an API key
              </DialogDescription>
            </DialogHeader>

            {keyCreated ? (
              <Alert variant="warning">
                <AlertTitle className="font-semibold">Heads up!</AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="mb-2">
                    You can only view this key once. Make sure you copy it now!
                  </p>
                  <div className="relative">
                    <code className="block w-full overflow-x-auto rounded bg-slate-100 p-3 font-mono text-sm">
                      {key}
                    </code>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor={id}>Name</Label>
                  <Input
                    id={id}
                    type="text"
                    value={value}
                    maxLength={maxLength}
                    onChange={handleChange}
                    aria-describedby={`${id}-description`}
                    placeholder="My API Key"
                  />
                  <p
                    id={`${id}-description`}
                    className="text-muted-foreground text-xs"
                    aria-live="polite"
                  >
                    <span className="tabular-nums">
                      {limit - characterCount}
                    </span>{" "}
                    characters left
                  </p>
                </div>

                <DialogFooter>
                  <Button
                    onClick={handleCreateKey}
                    disabled={isLoading || value.trim().length === 0}
                  >
                    {isLoading ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
