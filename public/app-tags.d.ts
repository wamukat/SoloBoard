export function tagToneClass(tag: { color?: string | null }): string;
export function tagBackgroundStyle(tag: { color?: string | null }, escapeHtml: (value: string) => string): string;
export function formatTagLabel(
  tag: { name?: string | null },
  options?: { maxLength?: number },
): { name: string; label: string };
export function renderTag(
  tag: { name?: string | null; color?: string | null },
  escapeHtml: (value: string) => string,
  options?: { maxLength?: number },
): string;
export function tagTextColor(hexColor: string): string;
