'use client';

import { TakaInput } from '@/components/ui/input';

export { Money } from '@/components/ui/money';

/**
 * Thin wrapper so dialogs can use the shared taka input without pulling
 * the whole input module's other exports into their client bundle.
 */
export function TakaInputWrapper({
  valueMinor, onValueChange,
}: {
  valueMinor: number | null;
  onValueChange: (minor: number | null) => void;
}) {
  return <TakaInput valueMinor={valueMinor} onValueChange={onValueChange} />;
}
