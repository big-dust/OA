import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { employeeService } from '@/services/employee';
import { useAuthStore } from '@/store/authStore';
import { Role } from '@/types';
import type { Employee, RoleType } from '@/types';

// 角色显示名称
const roleNames: Record<RoleType, string> = {
  [Role.SuperAdmin]: '超级管理员',
  [Role.HR]: 'HR',
  [Role.Finance]: '财务',
  [Role.DeviceAdmin]: '设备管理员',
  [Role.Supervisor]: '主管',
  [Role.Employee]: '员工',
};

// 可编辑字段的验证 schema
const profileSchema = z.object({
  name: z.string().min(1, '请输入姓名'),
  phone: z.string().min(1, '请输入联系电话'),
  email: z.string().email('请输入有效的邮箱地址'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const { employee: authEmployee, updateEmployee } = useAuthStore();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
    },
  });

  // 加载员工信息
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const data = await employeeService.getMe();
        setEmployee(data);
        form.reset({
          name: data.name,
          phone: data.phone,
          email: data.email,
        });
      } catch {
        toast.error('获取个人信息失败');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployee();
  }, [form]);


  // 提交表单
  const onSubmit = async (data: ProfileFormValues) => {
    if (!employee) return;
    
    setIsSaving(true);
    try {
      const updated = await employeeService.update(employee.id, data);
      setEmployee(updated);
      // 更新 auth store 中的员工信息
      if (authEmployee && authEmployee.id === updated.id) {
        updateEmployee(updated);
      }
      setIsEditing(false);
      toast.success('个人信息更新成功');
    } catch {
      toast.error('更新个人信息失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    if (employee) {
      form.reset({
        name: employee.name,
        phone: employee.phone,
        email: employee.email,
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">无法获取个人信息</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>个人信息</CardTitle>
              <CardDescription>查看和编辑您的个人信息</CardDescription>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}>编辑</Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入姓名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>联系电话</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入联系电话" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>邮箱</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="请输入邮箱" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? '保存中...' : '保存'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    取消
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              {/* 可编辑字段 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">姓名</label>
                  <p className="mt-1">{employee.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">联系电话</label>
                  <p className="mt-1">{employee.phone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">邮箱</label>
                  <p className="mt-1">{employee.email || '-'}</p>
                </div>
              </div>

              {/* 系统管理字段（不可编辑） */}
              <div className="border-t pt-4 mt-4">
                <p className="text-sm text-muted-foreground mb-4">以下信息由系统管理，如需修改请联系 HR</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">工号</label>
                    <p className="mt-1">{employee.employee_no}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">部门</label>
                    <p className="mt-1">{employee.department}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">职位</label>
                    <p className="mt-1">{employee.position}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">入职日期</label>
                    <p className="mt-1">{employee.hire_date}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">直属主管</label>
                    <p className="mt-1">{employee.supervisor?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">角色</label>
                    <p className="mt-1">
                      <Badge variant="secondary">{roleNames[employee.role]}</Badge>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
