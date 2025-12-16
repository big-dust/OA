import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { DoorOpen, Plus, Pencil, Trash2, Users, MapPin } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { meetingRoomService } from '@/services/meetingRoom';
import { useAuthStore } from '@/store/authStore';
import { Role } from '@/types';
import type { MeetingRoom } from '@/types';

export default function MeetingRoomList() {
  const { employee } = useAuthStore();
  const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 检查是否是超级管理员
  const isSuperAdmin = employee?.role === Role.SuperAdmin;

  // 加载会议室列表
  const fetchMeetingRooms = useCallback(async () => {
    try {
      const data = await meetingRoomService.getList();
      setMeetingRooms(data || []);
    } catch {
      toast.error('获取会议室列表失败');
      setMeetingRooms([]);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchMeetingRooms();
      setIsLoading(false);
    };
    loadData();
  }, [fetchMeetingRooms]);

  // 打开删除确认对话框
  const openDeleteDialog = (room: MeetingRoom) => {
    setSelectedRoom(room);
    setDeleteDialogOpen(true);
  };

  // 删除会议室
  const handleDelete = async () => {
    if (!selectedRoom) return;
    
    setIsProcessing(true);
    try {
      await meetingRoomService.delete(selectedRoom.id);
      toast.success('会议室已删除');
      setDeleteDialogOpen(false);
      setSelectedRoom(null);
      await fetchMeetingRooms();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '删除失败';
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
              <DoorOpen className="w-5 h-5 text-primary" />
              <CardTitle>会议室列表</CardTitle>
            </div>
            <div className="flex gap-2">
              <Link to="/meeting-room-bookings">
                <Button variant="outline">
                  我的预定
                </Button>
              </Link>
              {isSuperAdmin && (
                <Link to="/meeting-rooms/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    添加会议室
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <CardDescription>
            {isSuperAdmin ? '管理会议室，查看预定情况' : '查看会议室并进行预定'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {meetingRooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无会议室
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>会议室名称</TableHead>
                    <TableHead>容纳人数</TableHead>
                    <TableHead>位置</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetingRooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {room.capacity} 人
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {room.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link to={`/meeting-rooms/${room.id}/book`}>
                            <Button variant="ghost" size="sm">
                              预定
                            </Button>
                          </Link>
                          {isSuperAdmin && (
                            <>
                              <Link to={`/meeting-rooms/${room.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                  <Pencil className="w-4 h-4 mr-1" />
                                  编辑
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => openDeleteDialog(room)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                删除
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

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这个会议室吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          {selectedRoom && (
            <div className="py-4 space-y-2 text-sm">
              <p><span className="font-medium">会议室名称：</span>{selectedRoom.name}</p>
              <p><span className="font-medium">容纳人数：</span>{selectedRoom.capacity} 人</p>
              <p><span className="font-medium">位置：</span>{selectedRoom.location}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isProcessing}>
              {isProcessing ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
