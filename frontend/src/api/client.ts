import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Set language header for bilingual backend support
    // Prefer i18next stored language, fallback to 'en'
    const lang = (localStorage.getItem('i18nextLng') || 'en').split('-')[0];
    (config.headers as any)['Accept-Language'] = lang;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    
    const errorMessage = error.response?.data?.error?.message || error.message;
    return Promise.reject(new Error(errorMessage));
  }
);

export default apiClient;

