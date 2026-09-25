import type { RequestInput } from './detector';

const TIMESTAMP = /^(now|\d+[smhdw]|\d{1,2}:\d{2}\s?(am|pm)?|[A-Z][a-z]{2} \d{1,2}(, \d{4})?|yesterday)$/i;

// A DM list row renders as lines like: display name, @handle, ·, time, preview.
export function parseRowText(raw: string): RequestInput | null {
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const handleIndex = lines.findIndex((line) => /^@[A-Za-z0-9_]{1,15}$/.test(line));
  if (handleIndex === -1) return null;

  const text = lines
    .slice(handleIndex + 1)
    .filter((line) => line !== '·' && !TIMESTAMP.test(line))
    .join('\n');

  return {
    displayName: lines[handleIndex - 1] ?? '',
    handle: lines[handleIndex]!.slice(1),
    text,
  };
}
