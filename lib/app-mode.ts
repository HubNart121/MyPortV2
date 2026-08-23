export const isOfflineMode = process.env.NEXT_PUBLIC_APP_MODE === 'offline';

export function requireOfflineServerMode(): void {
  if (process.env.APP_MODE !== 'offline') {
    throw new Error('Offline API is disabled');
  }
}
