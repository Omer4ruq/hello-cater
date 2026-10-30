import { ViewTransition } from 'react';

/**
 * Animates route changes: the old page fades out, the new one rises in
 * (classes in globals.css). Used from `template.tsx` files, which remount
 * on every navigation so enter and exit fire; a layout would not.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-enter" exit="page-exit" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
