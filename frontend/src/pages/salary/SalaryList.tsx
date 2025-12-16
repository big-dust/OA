import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { DollarSign, Plus, Eye, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { salaryService } from '@/services/salary';
import { employeeService } from '@/services/employee';
import type { Salary, Employee } from '@/types';

// 格式化金额显示
function formatMoney(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(amount);
}

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

export default function SalaryList() {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null);

  // 筛选条件
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('');
  const [filterMonth, setFilterMonth] = useState<string>('');

  // 加载员工列表
  const fetchEmployees = useCallback(async () => {
    try {
      const data = await employeeService.getList();
      setEmployees(data);
    } catch {
      toast.error('获取员工列表失败');
    }
  }, []);

  // 加载工资列表
  const fetchSalaries = useCallback(async () => {
    try {
      const filter: { employee_id?: number; month?: string } = {};
      if (filterEmployeeId && filterEmployeeId !== 'all') {
        filter.employee_id = parseInt(filterEmployeeId);
      }
      if (filterMonth) {
        filter.month = filterMonth;
      }
      const data = await salaryService.getList(filter);
      setSalaries(data);
    } catch {
      toast.error('获取工资列表失败');
    }
  }, [filterEmployeeId, filterMonth]);

  // 初始加载
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchEmployees(), fetchSalaries()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchEmployees, fetchSalaries]);

  // 查看工资详情
  const viewSalaryDetail = (salary: Salary) => {
    setSelectedSalary(salary);
    setDetailDialogOpen(true);
  };

  // 搜索
  const handleSearch = () => {
    fetchSalaries();
  };

  // 重置筛选
  const handleReset = () => {
    setFilterEmployeeId('');
    setFilterMonth('');
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
              <DollarSign className="w-5 h-5 text-primary" />
              <CardTitle>工资管理</CardTitle>
            </div>
            <Link to="/salaries/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                创建工资记录
              </Button>
            </Link>
          </div>
          <CardDescription>查看和管理所有员工工资记录</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 筛选区域 */}
          <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="employee-filter">员工</Label>
              <Select value={filterEmployeeId} onValueChange={setFilterEmployeeId}>
                <SelectTrigger id="employee-filter">
                  <SelectValue placeholder="选择员工" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部员工</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} ({emp.employee_no})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="month-filter">月份</Label>
              <Input
                id="month-filter"
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                placeholder="选择月份"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" />
                搜索
              </Button>
              <Button variant="outline" onClick={handleReset}>
                重置
              </Button>
            </div>
          </div>

          {salaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无工资记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>员工姓名</TableHead>
                    <TableHead>工号</TableHead>
                    <TableHead>月份</TableHead>
                    <TableHead className="text-right">基本工资</TableHead>
                    <TableHead className="text-right">奖金</TableHead>
                    <TableHead className="text-right">扣款</TableHead>
                    <TableHead className="text-right">实发工资</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaries.map((salary) => (
                    <TableRow key={salary.id}>
                      <TableCell>{salary.employee?.name || '-'}</TableCell>
                      <TableCell>{salary.employee?.employee_no || '-'}</TableCell>
                      <TableCell>{salary.month}</TableCell>
                      <TableCell className="text-right">{formatMoney(salary.base_salary)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatMoney(salary.bonus)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatMoney(salary.deduction)}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(salary.net_salary)}</TableCell>
                      <TableCell>{formatDateTime(salary.created_at)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewSalaryDetail(salary)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          查看
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 工资详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>工资详情</DialogTitle>
            <DialogDescription>
              {selectedSalary?.employee?.name} - {selectedSalary?.month}
            </DialogDescription>
          </DialogHeader>
          {selectedSalary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">员工姓名：</span>
                  <span className="ml-2">{selectedSalary.employee?.name}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">工号：</span>
                  <span className="ml-2">{selectedSalary.employee?.employee_no}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">部门：</span>
                  <span className="ml-2">{selectedSalary.employee?.department}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">职位：</span>
                  <span className="ml-2">{selectedSalary.employee?.position}</span>
                </div>
              </div>
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">月份</span>
                  <span className="font-medium">{selectedSalary.month}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">基本工资</span>
                  <span>{formatMoney(selectedSalary.base_salary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">奖金</span>
                  <span className="text-green-600">+{formatMoney(selectedSalary.bonus)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">扣款</span>
                  <span className="text-red-600">-{formatMoney(selectedSalary.deduction)}</span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="font-medium">实发工资</span>
                  <span className="font-bold text-lg">{formatMoney(selectedSalary.net_salary)}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                创建时间：{formatDateTime(selectedSalary.created_at)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
