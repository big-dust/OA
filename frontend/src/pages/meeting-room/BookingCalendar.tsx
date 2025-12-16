import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Clock, Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { meetingRoomService, meetingRoomBookingService, type TimeSlot } from '@/services/meetingRoom';
import type { MeetingRoom } from '@/types';

// 格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 格式化时间显示
function formatTime(time: string): string {
  return time.substring(0, 5);
}

// 生成时间段选项（每小时一个时间段，从 8:00 到 20:00）
function generateTimeSlots(): { start: string; end: string }[] {
  const slots: { start: string; end: string }[] = [];
  for (let hour = 8; hour < 20; hour++) {
    const start = `${hour.toString().padStart(2, '0')}:00:00`;
    const end = `${(hour + 1).toString().padStart(2, '0')}:00:00`;
    slots.push({ start, end });
  }
  return slots;
}

export default function BookingCalendar() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [meetingRoom, setMeetingRoom] = useState<MeetingRoom | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
  // 预定对话框状态
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 加载会议室信息
  useEffect(() => {
    if (!id) {
      toast.error('会议室ID无效');
      navigate('/meeting-rooms');
      return;
    }

    const fetchMeetingRoom = async () => {
      try {
        const rooms = await meetingRoomService.getList();
        const found = rooms.find(r => r.id === parseInt(id));
        if (found) {
          setMeetingRoom(found);
        } else {
          toast.error('会议室不存在');
          navigate('/meeting-rooms');
        }
      } catch {
        toast.error('获取会议室信息失败');
        navigate('/meeting-rooms');
      } finally {
        setIsLoading(false);
      }
    };
    fetchMeetingRoom();
  }, [id, navigate]);

  // 加载时间段可用情况
  const fetchAvailability = useCallback(async () => {
    if (!id) return;
    
    setIsLoadingSlots(true);
    try {
      const data = await meetingRoomService.getAvailability(parseInt(id), selectedDate);
      setTimeSlots(data);
    } catch {
      // 如果API返回空，使用默认时间段
      const defaultSlots = generateTimeSlots().map(slot => ({
        start_time: slot.start,
        end_time: slot.end,
        is_available: true,
      }));
      setTimeSlots(defaultSlots);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [id, selectedDate]);

  // 当日期变化时加载可用时间段
  useEffect(() => {
    if (meetingRoom) {
      fetchAvailability();
    }
  }, [meetingRoom, fetchAvailability]);

  // 打开预定对话框
  const openBookingDialog = (slot: TimeSlot) => {
    if (!slot.is_available) {
      toast.error('该时间段已被预定');
      return;
    }
    setSelectedStartTime(slot.start_time);
    setSelectedEndTime(slot.end_time);
    setBookingDialogOpen(true);
  };

  // 提交预定
  const handleBooking = async () => {
    if (!id || !selectedStartTime || !selectedEndTime) return;
    
    setIsSubmitting(true);
    try {
      await meetingRoomBookingService.create({
        meeting_room_id: parseInt(id),
        booking_date: selectedDate,
        start_time: selectedStartTime,
        end_time: selectedEndTime,
      });
      toast.success('预定成功');
      setBookingDialogOpen(false);
      await fetchAvailability();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '预定失败';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取今天的日期字符串
  const today = formatDate(new Date());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!meetingRoom) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate('/meeting-rooms')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回会议室列表
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle>预定会议室 - {meetingRoom.name}</CardTitle>
          </div>
          <CardDescription>
            容纳 {meetingRoom.capacity} 人 · 位置：{meetingRoom.location}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 日期选择 */}
          <div className="flex items-center gap-4">
            <Label htmlFor="date">选择日期</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              min={today}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>

          {/* 时间段列表 */}
          <div>
            <h3 className="text-sm font-medium mb-3">可用时间段</h3>
            {isLoadingSlots ? (
              <div className="text-center py-8 text-muted-foreground">
                加载中...
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无可用时间段
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {timeSlots.map((slot, index) => (
                  <Button
                    key={index}
                    variant={slot.is_available ? 'outline' : 'secondary'}
                    className={`h-auto py-3 flex flex-col items-center gap-1 ${
                      slot.is_available 
                        ? 'hover:bg-primary hover:text-primary-foreground cursor-pointer' 
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => openBookingDialog(slot)}
                    disabled={!slot.is_available}
                  >
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="text-sm">
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </span>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={slot.is_available 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'}
                    >
                      {slot.is_available ? (
                        <><Check className="w-3 h-3 mr-1" />可预定</>
                      ) : (
                        <><X className="w-3 h-3 mr-1" />已预定</>
                      )}
                    </Badge>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* 图例 */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
              <span>可预定</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
              <span>已预定</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 预定确认对话框 */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认预定</DialogTitle>
            <DialogDescription>
              请确认以下预定信息
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2 text-sm">
            <p><span className="font-medium">会议室：</span>{meetingRoom.name}</p>
            <p><span className="font-medium">位置：</span>{meetingRoom.location}</p>
            <p><span className="font-medium">容纳人数：</span>{meetingRoom.capacity} 人</p>
            <p><span className="font-medium">预定日期：</span>{selectedDate}</p>
            <p><span className="font-medium">时间段：</span>{formatTime(selectedStartTime)} - {formatTime(selectedEndTime)}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleBooking} disabled={isSubmitting}>
              {isSubmitting ? '预定中...' : '确认预定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
