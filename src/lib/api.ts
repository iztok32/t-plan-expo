/**
 * Odjemalec za mobilni API posamezne t-plan namestitve.
 *
 * Vsako podjetje ima svojo namestitev (svoj URL), zato se bazni URL ne kodira,
 * ampak se poda ob vsakem klicu iz izbranega podjetja (tenant).
 */

export const API_PREFIX = '/api/mobile';

export type User = {
  id: number;
  name: string;
  email: string;
  /** Slugi vlog, npr. ['admin'] */
  roles: string[];
  /** Slugi dovoljenj, npr. ['users.view'] – za prikaz/skrivanje funkcij v aplikaciji */
  permissions: string[];
};

export type TenantInfo = {
  /** Ime podjetja, kot ga vrne strežnik. */
  name: string;
  /** Neobvezen logotip podjetja. */
  logo_url?: string | null;
  /** Verzija mobilnega API-ja, da lahko aplikacija zazna nezdružljiv strežnik. */
  api_version?: number;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
  /** Predpona poti; privzeto mobilni API t-plan (/api/mobile). */
  prefix?: string;
};

export async function apiRequest<T>(
  baseUrl: string,
  path: string,
  { method = 'GET', body, token, timeoutMs = 15000, prefix = API_PREFIX }: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${prefix}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    throw new ApiError(
      aborted ? 'Strežnik se ne odziva.' : 'Povezava s strežnikom ni uspela.',
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // ni JSON (npr. HTML stran): ni t-plan API
  }

  if (!response.ok) {
    throw new ApiError(
      data?.message ?? `Napaka strežnika (${response.status}).`,
      response.status,
      data?.errors ?? {},
    );
  }
  if (text && data === null) {
    throw new ApiError('Strežnik ni vrnil veljavnega odgovora.', response.status);
  }
  return data as T;
}

export const api = {
  info: (baseUrl: string) => apiRequest<TenantInfo>(baseUrl, '/info', { timeoutMs: 8000 }),

  login: (baseUrl: string, email: string, password: string, deviceName: string) =>
    apiRequest<{ token: string; user: User }>(baseUrl, '/login', {
      method: 'POST',
      body: { email, password, device_name: deviceName },
    }),

  me: (baseUrl: string, token: string) => apiRequest<User>(baseUrl, '/me', { token }),

  logout: (baseUrl: string, token: string) =>
    apiRequest<void>(baseUrl, '/logout', { method: 'POST', token }),
};
