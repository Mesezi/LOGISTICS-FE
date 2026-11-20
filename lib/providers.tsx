'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useClerk } from '@clerk/nextjs';
import { setUnauthorizedHandler } from '@/lib/api';

export function Providers({ children }: { children: React.ReactNode }) {
  const { signOut } = useClerk();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    setUnauthorizedHandler(() => signOut({ redirectUrl: '/sign-in' }));
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
