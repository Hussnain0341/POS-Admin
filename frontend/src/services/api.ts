import axios from 'axios';

// API URL configuration
// In production, this will be set via REACT_APP_API_URL environment variable
// Default to production URL, fallback to localhost for development
const API_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://api.zentryasolutions.com/api'
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
  delete: async (id: string) => {
    const response = await api.delete(`/admin/licenses/${id}`);
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

export interface POSVersion {
  id: string;
  version: string;
  platform: string;
  filename: string;
  filepath: string;
  filesize: number;
  checksum_sha256: string;
  download_url: string;
  mandatory: boolean;
  release_notes?: string;
  status: 'draft' | 'live' | 'archived' | 'rollback';
  uploaded_by?: string;
  uploaded_by_username?: string;
  uploaded_at: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateLog {
  id: string;
  version_id?: string;
  version?: string;
  admin_user_id?: string;
  admin_username?: string;
  action: 'UPLOAD' | 'PUBLISH' | 'ROLLBACK' | 'ARCHIVE' | 'SET_LIVE';
  status: 'SUCCESS' | 'FAILED';
  message?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface LatestVersion {
  version: string;
  download_url: string;
  checksum: string;
  mandatory: boolean;
  release_date: string;
}

export const posUpdatesAPI = {
  // Public API (for POS app) - uses separate axios instance without auth
  getLatest: async (platform: string = 'windows'): Promise<LatestVersion> => {
    const publicApi = axios.create({
      baseURL: process.env.REACT_APP_API_URL?.replace('/api', '') || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://api.zentryasolutions.com'
          : 'http://localhost:3001'),
    });
    const response = await publicApi.get('/api/pos-updates/latest', {
      params: { platform },
    });
    return response.data;
  },

  // Admin APIs
  getAllVersions: async (filters?: {
    platform?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/pos-updates/versions', { params: filters });
    return response.data;
  },

  getVersionById: async (id: string): Promise<POSVersion> => {
    const response = await api.get(`/pos-updates/versions/${id}`);
    return response.data;
  },

  uploadVersion: async (formData: FormData) => {
    const response = await api.post('/pos-updates/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  publishVersion: async (version: string) => {
    const response = await api.post(`/pos-updates/publish/${version}`);
    return response.data;
  },

  rollbackVersion: async (version: string) => {
    const response = await api.post(`/pos-updates/rollback/${version}`);
    return response.data;
  },

  archiveVersion: async (version: string) => {
    const response = await api.post(`/pos-updates/archive/${version}`);
    return response.data;
  },

  getLogs: async (versionId?: string, page?: number, limit?: number) => {
    const response = await api.get('/pos-updates/logs', {
      params: { versionId, page, limit },
    });
    return response.data;
  },

  deleteVersion: async (version: string) => {
    const response = await api.delete(`/pos-updates/versions/${version}`);
    return response.data;
  },
};

// Password Change API
export const passwordAPI = {
  requestPasswordChange: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/admin/change-password/request', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  verifyPasswordChange: async (tempToken: string, code: string) => {
    const response = await api.post('/admin/change-password/verify', {
      tempToken,
      code,
    });
    return response.data;
  },
};

export default api;

