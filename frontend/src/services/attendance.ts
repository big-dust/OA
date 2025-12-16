import api from './api';
import type { Attendance } from '@/types';

// 签到/签退响应类型
interface AttendanceResponse {
  attendance: Attendance;
  message: string;
}

export const attendanceService = {
  // 签到
  signIn: async (): Promise<Attendance> => {
    const response = await api.post<AttendanceResponse>('/attendance/sign-in');
    return response.data.attendance;
  },

  // 签退
  signOut: async (): Promise<Attendance> => {
    const response = await api.post<AttendanceResponse>('/attendance/sign-out');
    return response.data.attendance;
  },

  // 获取考勤记录
  getList: async (monthStr?: string): Promise<Attendance[]> => {
    const params: { year?: number; month?: number } = {};
    if (monthStr) {
      const [year, month] = monthStr.split('-').map(Number);
      params.year = year;
      params.month = month;
    }
    const response = await api.get<Attendance[]>('/attendance', { params });
    return response.data;
  },

  // 获取今日考勤状态
  getToday: async (): Promise<Attendance | null> => {
    interface TodayStatusResponse {
      date: string;
      signed_in: boolean;
      signed_out: boolean;
      sign_in_time: string | null;
      sign_out_time: string | null;
    }
    const response = await api.get<TodayStatusResponse>('/attendance/today');
    const data = response.data;
    // 转换为 Attendance 格式
    return {
      id: 0,
      employee_id: 0,
      date: data.date,
      sign_in_time: data.sign_in_time,
      sign_out_time: data.sign_out_time,
    };
  },
};
