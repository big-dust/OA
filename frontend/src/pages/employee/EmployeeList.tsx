import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, UserCog, Shield, UserX, UserCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

// 可分配的角色列表
const assignableRoles: RoleType[] = [
  Role.Employee,
  Role.Supervisor,
  Role.HR,
  Role.Finance,
  Role.DeviceAdmin,
  Role.SuperAdmin,
];

export default function EmployeeList() {
  const navigate = useNavigate();
  const { employee: currentUser } = useAuthStore();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 角色修改对话框
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleType | ''>('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // 主管修改对话框
  const [supervisorDialogOpen, setSupervisorDialogOpen] = useState(false);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
  const [isUpdatingSupervisor, setIsUpdatingSupervisor] = useState(false);

  // 加载员工列表
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await employeeService.getList();
        setEmployees(data || []);
      } catch {
        toast.error('获取员工列表失败');
        setEmployees([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // 打开角色修改对话框
  const openRoleDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSelectedRole(employee.role);
    setRoleDialogOpen(true);
  };

  // 修改角色
  const handleUpdateRole = async () => {
    if (!selectedEmployee || !selectedRole) return;
    
    setIsUpdatingRole(true);
    try {
      const updated = await employeeService.updateRole(selectedEmployee.id, selectedRole as RoleType);
      setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
      setRoleDialogOpen(false);
      toast.success('角色修改成功');
    } catch {
      toast.error('角色修改失败');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // 打开主管修改对话框
  const openSupervisorDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSelectedSupervisorId(employee.supervisor_id?.toString() || 'none');
    setSupervisorDialogOpen(true);
  };

  // 修改主管
  const handleUpdateSupervisor = async () => {
    if (!selectedEmployee) return;
    
    setIsUpdatingSupervisor(true);
    try {
      const supervisorId = selectedSupervisorId === 'none' ? null : parseInt(selectedSupervisorId);
      await employeeService.updateSupervisor(selectedEmployee.id, supervisorId);
      // 重新获取列表以获取完整的 supervisor 信息
      const data = await employeeService.getList();
      setEmployees(data || []);
      setSupervisorDialogOpen(false);
      toast.success('主管修改成功');
    } catch {
      toast.error('主管修改失败');
    } finally {
      setIsUpdatingSupervisor(false);
    }
  };

  // 启用/禁用账号
  const handleToggleStatus = async (employee: Employee) => {
    try {
      const updated = await employeeService.updateStatus(employee.id, !employee.is_active);
      setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
      toast.success(updated.is_active ? '账号已启用' : '账号已禁用');
    } catch {
      toast.error('操作失败');
    }
  };

  // 可选的主管列表（排除自己）
  const supervisorOptions = employees.filter(e => 
    e.id !== selectedEmployee?.id && e.is_active
  );

  // 检查是否可以修改角色（不能修改自己的角色）
  const canModifyRole = (employee: Employee) => {
    return currentUser?.id !== employee.id;
  };

  // 检查是否可以启用/禁用账号（不能禁用自己）
  const canToggleStatus = (employee: Employee) => {
    return currentUser?.id !== employee.id;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }


  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>员工管理</CardTitle>
              <CardDescription>管理系统中的所有员工</CardDescription>
            </div>
            <Button onClick={() => navigate('/employees/new')}>
              <Plus className="w-4 h-4 mr-2" />
              添加员工
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>工号</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>部门</TableHead>
                <TableHead>职位</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>主管</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-mono">{employee.employee_no}</TableCell>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{roleNames[employee.role]}</Badge>
                  </TableCell>
                  <TableCell>{employee.supervisor?.name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={employee.is_active ? 'default' : 'destructive'}>
                      {employee.is_active ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {canModifyRole(employee) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="修改角色"
                          onClick={() => openRoleDialog(employee)}
                        >
                          <Shield className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="修改主管"
                        onClick={() => openSupervisorDialog(employee)}
                      >
                        <UserCog className="w-4 h-4" />
                      </Button>
                      {canToggleStatus(employee) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={employee.is_active ? '禁用账号' : '启用账号'}
                          onClick={() => handleToggleStatus(employee)}
                        >
                          {employee.is_active ? (
                            <UserX className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    暂无员工数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 角色修改对话框 */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改角色</DialogTitle>
            <DialogDescription>
              为 {selectedEmployee?.name} 分配新的角色
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as RoleType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                {assignableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleNames[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateRole} disabled={isUpdatingRole}>
              {isUpdatingRole ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 主管修改对话框 */}
      <Dialog open={supervisorDialogOpen} onOpenChange={setSupervisorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改主管</DialogTitle>
            <DialogDescription>
              为 {selectedEmployee?.name} 分配直属主管
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedSupervisorId} onValueChange={setSelectedSupervisorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择主管" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">无主管</SelectItem>
                {supervisorOptions.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.name} ({emp.department})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupervisorDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateSupervisor} disabled={isUpdatingSupervisor}>
              {isUpdatingSupervisor ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
