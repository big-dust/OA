import api from './api';
import type { LoginRequest, LoginResponse, ChangePasswordRequest, Employee } from '@/types';

export const authService = {
  // 登录
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  // 修改密码
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await api.post('/auth/change-password', data);
  },

  // 获取当前用户信息
  getCurrentUser: async (): Promise<Employee> => {
    const response = await api.get<Employee>('/employees/me');
    return response.data;
  },
};
