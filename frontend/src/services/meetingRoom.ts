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

// 后端返回的可用性响应格式
interface RoomAvailabilityResponse {
  room: MeetingRoom;
  bookings: MeetingRoomBooking[];
}

// 生成时间段（每小时一个，从 8:00 到 20:00）- 用于旧版兼容
function generateTimeSlots(bookings: MeetingRoomBooking[]): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let hour = 8; hour < 20; hour++) {
    const startTime = `${hour.toString().padStart(2, '0')}:00:00`;
    const endTime = `${(hour + 1).toString().padStart(2, '0')}:00:00`;
    
    // 检查该时间段是否有预定
    const conflictBooking = bookings.find(b => {
      // 只检查活跃状态的预定
      if (b.status !== 'active') return false;
      // 检查时间是否重叠
      return b.start_time < endTime && b.end_time > startTime;
    });
    
    slots.push({
      start_time: startTime,
      end_time: endTime,
      is_available: !conflictBooking,
      booking: conflictBooking,
    });
  }
  return slots;
}

// 获取指定日期的所有预定
async function getBookingsForDate(id: number, date: string): Promise<MeetingRoomBooking[]> {
  const response = await api.get<RoomAvailabilityResponse>(`/meeting-rooms/${id}/availability`, {
    params: { date },
  });
  return response.data?.bookings || [];
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

  // 获取可用时间段（旧版兼容）
  getAvailability: async (id: number, date: string): Promise<TimeSlot[]> => {
    const bookings = await getBookingsForDate(id, date);
    return generateTimeSlots(bookings);
  },
  
  // 获取指定日期的所有预定（新版，直接返回预定列表）
  getBookings: async (id: number, date: string): Promise<MeetingRoomBooking[]> => {
    return getBookingsForDate(id, date);
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
