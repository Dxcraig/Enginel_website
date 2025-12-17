/**
 * API Client for Enginel Django Backend
 * 
 * Handles all HTTP requests to the Django REST API with automatic
 * token refresh and error handling.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface ApiError {
  message: string;
  status: number;
  details?: any;
  url?: string;
}

export class ApiClient {
  private static getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(process.env.NEXT_PUBLIC_AUTH_TOKEN_KEY || 'enginel_auth_token');
  }

  private static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(process.env.NEXT_PUBLIC_REFRESH_TOKEN_KEY || 'enginel_refresh_token');
  }

  private static async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem(process.env.NEXT_PUBLIC_AUTH_TOKEN_KEY || 'enginel_auth_token', data.access_token);
        return data.access_token;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return null;
  }

  static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }

    console.log('API Request:', {
      url,
      method: options.method || 'GET',
      hasToken: !!token,
      headers: { ...headers, Authorization: token ? 'Token ***' : 'None' },
    });

    try {
      let response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('API Response:', {
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      // Handle 401 - try to refresh token
      if (response.status === 401 && token) {
        console.log('Attempting token refresh...');
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          headers['Authorization'] = `Token ${newToken}`;
          response = await fetch(url, {
            ...options,
            headers,
          });
          console.log('Retry after refresh:', {
            status: response.status,
            ok: response.ok,
          });
        }
      }

      if (!response.ok) {
        let errorData: any = {};
        const contentType = response.headers.get('content-type');

        try {
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
          } else {
            const textData = await response.text();
            errorData = { text: textData };
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorData = { parseError: 'Failed to parse response body' };
        }

        const apiError = {
          message: errorData.detail || errorData.message || errorData.text || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          details: errorData,
          url: url,
        } as ApiError;

        console.error('API Error Details:', {
          message: apiError.message,
          status: apiError.status,
          url: apiError.url,
          details: apiError.details,
          responseStatus: response.status,
          responseStatusText: response.statusText,
          contentType: contentType,
        });
        throw apiError;
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      if (error && typeof error === 'object' && 'status' in error) {
        throw error;
      }
      console.error('Network Error Details:', {
        url,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        error
      });
      throw {
        message: error instanceof Error ? error.message : 'Network error',
        status: 0,
        details: error,
        url: url,
      } as ApiError;
    }
  }

  static async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  static async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // File upload with multipart/form-data and progress tracking
  static async upload<T>(
    endpoint: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getAuthToken();

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            onProgress(percentComplete);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            resolve(xhr.responseText as any);
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject({
              message: errorData.detail || 'Upload failed',
              status: xhr.status,
              details: errorData,
            } as ApiError);
          } catch {
            reject({
              message: 'Upload failed',
              status: xhr.status,
            } as ApiError);
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject({
          message: 'Network error',
          status: 0,
        } as ApiError);
      });

      xhr.open('POST', url);
      if (token) {
        xhr.setRequestHeader('Authorization', `Token ${token}`);
      }

      xhr.send(formData);
    });
  }

  // File upload with multipart/form-data (simple version without progress)
  static async uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getAuthToken();

    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.detail || 'Upload failed',
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    return response.json();
  }
}

export default ApiClient;
