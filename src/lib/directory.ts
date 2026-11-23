import { ApiError, apiRequest } from './api';

/** Naslov imenika podjetij (t-plan-imenik). Brez njega je na voljo le ročni vnos URL-ja. */
export const DIRECTORY_URL = (process.env.EXPO_PUBLIC_DIRECTORY_URL ?? '').replace(/\/+$/, '');

export const directoryEnabled = DIRECTORY_URL !== '';

export type DirectoryTenant = {
  name: string;
  base_url: string;
  logo_url: string | null;
};

/** Poišče podjetja, pri katerih ima e-poštni naslov račun. */
export async function lookupTenants(email: string): Promise<DirectoryTenant[]> {
  if (!directoryEnabled) {
    throw new ApiError('Imenik podjetij ni nastavljen.', 0);
  }

  try {
    const result = await apiRequest<{ tenants: DirectoryTenant[] }>(DIRECTORY_URL, '/v1/lookup', {
      method: 'POST',
      body: { email: email.trim() },
      prefix: '/api',
    });
    return result.tenants ?? [];
  } catch (e) {
    if (e instanceof ApiError && e.status === 429) {
      throw new ApiError('Preveč poskusov. Poskusite znova čez minuto.', 429);
    }
    throw e;
  }
}
