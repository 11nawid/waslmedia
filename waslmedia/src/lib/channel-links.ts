function normalizeChannelIdentifier(value?: string | null) {
  return String(value || '').trim();
}

export function buildChannelHref(handleOrId?: string | null) {
  const identifier = normalizeChannelIdentifier(handleOrId);
  if (!identifier) {
    return '/channel';
  }

  if (identifier.startsWith('@')) {
    return `/${identifier}`;
  }

  if (/^[a-zA-Z0-9_]{3,}$/.test(identifier)) {
    return `/@${identifier}`;
  }

  return `/channel/${encodeURIComponent(identifier)}`;
}
