"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children, session }: { children: React.ReactNode, session?: any }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes by default
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SessionProvider session={session} refetchInterval={0} refetchOnWindowFocus={false} refetchWhenOffline={false}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
