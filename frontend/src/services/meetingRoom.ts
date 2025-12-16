import api from './api';
import type { MeetingRoom, MeetingRoomBooking } from '@/types';

export interface CreateMeetingRoomRequest {
  name: string;
  capacity: number;
  location: string;
}

export interface UpdateMeetingRoomRequest {
  name?: string;
  capacity?: number;
  location?: string;
}

export interface CreateBookingRequest {
  meeting_room_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
  booking?: MeetingRoomBooking;
}

export const meetingRoomService = {
  // 获取会议室列表
  getList: async (): Promise<MeetingRoom[]> => {
    const response = await api.get<MeetingRoom[]>('/meeting-rooms');
    return response.data;
  },

  // 添加会议室
  create: async (data: CreateMeetingRoomRequest): Promise<MeetingRoom> => {
    const response = await api.post<MeetingRoom>('/meeting-rooms', data);
    return response.data;
  },

  // 更新会议室
  update: async (id: number, data: UpdateMeetingRoomRequest): Promise<MeetingRoom> => {
    const response = await api.put<MeetingRoom>(`/meeting-rooms/${id}`, data);
    return response.data;
  },

  // 删除会议室
  delete: async (id: number): Promise<void> => {
    await api.delete(`/meeting-rooms/${id}`);
  },

  // 获取可用时间段
  getAvailability: async (id: number, date: string): Promise<TimeSlot[]> => {
    const response = await api.get<TimeSlot[]>(`/meeting-rooms/${id}/availability`, {
      params: { date },
    });
    return response.data;
  },
};

export const meetingRoomBookingService = {
  // 预定会议室
  create: async (data: CreateBookingRequest): Promise<MeetingRoomBooking> => {
    const response = await api.post<MeetingRoomBooking>('/meeting-room-bookings', data);
    return response.data;
  },

  // 获取预定记录
  getList: async (): Promise<MeetingRoomBooking[]> => {
    const response = await api.get<MeetingRoomBooking[]>('/meeting-room-bookings');
    return response.data;
  },

  // 标记完成
  complete: async (id: number): Promise<MeetingRoomBooking> => {
    const response = await api.put<MeetingRoomBooking>(`/meeting-room-bookings/${id}/complete`);
    return response.data;
  },

  // 取消预定
  cancel: async (id: number): Promise<MeetingRoomBooking> => {
    const response = await api.put<MeetingRoomBooking>(`/meeting-room-bookings/${id}/cancel`);
    return response.data;
  },
};
