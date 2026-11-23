import { api, ApiError, type TenantInfo } from './api';

/** Izbrano podjetje: kam aplikacija pošilja zahteve. */
export type Tenant = {
  baseUrl: string;
  name: string;
  logoUrl?: string | null;
};

/**
 * Pretvori vnos uporabnika v bazni URL.
 * "podjetje.t-plan.si" -> "https://podjetje.t-plan.si"
 * "https://podjetje.si/" -> "https://podjetje.si"
 */
export function normalizeBaseUrl(input: string): string | null {
  let value = input.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;

  try {
    const url = new URL(value);
    if (!url.hostname || !url.hostname.includes('.')) return null;
    // Pot (npr. /t-plan) ohranimo, odstranimo pa končno poševnico, poizvedbo in #.
    const path = url.pathname.replace(/\/+$/, '');
    return `${url.protocol}//${url.host}${path}`;
  } catch {
    return null;
  }
}

/**
 * Preveri, da na naslovu teče t-plan z mobilnim API-jem, in vrne podatke o podjetju.
 */
export async function resolveTenant(input: string): Promise<Tenant> {
  const baseUrl = normalizeBaseUrl(input);
  if (!baseUrl) {
    throw new ApiError('Vnesite veljaven naslov, npr. podjetje.t-plan.si', 0);
  }

  let info: TenantInfo;
  try {
    info = await api.info(baseUrl);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      throw new ApiError('Na tem naslovu ni t-plan aplikacije z mobilnim dostopom.', 404);
    }
    throw e;
  }

  if (!info?.name) {
    throw new ApiError('Na tem naslovu ni t-plan aplikacije z mobilnim dostopom.', 0);
  }

  return { baseUrl, name: info.name, logoUrl: info.logo_url ?? null };
}
