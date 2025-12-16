import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Laptop, Check, X, Ban, RotateCcw } from 'lucide-react';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { deviceRequestService } from '@/services/device';
import type { DeviceRequest } from '@/types';

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

type DialogType = 'approve' | 'reject' | 'cancel' | 'confirmReturn' | null;

export default function DeviceApproval() {
  const [pendingRequests, setPendingRequests] = useState<DeviceRequest[]>([]);
  const [returnPendingRequests, setReturnPendingRequests] = useState<DeviceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [selectedRequest, setSelectedRequest] = useState<DeviceRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 加载待审批申请
  const fetchPendingRequests = useCallback(async () => {
    try {
      const data = await deviceRequestService.getPending();
      setPendingRequests(data || []);
    } catch {
      toast.error('获取待审批申请失败');
      setPendingRequests([]);
    }
  }, []);

  // 加载待确认归还申请
  const fetchReturnPendingRequests = useCallback(async () => {
    try {
      const data = await deviceRequestService.getReturnPending();
      setReturnPendingRequests(data || []);
    } catch {
      toast.error('获取待确认归还申请失败');
      setReturnPendingRequests([]);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchPendingRequests(), fetchReturnPendingRequests()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchPendingRequests, fetchReturnPendingRequests]);

  // 打开对话框
  const openDialog = (type: DialogType, request: DeviceRequest) => {
    setSelectedRequest(request);
    setDialogType(type);
    setRejectReason('');
  };

  // 关闭对话框
  const closeDialog = () => {
    setDialogType(null);
    setSelectedRequest(null);
    setRejectReason('');
  };

  // 批准申请
  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    try {
      await deviceRequestService.approve(selectedRequest.id);
      toast.success('申请已批准');
      closeDialog();
      await fetchPendingRequests();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '操作失败';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 拒绝申请
  const handleReject = async () => {
    if (!selectedRequest) return;
    
    if (!rejectReason.trim()) {
      toast.error('请填写拒绝原因');
      return;
    }

    setIsProcessing(true);
    try {
      await deviceRequestService.reject(selectedRequest.id, rejectReason.trim());
      toast.success('申请已拒绝');
      closeDialog();
      await fetchPendingRequests();
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
      await fetchPendingRequests();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '操作失败';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 确认归还
  const handleConfirmReturn = async () => {
    if (!selectedRequest) return;
    
    setIsProcessing(true);
    try {
      await deviceRequestService.confirmReturn(selectedRequest.id);
      toast.success('归还已确认');
      closeDialog();
      await fetchReturnPendingRequests();
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
            <Laptop className="w-5 h-5 text-primary" />
            <CardTitle>设备审批</CardTitle>
          </div>
          <CardDescription>审批员工的设备申请和归还请求</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="pending">
                待审批申请
                {pendingRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-700">
                    {pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="return">
                待确认归还
                {returnPendingRequests.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">
                    {returnPendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* 待审批申请 */}
            <TabsContent value="pending">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无待审批的设备申请
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>申请人</TableHead>
                        <TableHead>部门</TableHead>
                        <TableHead>设备名称</TableHead>
                        <TableHead>设备类型</TableHead>
                        <TableHead>申请时间</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>{request.employee?.name || '-'}</TableCell>
                          <TableCell>{request.employee?.department || '-'}</TableCell>
                          <TableCell className="font-medium">{request.device?.name || '-'}</TableCell>
                          <TableCell>{request.device?.type || '-'}</TableCell>
                          <TableCell>{formatDateTime(request.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => openDialog('approve', request)}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                批准
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => openDialog('reject', request)}
                              >
                                <X className="w-4 h-4 mr-1" />
                                拒绝
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                onClick={() => openDialog('cancel', request)}
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
            </TabsContent>

            {/* 待确认归还 */}
            <TabsContent value="return">
              {returnPendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无待确认归还的设备
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>申请人</TableHead>
                        <TableHead>部门</TableHead>
                        <TableHead>设备名称</TableHead>
                        <TableHead>设备类型</TableHead>
                        <TableHead>申请时间</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnPendingRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>{request.employee?.name || '-'}</TableCell>
                          <TableCell>{request.employee?.department || '-'}</TableCell>
                          <TableCell className="font-medium">{request.device?.name || '-'}</TableCell>
                          <TableCell>{request.device?.type || '-'}</TableCell>
                          <TableCell>{formatDateTime(request.created_at)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => openDialog('confirmReturn', request)}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              确认归还
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 批准确认对话框 */}
      <Dialog open={dialogType === 'approve'} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认批准</DialogTitle>
            <DialogDescription>
              确定要批准这个设备申请吗？
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4 space-y-2 text-sm">
              <p><span className="font-medium">申请人：</span>{selectedRequest.employee?.name}</p>
              <p><span className="font-medium">部门：</span>{selectedRequest.employee?.department}</p>
              <p><span className="font-medium">设备名称：</span>{selectedRequest.device?.name}</p>
              <p><span className="font-medium">设备类型：</span>{selectedRequest.device?.type}</p>
              <p><span className="font-medium">申请时间：</span>{formatDateTime(selectedRequest.created_at)}</p>
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
            <DialogTitle>拒绝申请</DialogTitle>
            <DialogDescription>
              请填写拒绝原因
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4 space-y-4">
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">申请人：</span>{selectedRequest.employee?.name}</p>
                <p><span className="font-medium">部门：</span>{selectedRequest.employee?.department}</p>
                <p><span className="font-medium">设备名称：</span>{selectedRequest.device?.name}</p>
                <p><span className="font-medium">设备类型：</span>{selectedRequest.device?.type}</p>
                <p><span className="font-medium">申请时间：</span>{formatDateTime(selectedRequest.created_at)}</p>
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
              确定要取消这个设备申请吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4 space-y-2 text-sm">
              <p><span className="font-medium">申请人：</span>{selectedRequest.employee?.name}</p>
              <p><span className="font-medium">部门：</span>{selectedRequest.employee?.department}</p>
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

      {/* 确认归还对话框 */}
      <Dialog open={dialogType === 'confirmReturn'} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认归还</DialogTitle>
            <DialogDescription>
              确定要确认这个设备已归还吗？
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4 space-y-2 text-sm">
              <p><span className="font-medium">申请人：</span>{selectedRequest.employee?.name}</p>
              <p><span className="font-medium">部门：</span>{selectedRequest.employee?.department}</p>
              <p><span className="font-medium">设备名称：</span>{selectedRequest.device?.name}</p>
              <p><span className="font-medium">设备类型：</span>{selectedRequest.device?.type}</p>
              <p><span className="font-medium">申请时间：</span>{formatDateTime(selectedRequest.created_at)}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              返回
            </Button>
            <Button onClick={handleConfirmReturn} disabled={isProcessing} className="bg-green-600 hover:bg-green-700">
              {isProcessing ? '处理中...' : '确认归还'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
