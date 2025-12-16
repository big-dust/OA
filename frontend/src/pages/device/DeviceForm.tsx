import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { deviceService } from '@/services/device';
import type { Device } from '@/types';

// 表单验证 schema
const deviceSchema = z.object({
  name: z.string().min(1, '请输入设备名称'),
  type: z.string().min(1, '请输入设备类型'),
  total_quantity: z.number().min(1, '数量必须大于0'),
  description: z.string().optional(),
});

type DeviceFormValues = z.infer<typeof deviceSchema>;

export default function DeviceForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [device, setDevice] = useState<Device | null>(null);

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: {
      name: '',
      type: '',
      total_quantity: 1,
      description: '',
    },
  });

  // 加载设备信息（编辑模式）
  useEffect(() => {
    if (isEditing && id) {
      const fetchDevice = async () => {
        try {
          const devices = await deviceService.getList();
          const found = devices.find(d => d.id === parseInt(id));
          if (found) {
            setDevice(found);
            form.reset({
              name: found.name,
              type: found.type,
              total_quantity: found.total_quantity,
              description: found.description || '',
            });
          } else {
            toast.error('设备不存在');
            navigate('/devices');
          }
        } catch {
          toast.error('获取设备信息失败');
          navigate('/devices');
        } finally {
          setIsLoading(false);
        }
      };
      fetchDevice();
    }
  }, [id, isEditing, form, navigate]);

  // 提交表单
  const onSubmit = async (data: DeviceFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditing && id) {
        await deviceService.update(parseInt(id), {
          name: data.name,
          type: data.type,
          total_quantity: data.total_quantity,
          description: data.description || '',
        });
        toast.success('设备更新成功');
      } else {
        await deviceService.create({
          name: data.name,
          type: data.type,
          total_quantity: data.total_quantity,
          description: data.description || '',
        });
        toast.success('设备创建成功');
      }
      navigate('/devices');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || (isEditing ? '更新失败' : '创建失败');
      toast.error(message);
    } finally {
      setIsSubmitting(false);
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
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate('/devices')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回设备列表
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? '编辑设备' : '添加设备'}</CardTitle>
          <CardDescription>
            {isEditing ? '修改设备信息' : '添加新的设备到系统'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>设备名称 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入设备名称" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>设备类型 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入设备类型，如：笔记本电脑、显示器等" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>数量 *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        placeholder="请输入设备数量" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    {isEditing && device && (
                      <p className="text-sm text-muted-foreground">
                        当前可用数量：{device.available_quantity}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="请输入设备描述（可选）" 
                        className="resize-none"
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? '提交中...' : (isEditing ? '保存修改' : '添加设备')}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/devices')}>
                  取消
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
