import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getStoredToken, clearStoredTokens } from '@/rbac';
import { ORG_LOGIN_PATH } from '@/app/config/orgRoutes';
import { mapApiErrorToToast, shouldToastApiError } from '@/services/base/apiError';
import { toastError } from '@/store/toast/toastStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4001/api/v1';
const PATIENT_PORTAL_PREFIX = '/patient';

function isPatientPortalRoute(): boolean {
  return window.location.pathname.startsWith(PATIENT_PORTAL_PREFIX);
}

export interface ApiEnvelope<T> {
  data: T;
}

export interface ApiErrorBody {
  error?: string;
  message?: string;
  statusCode?: number;
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (!isPatientPortalRoute()) {
      const token = getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isPatientPortalRoute()) {
      clearStoredTokens();
      if (window.location.pathname !== ORG_LOGIN_PATH) {
        window.location.href = ORG_LOGIN_PATH;
      }
    }

    const body = error.response?.data as ApiErrorBody | undefined;
    const message = body?.message ?? body?.error ?? error.message ?? 'Request failed';
    if (shouldToastApiError(error, error.config?.url)) {
      toastError(mapApiErrorToToast(error));
    }
    return Promise.reject(new Error(message));
  },
);

function unwrap<T>(response: AxiosResponse<ApiEnvelope<T> | T>): T {
  const payload = response.data;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}

export abstract class BaseApiService {
  protected client: AxiosInstance;

  constructor(client: AxiosInstance = apiClient) {
    this.client = client;
  }

  protected async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiEnvelope<T> | T>(url, config);
    return unwrap(response);
  }

  protected async post<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.post<ApiEnvelope<T> | T>(url, data, config);
    return unwrap(response);
  }

  protected async put<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.put<ApiEnvelope<T> | T>(url, data, config);
    return unwrap(response);
  }

  protected async patch<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.patch<ApiEnvelope<T> | T>(url, data, config);
    return unwrap(response);
  }

  protected async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiEnvelope<T> | T>(url, config);
    return unwrap(response);
  }
}
