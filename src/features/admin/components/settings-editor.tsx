'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { updateSystemSetting } from '../actions';

type Setting = {
  key: string;
  label: string;
  description: string | null;
  valueType: string;
  value: unknown;
  isPublic: boolean;
};

/**
 * Inline editor for a group of system settings.
 *
 * Each row saves independently so a mistake in one field cannot block
 * the rest, and every save is audited with the before/after value.
 */
export function SettingsEditor({ settings }: { settings: Setting[] }) {
  return (
    <ul className="divide-y divide-ink-100">
      {settings.map((setting) => (
        <li key={setting.key}>
          <SettingRow setting={setting} />
        </li>
      ))}
    </ul>
  );
}

function SettingRow({ setting }: { setting: Setting }) {
  const router = useRouter();
  const initial = React.useMemo(() => formatValue(setting), [setting]);
  const [value, setValue] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const dirty = value !== initial;

  async function save() {
    setPending(true);
    const parsed = parseValue(value, setting.valueType);
    if (parsed === undefined) {
      setPending(false);
      toast.error(`"${value}" is not a valid ${setting.valueType}.`);
      return;
    }
    const result = await updateSystemSetting({ key: setting.key, value: parsed });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-4 py-3.5">
      <div className="min-w-56 flex-1">
        <p className="text-sm font-medium text-ink-950">
          {setting.label}
          {setting.isPublic ? <Badge tone="neutral" className="ml-2">Public</Badge> : null}
        </p>
        <p className="mt-0.5 font-mono text-xs text-ink-500">{setting.key}</p>
        {setting.description ? (
          <p className="mt-1 text-xs text-ink-600">{setting.description}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {setting.valueType === 'boolean' ? (
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              className="size-4 accent-brand-700"
              checked={value === 'true'}
              onChange={(e) => setValue(e.target.checked ? 'true' : 'false')}
            />
            {value === 'true' ? 'Enabled' : 'Disabled'}
          </label>
        ) : (
          <Input
            className="w-56"
            type={setting.valueType === 'number' ? 'number' : 'text'}
            value={value}
            aria-label={setting.label}
            onChange={(e) => setValue(e.target.value)}
          />
        )}

        <Button size="sm" variant={dirty ? 'primary' : 'ghost'} loading={pending} disabled={!dirty} onClick={save}>
          {saved ? <><Check aria-hidden /> Saved</> : 'Save'}
        </Button>
      </div>
    </div>
  );
}

function formatValue(setting: Setting): string {
  if (setting.value == null) return '';
  if (typeof setting.value === 'string') return setting.value;
  if (typeof setting.value === 'boolean') return setting.value ? 'true' : 'false';
  if (typeof setting.value === 'number') return String(setting.value);
  return JSON.stringify(setting.value);
}

/** Returns undefined when the input cannot be parsed to the declared type. */
function parseValue(raw: string, type: string): unknown {
  switch (type) {
    case 'number': {
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    }
    case 'boolean':
      return raw === 'true';
    case 'json':
      try {
        return JSON.parse(raw);
      } catch {
        return undefined;
      }
    default:
      return raw;
  }
}
