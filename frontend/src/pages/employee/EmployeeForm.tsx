import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { employeeService, type CreateEmployeeRequest } from '@/services/employee';
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

// 可分配的角色列表
const assignableRoles: RoleType[] = [
  Role.Employee,
  Role.Supervisor,
  Role.HR,
  Role.Finance,
  Role.DeviceAdmin,
  Role.SuperAdmin,
];

// 表单验证 schema
const employeeSchema = z.object({
  name: z.string().min(1, '请输入姓名'),
  department: z.string().min(1, '请输入部门'),
  position: z.string().min(1, '请输入职位'),
  phone: z.string().min(1, '请输入联系电话'),
  email: z.string().email('请输入有效的邮箱地址'),
  supervisor_id: z.string().optional(),
  role: z.string().min(1, '请选择角色'),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;


export default function EmployeeForm() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 创建成功后显示账号密码的对话框
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState<Employee | null>(null);
  const [initialPassword, setInitialPassword] = useState('');
  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: '',
      department: '',
      position: '',
      phone: '',
      email: '',
      supervisor_id: '',
      role: Role.Employee,
    },
  });

  // 加载员工列表（用于选择主管）
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await employeeService.getList();
        setEmployees(data.filter(e => e.is_active));
      } catch {
        // 忽略错误，主管选择是可选的
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // 提交表单
  const onSubmit = async (data: EmployeeFormValues) => {
    setIsSubmitting(true);
    try {
      const request: CreateEmployeeRequest = {
        name: data.name,
        department: data.department,
        position: data.position,
        phone: data.phone,
        email: data.email,
        role: data.role as RoleType,
      };
      
      if (data.supervisor_id && data.supervisor_id !== 'none') {
        request.supervisor_id = parseInt(data.supervisor_id);
      }
      
      const response = await employeeService.create(request);
      setCreatedEmployee(response.employee);
      setInitialPassword(response.initial_password);
      setCredentialsDialogOpen(true);
      toast.success('员工创建成功');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '创建员工失败';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string, type: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'username') {
        setCopiedUsername(true);
        setTimeout(() => setCopiedUsername(false), 2000);
      } else {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      }
    } catch {
      toast.error('复制失败');
    }
  };

  // 关闭凭证对话框并返回列表
  const handleCloseCredentials = () => {
    setCredentialsDialogOpen(false);
    navigate('/employees');
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
        <Button variant="ghost" onClick={() => navigate('/employees')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回员工列表
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>添加员工</CardTitle>
          <CardDescription>创建新的员工账号</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>姓名 *</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入姓名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>部门 *</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入部门" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>职位 *</FormLabel>
                      <FormControl>
                        <Input placeholder="请输入职位" {...field} />
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
                      <FormLabel>联系电话 *</FormLabel>
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
                    <FormItem className="md:col-span-2">
                      <FormLabel>邮箱 *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="请输入邮箱" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>角色 *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择角色" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assignableRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {roleNames[role]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supervisor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>直属主管</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="选择主管（可选）" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">无主管</SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id.toString()}>
                              {emp.name} ({emp.department})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? '创建中...' : '创建员工'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/employees')}>
                  取消
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* 账号密码显示对话框 */}
      <Dialog open={credentialsDialogOpen} onOpenChange={setCredentialsDialogOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>员工创建成功</DialogTitle>
            <DialogDescription>
              请将以下登录凭证发送给员工，初始密码仅显示一次
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">用户名</p>
                  <p className="font-mono text-lg">{createdEmployee?.username}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(createdEmployee?.username || '', 'username')}
                >
                  {copiedUsername ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">初始密码</p>
                  <p className="font-mono text-lg">{initialPassword}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(initialPassword, 'password')}
                >
                  {copiedPassword ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">工号</p>
                <p className="font-mono">{createdEmployee?.employee_no}</p>
              </div>
            </div>
            <p className="text-sm text-amber-600">
              ⚠️ 员工首次登录后需要修改密码
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleCloseCredentials}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
