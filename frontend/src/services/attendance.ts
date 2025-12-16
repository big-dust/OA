import api from './api';
import type { Attendance } from '@/types';

export const attendanceService = {
  // 签到
  signIn: async (): Promise<Attendance> => {
    const response = await api.post<Attendance>('/attendance/sign-in');
    return response.data;
  },

  // 签退
  signOut: async (): Promise<Attendance> => {
    const response = await api.post<Attendance>('/attendance/sign-out');
    return response.data;
  },

  // 获取考勤记录
  getList: async (month?: string): Promise<Attendance[]> => {
    const params = month ? { month } : {};
    const response = await api.get<Attendance[]>('/attendance', { params });
    return response.data;
  },

  // 获取今日考勤状态
  getToday: async (): Promise<Attendance | null> => {
    const response = await api.get<Attendance | null>('/attendance/today');
    return response.data;
  },
};
