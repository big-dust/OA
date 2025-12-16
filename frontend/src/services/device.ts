import api from './api';
import type { Device, DeviceRequest } from '@/types';

export interface CreateDeviceRequest {
  name: string;
  type: string;
  quantity: number;
  description: string;
}

export interface UpdateDeviceRequest {
  name?: string;
  type?: string;
  quantity?: number;
  description?: string;
}

export const deviceService = {
  // 获取设备列表
  getList: async (): Promise<Device[]> => {
    const response = await api.get<Device[]>('/devices');
    return response.data;
  },

  // 添加设备
  create: async (data: CreateDeviceRequest): Promise<Device> => {
    const response = await api.post<Device>('/devices', data);
    return response.data;
  },

  // 更新设备
  update: async (id: number, data: UpdateDeviceRequest): Promise<Device> => {
    const response = await api.put<Device>(`/devices/${id}`, data);
    return response.data;
  },

  // 删除设备
  delete: async (id: number): Promise<void> => {
    await api.delete(`/devices/${id}`);
  },
};

export const deviceRequestService = {
  // 提交设备申请
  create: async (deviceId: number): Promise<DeviceRequest> => {
    const response = await api.post<DeviceRequest>('/device-requests', {
      device_id: deviceId,
    });
    return response.data;
  },

  // 获取设备申请记录
  getList: async (): Promise<DeviceRequest[]> => {
    const response = await api.get<DeviceRequest[]>('/device-requests');
    return response.data;
  },

  // 获取待审批申请（设备管理员）
  getPending: async (): Promise<DeviceRequest[]> => {
    const response = await api.get<DeviceRequest[]>('/device-requests/pending');
    return response.data;
  },

  // 获取待确认归还申请（设备管理员）
  getReturnPending: async (): Promise<DeviceRequest[]> => {
    const response = await api.get<DeviceRequest[]>('/device-requests/return-pending');
    return response.data;
  },

  // 批准申请
  approve: async (id: number): Promise<DeviceRequest> => {
    const response = await api.put<DeviceRequest>(`/device-requests/${id}/approve`);
    return response.data;
  },

  // 拒绝申请
  reject: async (id: number, reason: string): Promise<DeviceRequest> => {
    const response = await api.put<DeviceRequest>(`/device-requests/${id}/reject`, {
      reject_reason: reason,
    });
    return response.data;
  },

  // 确认领取
  collect: async (id: number): Promise<DeviceRequest> => {
    const response = await api.put<DeviceRequest>(`/device-requests/${id}/collect`);
    return response.data;
  },

  // 发起归还
  returnDevice: async (id: number): Promise<DeviceRequest> => {
    const response = await api.put<DeviceRequest>(`/device-requests/${id}/return`);
    return response.data;
  },

  // 确认归还
  confirmReturn: async (id: number): Promise<DeviceRequest> => {
    const response = await api.put<DeviceRequest>(`/device-requests/${id}/confirm-return`);
    return response.data;
  },

  // 取消申请
  cancel: async (id: number): Promise<DeviceRequest> => {
    const response = await api.put<DeviceRequest>(`/device-requests/${id}/cancel`);
    return response.data;
  },
};
