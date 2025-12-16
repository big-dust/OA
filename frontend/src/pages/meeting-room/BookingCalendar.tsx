import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Plus } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  meetingRoomService,
  meetingRoomBookingService,
} from '@/services/meetingRoom';
import type { MeetingRoom, MeetingRoomBooking } from '@/types';

// 格式化日期为 YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// 格式化时间显示
function formatTime(time: string): string {
  return time.substring(0, 5);
}

// 获取当前时间字符串 HH:MM:SS
function getCurrentTime(): string {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`;
}

// 生成24小时时间选项（每30分钟一个）
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    options.push(`${hour.toString().padStart(2, '0')}:00:00`);
    options.push(`${hour.toString().padStart(2, '0')}:30:00`);
  }
  options.push('24:00:00'); // 添加24:00作为结束时间选项
  return options;
}

// 检查时间是否与已有预定冲突
function checkTimeConflict(
  startTime: string,
  endTime: string,
  bookings: MeetingRoomBooking[]
): MeetingRoomBooking | undefined {
  return bookings.find((b) => {
    if (b.status !== 'active') return false;
    return b.start_time < endTime && b.end_time > startTime;
  });
}

// 检查某个时间点是否被预定覆盖
function isTimeBooked(time: string, bookings: MeetingRoomBooking[]): boolean {
  return bookings.some((b) => {
    if (b.status !== 'active') return false;
    return b.start_time <= time && b.end_time > time;
  });
}

// 检查时间是否已过（仅当天需要检查）
function isTimePassed(time: string, selectedDate: string): boolean {
  const today = formatDate(new Date());
  if (selectedDate !== today) return false;
  return time <= getCurrentTime();
}

// 时间转换为小时数（用于计算位置）
function timeToHours(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours + minutes / 60;
}

// 时间轴组件
function TimelineBar({
  bookings,
  selectedDate,
}: {
  bookings: MeetingRoomBooking[];
  selectedDate: string;
}) {
  const today = formatDate(new Date());
  const isToday = selectedDate === today;
  const currentHours = isToday ? timeToHours(getCurrentTime()) : 0;

  return (
    <div className="space-y-2">
      {/* 时间刻度 */}
      <div className="relative h-6 flex">
        {Array.from({ length: 25 }, (_, i) => (
          <div
            key={i}
            className="flex-1 text-xs text-muted-foreground text-center"
            style={{ minWidth: '0' }}
          >
            {i % 3 === 0 ? `${i.toString().padStart(2, '0')}:00` : ''}
          </div>
        ))}
      </div>

      {/* 时间轴条 */}
      <div className="relative h-12 bg-green-50 rounded-lg overflow-hidden border border-green-200">
        {/* 已过时间（灰色） */}
        {isToday && currentHours > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-gray-300"
            style={{
              left: '0%',
              width: `${(currentHours / 24) * 100}%`,
            }}
          />
        )}

        {/* 已预定时间段（橙色表示繁忙） */}
        {bookings
          .filter((b) => b.status === 'active')
          .map((booking, index) => {
            const startHours = timeToHours(booking.start_time);
            const endHours = timeToHours(booking.end_time);
            const left = (startHours / 24) * 100;
            const width = ((endHours - startHours) / 24) * 100;

            return (
              <div
                key={index}
                className="absolute top-1 bottom-1 bg-orange-400 rounded flex items-center justify-center text-white text-xs font-medium overflow-hidden"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
                title={`繁忙: ${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}`}
              >
                {width > 8 && (
                  <span className="truncate px-1">
                    {formatTime(booking.start_time)}-{formatTime(booking.end_time)}
                  </span>
                )}
              </div>
            );
          })}

        {/* 当前时间指示线 */}
        {isToday && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
            style={{ left: `${(currentHours / 24) * 100}%` }}
          />
        )}
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-2">
        {isToday && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-300" />
            <span>已过</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-400" />
          <span>繁忙</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
          <span>空闲</span>
        </div>
        {isToday && (
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-500" />
            <span>当前</span>
          </div>
        )}
      </div>
    </div>
  );
}


export default function BookingCalendar() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [meetingRoom, setMeetingRoom] = useState<MeetingRoom | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(new Date()));
  const [existingBookings, setExistingBookings] = useState<MeetingRoomBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  // 预定对话框状态
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedStartTime, setSelectedStartTime] = useState<string>('09:00:00');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('10:00:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 时间选项
  const timeOptions = generateTimeOptions();

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
        const found = rooms.find((r) => r.id === parseInt(id));
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

  // 加载预定情况
  const fetchBookings = useCallback(async () => {
    if (!id) return;

    setIsLoadingBookings(true);
    try {
      // 直接获取预定列表
      const bookings = await meetingRoomService.getBookings(
        parseInt(id),
        selectedDate
      );
      setExistingBookings(bookings || []);
    } catch {
      setExistingBookings([]);
    } finally {
      setIsLoadingBookings(false);
    }
  }, [id, selectedDate]);

  // 当日期变化时加载预定情况
  useEffect(() => {
    if (meetingRoom) {
      fetchBookings();
    }
  }, [meetingRoom, fetchBookings]);

  // 打开预定对话框
  const openBookingDialog = () => {
    // 找到第一个可用的开始时间
    const availableStartTime =
      timeOptions.find(
        (time) =>
          time !== '24:00:00' &&
          !isTimePassed(time, selectedDate) &&
          !isTimeBooked(time, existingBookings)
      ) || '09:00:00';

    // 找到对应的结束时间（开始时间后1小时）
    const startIndex = timeOptions.indexOf(availableStartTime);
    const availableEndTime =
      timeOptions[startIndex + 2] || timeOptions[startIndex + 1] || '10:00:00';

    setSelectedStartTime(availableStartTime);
    setSelectedEndTime(availableEndTime);
    setBookingDialogOpen(true);
  };

  // 提交预定
  const handleBooking = async () => {
    if (!id || !selectedStartTime || !selectedEndTime) return;

    // 验证时间
    if (selectedStartTime >= selectedEndTime) {
      toast.error('结束时间必须晚于开始时间');
      return;
    }

    // 检查是否是过去的时间
    if (isTimePassed(selectedStartTime, selectedDate)) {
      toast.error('不能预定已过的时间');
      return;
    }

    // 检查冲突
    const conflict = checkTimeConflict(
      selectedStartTime,
      selectedEndTime,
      existingBookings
    );
    if (conflict) {
      toast.error(
        `该时间段与已有预定冲突 (${formatTime(conflict.start_time)} - ${formatTime(conflict.end_time)})`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // 处理24:00:00的情况，转换为23:59:59
      const endTime =
        selectedEndTime === '24:00:00' ? '23:59:59' : selectedEndTime;

      await meetingRoomBookingService.create({
        meeting_room_id: parseInt(id),
        booking_date: selectedDate,
        start_time: selectedStartTime,
        end_time: endTime,
      });
      toast.success('预定成功');
      setBookingDialogOpen(false);
      await fetchBookings();
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

          {/* 时间轴展示 */}
          <div>
            <h3 className="text-sm font-medium mb-3">当日预定情况</h3>
            {isLoadingBookings ? (
              <div className="text-center py-8 text-muted-foreground">
                加载中...
              </div>
            ) : (
              <TimelineBar
                bookings={existingBookings}
                selectedDate={selectedDate}
              />
            )}
          </div>

          {/* 预定按钮 */}
          <div>
            <Button onClick={openBookingDialog} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              预定会议室
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 预定对话框 */}
      <Dialog open={bookingDialogOpen} onOpenChange={setBookingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>预定会议室</DialogTitle>
            <DialogDescription>选择预定时间段</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">会议室：</span>
                {meetingRoom.name}
              </p>
              <p>
                <span className="font-medium">位置：</span>
                {meetingRoom.location}
              </p>
              <p>
                <span className="font-medium">容纳人数：</span>
                {meetingRoom.capacity} 人
              </p>
              <p>
                <span className="font-medium">预定日期：</span>
                {selectedDate}
              </p>
            </div>

            {/* 时间选择 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>开始时间</Label>
                <Select
                  value={selectedStartTime}
                  onValueChange={setSelectedStartTime}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择开始时间" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.slice(0, -1)
                      .filter((time) => {
                        // 过滤掉已过和已预定的时间
                        const isPassed = isTimePassed(time, selectedDate);
                        const isBooked = isTimeBooked(time, existingBookings);
                        return !isPassed && !isBooked;
                      })
                      .map((time) => (
                        <SelectItem key={time} value={time}>
                          {formatTime(time)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>结束时间</Label>
                <Select
                  value={selectedEndTime}
                  onValueChange={setSelectedEndTime}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择结束时间" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.slice(1)
                      .filter((time) => {
                        // 结束时间必须大于开始时间
                        if (time <= selectedStartTime) return false;
                        // 检查从开始时间到结束时间之间是否有冲突
                        const hasConflict = checkTimeConflict(
                          selectedStartTime,
                          time,
                          existingBookings
                        );
                        return !hasConflict;
                      })
                      .map((time) => (
                        <SelectItem key={time} value={time}>
                          {time === '24:00:00' ? '24:00' : formatTime(time)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 时间验证提示 */}
            {selectedStartTime >= selectedEndTime && (
              <p className="text-sm text-red-500">结束时间必须晚于开始时间</p>
            )}
            {selectedStartTime < selectedEndTime &&
              checkTimeConflict(
                selectedStartTime,
                selectedEndTime,
                existingBookings
              ) && (
                <p className="text-sm text-red-500">该时间段与已有预定冲突</p>
              )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBookingDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleBooking}
              disabled={isSubmitting || selectedStartTime >= selectedEndTime}
            >
              {isSubmitting ? '预定中...' : '确认预定'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
