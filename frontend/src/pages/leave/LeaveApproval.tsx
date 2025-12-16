import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Calendar, Check, X, Ban } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { leaveService } from '@/services/leave';
import { LeaveType } from '@/types';
import type { LeaveRequest, LeaveTypeValue } from '@/types';

// 请假类型显示名称
const leaveTypeNames: Record<LeaveTypeValue, string> = {
  [LeaveType.Annual]: '年假',
  [LeaveType.Sick]: '病假',
  [LeaveType.Personal]: '事假',
  [LeaveType.Marriage]: '婚假',
  [LeaveType.Maternity]: '产假',
  [LeaveType.Bereavement]: '丧假',
};

// 格式化日期显示
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

type DialogType = 'approve' | 'reject' | 'cancel' | null;


export default function LeaveApproval() {
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 加载待审批请假申请
  const fetchPendingLeaves = useCallback(async () => {
    try {
      const data = await leaveService.getPending();
      setPendingLeaves(data);
    } catch {
      toast.error('获取待审批申请失败');
    }
  }, []);

  // 初始加载
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchPendingLeaves();
      setIsLoading(false);
    };
    loadData();
  }, [fetchPendingLeaves]);

  // 打开对话框
  const openDialog = (type: DialogType, leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setDialogType(type);
    setRejectReason('');
  };

  // 关闭对话框
  const closeDialog = () => {
    setDialogType(null);
    setSelectedLeave(null);
    setRejectReason('');
  };

  // 批准请假
  const handleApprove = async () => {
    if (!selectedLeave) return;
    
    setIsProcessing(true);
    try {
      await leaveService.approve(selectedLeave.id);
      toast.success('请假申请已批准');
      closeDialog();
      await fetchPendingLeaves();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '操作失败';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 拒绝请假
  const handleReject = async () => {
    if (!selectedLeave) return;
    
    if (!rejectReason.trim()) {
      toast.error('请填写拒绝原因');
      return;
    }

    setIsProcessing(true);
    try {
      await leaveService.reject(selectedLeave.id, rejectReason.trim());
      toast.success('请假申请已拒绝');
      closeDialog();
      await fetchPendingLeaves();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '操作失败';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 取消请假
  const handleCancel = async () => {
    if (!selectedLeave) return;
    
    setIsProcessing(true);
    try {
      await leaveService.cancel(selectedLeave.id);
      toast.success('请假申请已取消');
      closeDialog();
      await fetchPendingLeaves();
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
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle>请假审批</CardTitle>
          </div>
          <CardDescription>审批下属员工的请假申请</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingLeaves.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无待审批的请假申请
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>申请人</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>请假类型</TableHead>
                    <TableHead>开始日期</TableHead>
                    <TableHead>结束日期</TableHead>
                    <TableHead>请假原因</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingLeaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>{leave.employee?.name || '-'}</TableCell>
                      <TableCell>{leave.employee?.department || '-'}</TableCell>
                      <TableCell>{leaveTypeNames[leave.leave_type]}</TableCell>
                      <TableCell>{formatDate(leave.start_date)}</TableCell>
                      <TableCell>{formatDate(leave.end_date)}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={leave.reason}>
                        {leave.reason}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                          待审批
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => openDialog('approve', leave)}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            批准
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openDialog('reject', leave)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            拒绝
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                            onClick={() => openDialog('cancel', leave)}
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            取消
                          </Button>
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

      {/* 批准确认对话框 */}
      <Dialog open={dialogType === 'approve'} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认批准</DialogTitle>
            <DialogDescription>
              确定要批准这个请假申请吗？
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="py-4 space-y-2 text-sm">
              <p><span className="font-medium">申请人：</span>{selectedLeave.employee?.name}</p>
              <p><span className="font-medium">请假类型：</span>{leaveTypeNames[selectedLeave.leave_type]}</p>
              <p><span className="font-medium">开始日期：</span>{formatDate(selectedLeave.start_date)}</p>
              <p><span className="font-medium">结束日期：</span>{formatDate(selectedLeave.end_date)}</p>
              <p><span className="font-medium">请假原因：</span>{selectedLeave.reason}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              返回
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
              {isProcessing ? '处理中...' : '确认批准'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 拒绝对话框 */}
      <Dialog open={dialogType === 'reject'} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒绝请假</DialogTitle>
            <DialogDescription>
              请填写拒绝原因
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="py-4 space-y-4">
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">申请人：</span>{selectedLeave.employee?.name}</p>
                <p><span className="font-medium">请假类型：</span>{leaveTypeNames[selectedLeave.leave_type]}</p>
                <p><span className="font-medium">开始日期：</span>{formatDate(selectedLeave.start_date)}</p>
                <p><span className="font-medium">结束日期：</span>{formatDate(selectedLeave.end_date)}</p>
                <p><span className="font-medium">请假原因：</span>{selectedLeave.reason}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reject_reason">拒绝原因 *</Label>
                <Input
                  id="reject_reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="请输入拒绝原因"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              返回
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
              {isProcessing ? '处理中...' : '确认拒绝'}
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
              确定要取消这个请假申请吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="py-4 space-y-2 text-sm">
              <p><span className="font-medium">申请人：</span>{selectedLeave.employee?.name}</p>
              <p><span className="font-medium">请假类型：</span>{leaveTypeNames[selectedLeave.leave_type]}</p>
              <p><span className="font-medium">开始日期：</span>{formatDate(selectedLeave.start_date)}</p>
              <p><span className="font-medium">结束日期：</span>{formatDate(selectedLeave.end_date)}</p>
              <p><span className="font-medium">请假原因：</span>{selectedLeave.reason}</p>
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
