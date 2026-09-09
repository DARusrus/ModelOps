'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: 'global' } });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main>
          <h1>Something went wrong</h1>
          <p>Please refresh the page. If the problem continues, contact your workspace administrator.</p>
        </main>
      </body>
    </html>
  );
}
