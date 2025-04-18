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
import { Label } from "@workspace/ui/components/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";

import { toast } from "@workspace/ui/components/sonner";
import {
  webhookFormSchema,
  type WebhookFormSchema,
} from "@/lib/validators/webhook";
import { registerWebhookAction } from "../../_actions/register-webhook";
import { ZodError } from "zod";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { useRouter } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

export default function CreateWebhookModal() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [secret, setSecret] = useState<string>("");

  const form = useForm<WebhookFormSchema>({
    resolver: zodResolver(webhookFormSchema),
  });

  const onSubmit = (data: WebhookFormSchema) => {
    setIsLoading(true);

    toast.promise(registerWebhookAction(data), {
      loading: "Registering...",
      success: (secret: string) => {
        setSecret(secret);
        return "Webhook registered!";
      },
      error: (err) => {
        if (err instanceof Error || err instanceof ZodError) return err.message;
        return "Something went wrong while registering webhook";
      },
      finally: () => {
        setIsLoading(false);
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (secret) {
          router.refresh();
        } else {
          setOpen(value);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>Register Webhook</Button>
      </DialogTrigger>
      <DialogContent
        className={cn({
          "!max-w-none !w-auto": secret,
        })}
      >
        <DialogHeader>
          <DialogTitle>Create webhook</DialogTitle>
        </DialogHeader>
        {secret ? (
          <Alert variant="warning">
            <AlertTitle className="font-semibold">Heads up!</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-2">
                You can only view this key once. Make sure you copy it now!
              </p>
              <div className="relative">
                <code className="block w-full overflow-x-auto rounded bg-slate-100 p-3 font-mono text-sm">
                  {secret}
                </code>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input className="h-9" placeholder="name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input
                        className="h-9"
                        placeholder="https://example.com/webhooks/my-stats"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  Register
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
