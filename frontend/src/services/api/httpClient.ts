// ==========================================
// Centralized HTTP Client with Auto-Refresh & JWT Auth
// Developed for School ERP (NTS Novalytix)
// ==========================================

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

class HttpClient {
  private baseURL: string;
  private accessToken: string | null = null;
  private isRefreshing: boolean = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    const proc = (globalThis as any).process;
    if ((import.meta as any).env?.VITE_API_URL) {
      this.baseURL = (import.meta as any).env.VITE_API_URL;
    } else if (proc && (proc.env?.NODE_ENV === 'test' || proc.env?.VITEST)) {
      this.baseURL = 'http://127.0.0.1:5000/api/v1';
    } else if (typeof window !== 'undefined' && window.location?.origin && !window.location.origin.includes('localhost:3000')) {
      this.baseURL = `${window.location.origin}/api/v1`;
    } else {
      this.baseURL = 'http://127.0.0.1:5000/api/v1';
    }
    // Hydrate token from storage on boot if available
    this.accessToken = localStorage.getItem('nts_erp_access_token');
  }

  public setToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem('nts_erp_access_token', token);
    } else {
      localStorage.removeItem('nts_erp_access_token');
    }
  }

  public getToken(): string | null {
    return this.accessToken || localStorage.getItem('nts_erp_access_token');
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach(cb => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  public async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = new Headers(options.headers || {});

    // Ensure content type
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // Attach JWT Bearer if available
    const token = this.getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // Include HttpOnly cookies for refresh token rotation
    };

    try {
      let response = await fetch(url, config);

      // Handle 401 Unauthorized with token refresh rotation
      if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          try {
            const refreshRes = await fetch(`${this.baseURL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              const newToken = refreshData.data?.access_token;
              if (newToken) {
                this.setToken(newToken);
                this.onTokenRefreshed(newToken);
              }
            } else {
              this.setToken(null);
              window.dispatchEvent(new CustomEvent('nts_erp_auth_expired'));
            }
          } catch (refreshErr) {
            this.setToken(null);
          } finally {
            this.isRefreshing = false;
          }
        }

        // Wait for refresh to complete then retry original request
        const retryPromise = new Promise<ApiResponse<T>>((resolve, reject) => {
          this.addRefreshSubscriber(async (newToken) => {
            headers.set('Authorization', `Bearer ${newToken}`);
            try {
              const retryRes = await fetch(url, { ...config, headers });
              const retryJson = await retryRes.json();
              resolve(retryJson);
            } catch (err) {
              reject(err);
            }
          });
        });

        return await retryPromise;
      }

      const json = await response.json().catch(() => ({
        success: response.ok,
        data: null,
        message: response.statusText,
      }));

      return json;
    } catch (err: any) {
      const proc = (globalThis as any).process;
      if (!proc?.env?.VITEST) {
        console.warn(`HTTP request failed for ${url}:`, err);
      }
      return {
        success: false,
        data: null as any,
        error: {
          code: 'NETWORK_ERROR',
          message: err?.message || 'Network request failed',
        },
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
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public put<T = any>(endpoint: string, body?: any, options: RequestInit = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  public delete<T = any>(endpoint: string, options: RequestInit = {}) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const httpClient = new HttpClient();

