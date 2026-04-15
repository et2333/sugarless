import apiClient from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      role: string;
    };
    token: string;
  };
}

export const authAPI = {
  login: (data: LoginRequest): Promise<AuthResponse> => 
    apiClient.post('/auth/login', data),
    
  register: (data: RegisterRequest): Promise<AuthResponse> => 
    apiClient.post('/auth/register', data),
    
  me: () => 
    apiClient.get('/auth/me'),
  resendVerification: (email: string) =>
    apiClient.post('/auth/resend-verification', { email }),
};

