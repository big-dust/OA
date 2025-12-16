import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Calendar, Plus, X } from 'lucide-react';
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
import { leaveService } from '@/services/leave';
import { LeaveStatus, LeaveType } from '@/types';
import type { LeaveRequest, LeaveStatusValue, LeaveTypeValue } from '@/types';

// 请假类型显示名称
const leaveTypeNames: Record<LeaveTypeValue, string> = {
  [LeaveType.Annual]: '年假',
  [LeaveType.Sick]: '病假',
  [LeaveType.Personal]: '事假',
  [LeaveType.Marriage]: '婚假',
  [LeaveType.Maternity]: '产假',
  [LeaveType.Bereavement]: '丧假',
};

// 请假状态显示名称
const leaveStatusNames: Record<LeaveStatusValue, string> = {
  [LeaveStatus.Pending]: '待审批',
  [LeaveStatus.Approved]: '已批准',
  [LeaveStatus.Rejected]: '已拒绝',
  [LeaveStatus.Cancelled]: '已取消',
};

// 状态徽章样式
const statusBadgeStyles: Record<LeaveStatusValue, string> = {
  [LeaveStatus.Pending]: 'bg-yellow-100 text-yellow-700',
  [LeaveStatus.Approved]: 'bg-green-100 text-green-700',
  [LeaveStatus.Rejected]: 'bg-red-100 text-red-700',
  [LeaveStatus.Cancelled]: 'bg-gray-100 text-gray-700',
};

// 格式化日期显示
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}


export default function LeaveList() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // 加载请假记录
  const fetchLeaves = useCallback(async () => {
    try {
      const data = await leaveService.getList();
      setLeaves(data || []);
    } catch {
      toast.error('获取请假记录失败');
      setLeaves([]);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchLeaves();
      setIsLoading(false);
    };
    loadData();
  }, [fetchLeaves]);

  // 打开取消确认对话框
  const openCancelDialog = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setCancelDialogOpen(true);
  };

  // 取消请假申请
  const handleCancel = async () => {
    if (!selectedLeave) return;
    
    setIsCancelling(true);
    try {
      await leaveService.cancel(selectedLeave.id);
      toast.success('请假申请已取消');
      setCancelDialogOpen(false);
      setSelectedLeave(null);
      await fetchLeaves();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '取消失败';
      toast.error(message);
    } finally {
      setIsCancelling(false);
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
              <CardTitle>我的请假记录</CardTitle>
            </div>
            <Link to="/leaves/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                申请请假
              </Button>
            </Link>
          </div>
          <CardDescription>查看和管理您的请假申请</CardDescription>
        </CardHeader>
        <CardContent>
          {leaves.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无请假记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>请假类型</TableHead>
                    <TableHead>开始日期</TableHead>
                    <TableHead>结束日期</TableHead>
                    <TableHead>请假原因</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>拒绝原因</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>{leaveTypeNames[leave.leave_type]}</TableCell>
                      <TableCell>{formatDate(leave.start_date)}</TableCell>
                      <TableCell>{formatDate(leave.end_date)}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={leave.reason}>
                        {leave.reason}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusBadgeStyles[leave.status]}>
                          {leaveStatusNames[leave.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={leave.reject_reason || '-'}>
                        {leave.reject_reason || '-'}
                      </TableCell>
                      <TableCell>
                        {leave.status === LeaveStatus.Pending && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCancelDialog(leave)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            取消
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 取消确认对话框 */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认取消</DialogTitle>
            <DialogDescription>
              确定要取消这个请假申请吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="py-4 space-y-2 text-sm">
              <p><span className="font-medium">请假类型：</span>{leaveTypeNames[selectedLeave.leave_type]}</p>
              <p><span className="font-medium">开始日期：</span>{formatDate(selectedLeave.start_date)}</p>
              <p><span className="font-medium">结束日期：</span>{formatDate(selectedLeave.end_date)}</p>
              <p><span className="font-medium">请假原因：</span>{selectedLeave.reason}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              返回
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? '取消中...' : '确认取消'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
