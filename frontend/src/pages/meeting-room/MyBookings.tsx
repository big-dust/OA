import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Calendar, Check, X, DoorOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { meetingRoomBookingService } from '@/services/meetingRoom';
import { BookingStatus } from '@/types';
import type { MeetingRoomBooking, BookingStatusValue } from '@/types';

// 预定状态显示名称
const statusNames: Record<BookingStatusValue, string> = {
  [BookingStatus.Active]: '活跃',
  [BookingStatus.Completed]: '已完成',
  [BookingStatus.Cancelled]: '已取消',
};

// 状态徽章样式
const statusBadgeStyles: Record<BookingStatusValue, string> = {
  [BookingStatus.Active]: 'bg-blue-100 text-blue-700',
  [BookingStatus.Completed]: 'bg-green-100 text-green-700',
  [BookingStatus.Cancelled]: 'bg-gray-100 text-gray-700',
};

// 格式化时间显示
function formatTime(time: string): string {
  return time.substring(0, 5);
}

// 格式化日期显示
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

type DialogType = 'complete' | 'cancel' | null;

export default function MyBookings() {
  const [bookings, setBookings] = useState<MeetingRoomBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [selectedBooking, setSelectedBooking] = useState<MeetingRoomBooking | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 加载预定记录
  const fetchBookings = useCallback(async () => {
    try {
      const data = await meetingRoomBookingService.getList();
      setBookings(data || []);
    } catch {
      toast.error('获取预定记录失败');
      setBookings([]);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchBookings();
      setIsLoading(false);
    };
    loadData();
  }, [fetchBookings]);

  // 打开对话框
  const openDialog = (type: DialogType, booking: MeetingRoomBooking) => {
    setSelectedBooking(booking);
    setDialogType(type);
  };

  // 关闭对话框
  const closeDialog = () => {
    setDialogType(null);
    setSelectedBooking(null);
  };

  // 标记完成
  const handleComplete = async () => {
    if (!selectedBooking) return;
    
    setIsProcessing(true);
    try {
      await meetingRoomBookingService.complete(selectedBooking.id);
      toast.success('预定已标记为完成');
      closeDialog();
      await fetchBookings();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '操作失败';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 取消预定
  const handleCancel = async () => {
    if (!selectedBooking) return;
    
    setIsProcessing(true);
    try {
      await meetingRoomBookingService.cancel(selectedBooking.id);
      toast.success('预定已取消');
      closeDialog();
      await fetchBookings();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '操作失败';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <CardTitle>我的会议室预定</CardTitle>
            </div>
            <Link to="/meeting-rooms">
              <Button variant="outline">
                <DoorOpen className="w-4 h-4 mr-2" />
                预定会议室
              </Button>
            </Link>
          </div>
          <CardDescription>查看和管理您的会议室预定记录</CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无预定记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>会议室</TableHead>
                    <TableHead>位置</TableHead>
                    <TableHead>预定日期</TableHead>
                    <TableHead>时间段</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.meeting_room?.name || '-'}
                      </TableCell>
                      <TableCell>{booking.meeting_room?.location || '-'}</TableCell>
                      <TableCell>{formatDate(booking.booking_date)}</TableCell>
                      <TableCell>
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusBadgeStyles[booking.status]}>
                          {statusNames[booking.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* 活跃状态可以标记完成或取消 */}
                          {booking.status === BookingStatus.Active && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => openDialog('complete', booking)}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                完成
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                onClick={() => openDialog('cancel', booking)}
                              >
                                <X className="w-4 h-4 mr-1" />
                                取消
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 完成确认对话框 */}
      <Dialog open={dialogType === 'complete'} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认完成</DialogTitle>
            <DialogDescription>
              确定要将此预定标记为已完成吗？完成后您可以进行新的预定。
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="py-4 space-y-2 text-sm">
              <p><span className="font-medium">会议室：</span>{selectedBooking.meeting_room?.name}</p>
              <p><span className="font-medium">位置：</span>{selectedBooking.meeting_room?.location}</p>
              <p><span className="font-medium">预定日期：</span>{formatDate(selectedBooking.booking_date)}</p>
              <p><span className="font-medium">时间段：</span>{formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              返回
            </Button>
            <Button onClick={handleComplete} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
              {isProcessing ? '处理中...' : '确认完成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 取消确认对话框 */}
      <Dialog open={dialogType === 'cancel'} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认取消</DialogTitle>
            <DialogDescription>
              确定要取消此预定吗？取消后该时间段将释放给其他人预定。
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="py-4 space-y-2 text-sm">
              <p><span className="font-medium">会议室：</span>{selectedBooking.meeting_room?.name}</p>
              <p><span className="font-medium">位置：</span>{selectedBooking.meeting_room?.location}</p>
              <p><span className="font-medium">预定日期：</span>{formatDate(selectedBooking.booking_date)}</p>
              <p><span className="font-medium">时间段：</span>{formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              返回
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isProcessing}>
              {isProcessing ? '处理中...' : '确认取消'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
