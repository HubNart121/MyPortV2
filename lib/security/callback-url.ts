export function safeRelativeCallbackPath(
  value: string | null | undefined,
  fallback = '/',
): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }

  try {
    const parsed = new URL(value, 'https://callback.invalid');
    if (parsed.origin !== 'https://callback.invalid') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

