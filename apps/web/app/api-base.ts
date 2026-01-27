const FALLBACK_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localtest.me:3333';

export function getApiBase(): string {
  if (typeof window === 'undefined') {
    return FALLBACK_API_BASE;
  }

  const { protocol, hostname } = window.location;

  // Em dev multi-tenant usamos localtest.me com subdomínios
  // (vidal.localtest.me, admin.localtest.me, etc.).
  // O backend resolve o tenant pelo subdomínio do Host,
  // então mantemos o hostname atual e apenas ajustamos a porta.
  if (hostname.endsWith('localtest.me')) {
    const apiPort = process.env.NEXT_PUBLIC_API_PORT ?? '3333';
    return `${protocol}//${hostname}:${apiPort}`;
  }

  if (hostname.endsWith('cobranex.xyz')) {
    return 'https://payflow-platform.onrender.com';
  }

  return FALLBACK_API_BASE;
}
