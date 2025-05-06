"use client";

import { trpc } from "@/server/trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Toaster } from "@workspace/ui/components/sonner";
import { getUrl } from "@/lib/utils";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({ url: `${getUrl()}/api/trpc` })],
    }),
  );

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <NuqsAdapter>
            {children}
            <Toaster />
          </NuqsAdapter>
        </QueryClientProvider>
      </trpc.Provider>
    </NextThemesProvider>
  );
}
