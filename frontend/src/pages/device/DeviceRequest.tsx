import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Package, RotateCcw, X, Check } from 'lucide-react';
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
import { deviceRequestService } from '@/services/device';
import { DeviceRequestStatus } from '@/types';
import type { DeviceRequest, DeviceRequestStatusValue } from '@/types';

// 设备申请状态显示名称
const statusNames: Record<DeviceRequestStatusValue, string> = {
  [DeviceRequestStatus.Pending]: '待审批',
  [DeviceRequestStatus.Approved]: '已批准',
  [DeviceRequestStatus.Rejected]: '已拒绝',
  [DeviceRequestStatus.Collected]: '已领取',
  [DeviceRequestStatus.ReturnPending]: '待确认归还',
  [DeviceRequestStatus.Returned]: '已归还',
  [DeviceRequestStatus.Cancelled]: '已取消',
};

// 状态徽章样式
const statusBadgeStyles: Record<DeviceRequestStatusValue, string> = {
  [DeviceRequestStatus.Pending]: 'bg-yellow-100 text-yellow-700',
  [DeviceRequestStatus.Approved]: 'bg-blue-100 text-blue-700',
  [DeviceRequestStatus.Rejected]: 'bg-red-100 text-red-700',
  [DeviceRequestStatus.Collected]: 'bg-green-100 text-green-700',
  [DeviceRequestStatus.ReturnPending]: 'bg-orange-100 text-orange-700',
  [DeviceRequestStatus.Returned]: 'bg-gray-100 text-gray-700',
  [DeviceRequestStatus.Cancelled]: 'bg-gray-100 text-gray-700',
};

// 格式化日期时间显示
function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type DialogType = 'collect' | 'return' | 'cancel' | null;

export default function DeviceRequestPage() {
  const [requests, setRequests] = useState<DeviceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [selectedRequest, setSelectedRequest] = useState<DeviceRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 加载设备申请记录
  const fetchRequests = useCallback(async () => {
    try {
      const data = await deviceRequestService.getList();
      setRequests(data || []);
    } catch {
      toast.error('获取设备申请记录失败');
      setRequests([]);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchRequests();
      setIsLoading(false);
    };
    loadData();
  }, [fetchRequests]);

  // 打开对话框
  const openDialog = (type: DialogType, request: DeviceRequest) => {
    setSelectedRequest(request);
    setDialogType(type);
  };

  // 关闭对话框
  const closeDialog = () => {
    setDialogType(null);
    setSelectedRequest(null);
  };

  // 确认领取
  const handleCollect = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    try {
      await deviceRequestService.collect(selectedRequest.id);
      toast.success('设备已领取');
      closeDialog();
      await fetchRequests();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '操作失败';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 发起归还
  const handleReturn = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    try {
      await deviceRequestService.returnDevice(selectedRequest.id);
      toast.success('归还申请已提交');
      closeDialog();
      await fetchRequests();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '操作失败';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 取消申请
  const handleCancel = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    try {
      await deviceRequestService.cancel(selectedRequest.id);
      toast.success('申请已取消');
      closeDialog();
      await fetchRequests();
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
            <Package className="w-5 h-5 text-primary" />
            <CardTitle>我的设备申请</CardTitle>
          </div>
          <CardDescription>查看和管理您的设备申请记录</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无设备申请记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>设备名称</TableHead>
                    <TableHead>设备类型</TableHead>
                    <TableHead>申请时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>拒绝原因</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {request.device?.name || '-'}
                      </TableCell>
                      <TableCell>{request.device?.type || '-'}</TableCell>
                      <TableCell>{formatDateTime(request.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusBadgeStyles[request.status]}>
                          {statusNames[request.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate" title={request.reject_reason || '-'}>
                        {request.reject_reason || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* 已批准状态可以领取 */}
                          {request.status === DeviceRequestStatus.Approved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => openDialog('collect', request)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              领取
                            </Button>
                          )}
                          {/* 已领取状态可以归还 */}
                          {request.status === DeviceRequestStatus.Collected && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => openDialog('return', request)}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              归还
                            </Button>
                          )}
                          {/* 待审批状态可以取消 */}
                          {request.status === DeviceRequestStatus.Pending && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                              onClick={() => openDialog('cancel', request)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              取消
                            </Button>
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

      {/* 领取确认对话框 */}
      <Dialog open={dialogType === 'collect'} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认领取</DialogTitle>
            <DialogDescription>
              确定要领取这个设备吗？
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4 space-y-2 text-sm">
              <p><span className="font-medium">设备名称：</span>{selectedRequest.device?.name}</p>
              <p><span className="font-medium">设备类型：</span>{selectedRequest.device?.type}</p>
              <p><span className="font-medium">申请时间：</span>{formatDateTime(selectedRequest.created_at)}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              取消
            </Button>
            <Button onClick={handleCollect} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
              {isProcessing ? '处理中...' : '确认领取'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 归还确认对话框 */}
      <Dialog open={dialogType === 'return'} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发起归还</DialogTitle>
            <DialogDescription>
              确定要归还这个设备吗？归还后需要等待设备管理员确认。
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4 space-y-2 text-sm">
              <p><span className="font-medium">设备名称：</span>{selectedRequest.device?.name}</p>
              <p><span className="font-medium">设备类型：</span>{selectedRequest.device?.type}</p>
              <p><span className="font-medium">申请时间：</span>{formatDateTime(selectedRequest.created_at)}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              取消
            </Button>
            <Button onClick={handleReturn} disabled={isProcessing}>
              {isProcessing ? '处理中...' : '确认归还'}
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
              确定要取消这个设备申请吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4 space-y-2 text-sm">
              <p><span className="font-medium">设备名称：</span>{selectedRequest.device?.name}</p>
              <p><span className="font-medium">设备类型：</span>{selectedRequest.device?.type}</p>
              <p><span className="font-medium">申请时间：</span>{formatDateTime(selectedRequest.created_at)}</p>
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
