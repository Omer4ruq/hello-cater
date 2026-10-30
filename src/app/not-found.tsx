import { Logo } from '@/components/shared/logo';
import { NotFoundContent } from '@/components/shared/not-found-content';

// Unmatched URLs render here with no layout around them, so this page
// brings its own minimal header. 404s raised inside the marketing site
// use (marketing)/not-found.tsx, which sits under the full site header.
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <header className="container-page py-6">
        <Logo />
      </header>
      <main id="main" className="flex-1">
        <NotFoundContent />
      </main>
    </div>
  );
}
