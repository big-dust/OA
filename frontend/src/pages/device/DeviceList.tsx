import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Laptop, Plus, Pencil, Trash2, Package } from 'lucide-react';
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
import { deviceService, deviceRequestService } from '@/services/device';
import { useAuthStore } from '@/store/authStore';
import { Role } from '@/types';
import type { Device } from '@/types';

export default function DeviceList() {
  const { employee } = useAuthStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 检查是否是设备管理员
  const isDeviceAdmin = employee?.role === Role.DeviceAdmin || employee?.role === Role.SuperAdmin;

  // 加载设备列表
  const fetchDevices = useCallback(async () => {
    try {
      const data = await deviceService.getList();
      setDevices(data || []);
    } catch {
      toast.error('获取设备列表失败');
      setDevices([]);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchDevices();
      setIsLoading(false);
    };
    loadData();
  }, [fetchDevices]);

  // 打开删除确认对话框
  const openDeleteDialog = (device: Device) => {
    setSelectedDevice(device);
    setDeleteDialogOpen(true);
  };

  // 打开申请确认对话框
  const openRequestDialog = (device: Device) => {
    setSelectedDevice(device);
    setRequestDialogOpen(true);
  };

  // 删除设备
  const handleDelete = async () => {
    if (!selectedDevice) return;
    
    setIsProcessing(true);
    try {
      await deviceService.delete(selectedDevice.id);
      toast.success('设备已删除');
      setDeleteDialogOpen(false);
      setSelectedDevice(null);
      await fetchDevices();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '删除失败';
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 申请设备
  const handleRequest = async () => {
    if (!selectedDevice) return;
    
    setIsProcessing(true);
    try {
      await deviceRequestService.create(selectedDevice.id);
      toast.success('设备申请已提交');
      setRequestDialogOpen(false);
      setSelectedDevice(null);
      await fetchDevices();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '申请失败';
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
              <Laptop className="w-5 h-5 text-primary" />
              <CardTitle>设备列表</CardTitle>
            </div>
            {isDeviceAdmin && (
              <Link to="/devices/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  添加设备
                </Button>
              </Link>
            )}
          </div>
          <CardDescription>
            {isDeviceAdmin ? '管理公司设备，审批设备申请' : '查看可用设备并提交申请'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无设备
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>设备名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>总数量</TableHead>
                    <TableHead>可用数量</TableHead>
                    <TableHead>描述</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.name}</TableCell>
                      <TableCell>{device.type}</TableCell>
                      <TableCell>{device.total_quantity}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={device.available_quantity > 0 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'}
                        >
                          {device.available_quantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={device.description}>
                        {device.description || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {/* 普通员工可以申请设备 */}
                          {device.available_quantity > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRequestDialog(device)}
                            >
                              <Package className="w-4 h-4 mr-1" />
                              申请
                            </Button>
                          )}
                          {/* 设备管理员可以编辑和删除 */}
                          {isDeviceAdmin && (
                            <>
                              <Link to={`/devices/${device.id}/edit`}>
                                <Button variant="ghost" size="sm">
                                  <Pencil className="w-4 h-4 mr-1" />
                                  编辑
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => openDeleteDialog(device)}
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
              确定要删除这个设备吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          {selectedDevice && (
            <div className="py-4 space-y-2 text-sm">
              <p><span className="font-medium">设备名称：</span>{selectedDevice.name}</p>
              <p><span className="font-medium">类型：</span>{selectedDevice.type}</p>
              <p><span className="font-medium">总数量：</span>{selectedDevice.total_quantity}</p>
              <p><span className="font-medium">可用数量：</span>{selectedDevice.available_quantity}</p>
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

      {/* 申请确认对话框 */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>申请设备</DialogTitle>
            <DialogDescription>
              确定要申请这个设备吗？申请后需要等待设备管理员审批。
            </DialogDescription>
          </DialogHeader>
          {selectedDevice && (
            <div className="py-4 space-y-2 text-sm">
              <p><span className="font-medium">设备名称：</span>{selectedDevice.name}</p>
              <p><span className="font-medium">类型：</span>{selectedDevice.type}</p>
              <p><span className="font-medium">可用数量：</span>{selectedDevice.available_quantity}</p>
              {selectedDevice.description && (
                <p><span className="font-medium">描述：</span>{selectedDevice.description}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleRequest} disabled={isProcessing}>
              {isProcessing ? '提交中...' : '确认申请'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
