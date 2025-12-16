import api from './api';
import type { LeaveRequest, LeaveTypeValue } from '@/types';

export interface CreateLeaveRequest {
  leave_type: LeaveTypeValue;
  start_date: string;
  end_date: string;
  reason: string;
}

export const leaveService = {
  // 提交请假申请
  create: async (data: CreateLeaveRequest): Promise<LeaveRequest> => {
    const response = await api.post<LeaveRequest>('/leaves', data);
    return response.data;
  },

  // 获取请假记录
  getList: async (): Promise<LeaveRequest[]> => {
    const response = await api.get<LeaveRequest[]>('/leaves');
    return response.data;
  },

  // 获取待审批申请（主管）
  getPending: async (): Promise<LeaveRequest[]> => {
    const response = await api.get<LeaveRequest[]>('/leaves/pending');
    return response.data;
  },

  // 批准请假
  approve: async (id: number): Promise<LeaveRequest> => {
    const response = await api.put<LeaveRequest>(`/leaves/${id}/approve`);
    return response.data;
  },

  // 拒绝请假
  reject: async (id: number, reason: string): Promise<LeaveRequest> => {
    const response = await api.put<LeaveRequest>(`/leaves/${id}/reject`, {
      reject_reason: reason,
    });
    return response.data;
  },

  // 取消请假
  cancel: async (id: number): Promise<LeaveRequest> => {
    const response = await api.put<LeaveRequest>(`/leaves/${id}/cancel`);
    return response.data;
  },
};
