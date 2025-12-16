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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { meetingRoomService } from '@/services/meetingRoom';
import type { MeetingRoom } from '@/types';

// 表单验证 schema
const meetingRoomSchema = z.object({
  name: z.string().min(1, '请输入会议室名称'),
  capacity: z.number().min(1, '容纳人数必须大于0'),
  location: z.string().min(1, '请输入会议室位置'),
});

type MeetingRoomFormValues = z.infer<typeof meetingRoomSchema>;

export default function MeetingRoomForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setMeetingRoom] = useState<MeetingRoom | null>(null);

  const form = useForm<MeetingRoomFormValues>({
    resolver: zodResolver(meetingRoomSchema),
    defaultValues: {
      name: '',
      capacity: 10,
      location: '',
    },
  });

  // 加载会议室信息（编辑模式）
  useEffect(() => {
    if (isEditing && id) {
      const fetchMeetingRoom = async () => {
        try {
          const rooms = await meetingRoomService.getList();
          const found = rooms.find(r => r.id === parseInt(id));
          if (found) {
            setMeetingRoom(found);
            form.reset({
              name: found.name,
              capacity: found.capacity,
              location: found.location,
            });
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
    }
  }, [id, isEditing, form, navigate]);

  // 提交表单
  const onSubmit = async (data: MeetingRoomFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEditing && id) {
        await meetingRoomService.update(parseInt(id), {
          name: data.name,
          capacity: data.capacity,
          location: data.location,
        });
        toast.success('会议室更新成功');
      } else {
        await meetingRoomService.create({
          name: data.name,
          capacity: data.capacity,
          location: data.location,
        });
        toast.success('会议室创建成功');
      }
      navigate('/meeting-rooms');
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
        <Button variant="ghost" onClick={() => navigate('/meeting-rooms')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回会议室列表
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? '编辑会议室' : '添加会议室'}</CardTitle>
          <CardDescription>
            {isEditing ? '修改会议室信息' : '添加新的会议室到系统'}
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
                    <FormLabel>会议室名称 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入会议室名称，如：会议室A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>容纳人数 *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        placeholder="请输入容纳人数" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>位置 *</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入会议室位置，如：3楼东侧" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? '提交中...' : (isEditing ? '保存修改' : '添加会议室')}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/meeting-rooms')}>
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
