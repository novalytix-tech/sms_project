// Centralized HTTP client. Authentication is handled by Clerk: every request
// carries a short-lived Clerk session token fetched just-in-time. Nothing
// auth-related is ever stored in localStorage/sessionStorage.

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

type TokenGetter = () => Promise<string | null>;

const API_BASE_URL: string = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

class HttpClient {
  private getToken: TokenGetter = async () => null;

  /** Registered once by the auth provider (Clerk's getToken). */
  public setTokenGetter(getter: TokenGetter) {
    this.getToken = getter;
  }

  public async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const token = await this.getToken().catch(() => null);
    if (token) headers.set('Authorization', `Bearer ${token}`);

    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('nts_erp_auth_expired'));
      }
      return await response.json().catch(() => ({
        success: response.ok,
        data: null as any,
        message: response.statusText,
      }));
    } catch (err: any) {
      return {
        success: false,
        data: null as any,
        error: { code: 'NETWORK_ERROR', message: err?.message || 'Network request failed' },
      };
    }
  }

  public get<T = any>(endpoint: string, options: RequestInit = {}) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T = any>(endpoint: string, body?: any, options: RequestInit = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    });
  }

  public put<T = any>(endpoint: string, body?: any, options: RequestInit = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    });
  }

  public delete<T = any>(endpoint: string, options: RequestInit = {}) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const httpClient = new HttpClient();
