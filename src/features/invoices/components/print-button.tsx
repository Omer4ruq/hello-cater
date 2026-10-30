'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Print / save as PDF.
 *
 * The page carries print styles, so the browser's own PDF export
 * produces a clean document — no server-side renderer needed, and it
 * works on mobile where a download endpoint often does not.
 */
export function PrintButton() {
  return (
    <Button size="sm" onClick={() => window.print()}>
      <Printer aria-hidden /> Download PDF
    </Button>
  );
}
