import axios from 'axios';

// API URL configuration
// In production, this will be set via REACT_APP_API_URL environment variable
// Default to production URL, fallback to localhost for development
const API_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://license.zentryasolutions.com/api'
    : 'http://localhost:3001/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface License {
  id: string;
  licenseKey: string;
  tenantName: string;
  plan?: string;
  maxDevices: number;
  maxUsers: number;
  features: Record<string, boolean>;
  startDate?: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'revoked' | 'suspended';
  createdAt: string;
  updatedAt: string;
  activations?: Activation[];
}

export interface Activation {
  id: string;
  licenseId: string;
  deviceId: string;
  activatedAt: string;
  lastCheck: string;
  status: 'active' | 'blocked' | 'revoked';
}

export interface DashboardStats {
  licenses: {
    active_licenses: string;
    expired_licenses: string;
    revoked_licenses: string;
    total_licenses: string;
  };
  activations: {
    total_devices: string;
  };
}

export const authAPI = {
  login: async (credentials: LoginCredentials) => {
    const response = await api.post('/admin/login', credentials);
    return response.data;
  },
  verify2FA: async (tempToken: string, code: string) => {
    const response = await api.post('/admin/verify-2fa', { tempToken, code });
    return response.data;
  },
};

export const licensesAPI = {
  getAll: async (filters?: {
    status?: string;
    tenantName?: string;
    plan?: string;
    licenseKey?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/admin/licenses', { params: filters });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/admin/licenses/${id}`);
    return response.data;
  },
  create: async (data: Partial<License>) => {
    const response = await api.post('/admin/licenses', data);
    return response.data;
  },
  update: async (id: string, data: Partial<License>) => {
    const response = await api.put(`/admin/licenses/${id}`, data);
    return response.data;
  },
  revoke: async (id: string) => {
    const response = await api.post(`/admin/licenses/${id}/revoke`);
    return response.data;
  },
};

export const dashboardAPI = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  },
};

export const auditAPI = {
  getLogs: async (licenseId?: string, page?: number, limit?: number) => {
    const response = await api.get('/admin/audit-logs', {
      params: { licenseId, page, limit },
    });
    return response.data;
  },
};

export default api;

