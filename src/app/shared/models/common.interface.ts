export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: 'success' | 'error' | 'warning';
  timestamp: string;
  requestId: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  path: string;
  method: string;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface AppConfig {
  apiBaseUrl: string;
  appVersion: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    darkMode: boolean;
    analytics: boolean;
    feedback: boolean;
    offlineMode: boolean;
  };
  limits: {
    maxSearchResults: number;
    cacheTimeout: number;
    maxFileSize: number;
  };
}