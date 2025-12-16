import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DollarSign, ArrowLeft, Save } from 'lucide-react';
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
import { salaryService, type CreateSalaryRequest } from '@/services/salary';
import { employeeService } from '@/services/employee';
import type { Employee } from '@/types';

// 格式化金额显示
function formatMoney(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(amount);
}

export default function SalaryForm() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 表单数据
  const [employeeId, setEmployeeId] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [baseSalary, setBaseSalary] = useState<string>('');
  const [bonus, setBonus] = useState<string>('0');
  const [deduction, setDeduction] = useState<string>('0');

  // 计算实发工资
  const netSalary = (parseFloat(baseSalary) || 0) + (parseFloat(bonus) || 0) - (parseFloat(deduction) || 0);

  // 加载员工列表
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await employeeService.getList();
        setEmployees(data);
      } catch {
        toast.error('获取员工列表失败');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证
    if (!employeeId) {
      toast.error('请选择员工');
      return;
    }
    if (!month) {
      toast.error('请选择月份');
      return;
    }
    if (!baseSalary || parseFloat(baseSalary) <= 0) {
      toast.error('请输入有效的基本工资');
      return;
    }

    setIsSubmitting(true);
    try {
      const data: CreateSalaryRequest = {
        employee_id: parseInt(employeeId),
        month,
        base_salary: parseFloat(baseSalary),
        bonus: parseFloat(bonus) || 0,
        deduction: parseFloat(deduction) || 0,
      };

      await salaryService.create(data);
      toast.success('工资记录创建成功');
      navigate('/salaries');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      if (err.response?.data?.message?.includes('已存在')) {
        toast.error('该员工该月份的工资记录已存在');
      } else {
        toast.error('创建工资记录失败');
      }
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
    <div className="space-y-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/salaries')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <DollarSign className="w-5 h-5 text-primary" />
            <CardTitle>创建工资记录</CardTitle>
          </div>
          <CardDescription>为员工创建指定月份的工资记录</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 员工选择 */}
            <div className="space-y-2">
              <Label htmlFor="employee">员工 *</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger id="employee">
                  <SelectValue placeholder="选择员工" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} ({emp.employee_no}) - {emp.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 月份选择 */}
            <div className="space-y-2">
              <Label htmlFor="month">月份 *</Label>
              <Input
                id="month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required
              />
            </div>

            {/* 基本工资 */}
            <div className="space-y-2">
              <Label htmlFor="baseSalary">基本工资 *</Label>
              <Input
                id="baseSalary"
                type="number"
                step="0.01"
                min="0"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                placeholder="请输入基本工资"
                required
              />
            </div>

            {/* 奖金 */}
            <div className="space-y-2">
              <Label htmlFor="bonus">奖金</Label>
              <Input
                id="bonus"
                type="number"
                step="0.01"
                min="0"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
                placeholder="请输入奖金"
              />
            </div>

            {/* 扣款 */}
            <div className="space-y-2">
              <Label htmlFor="deduction">扣款</Label>
              <Input
                id="deduction"
                type="number"
                step="0.01"
                min="0"
                value={deduction}
                onChange={(e) => setDeduction(e.target.value)}
                placeholder="请输入扣款"
              />
            </div>

            {/* 实发工资预览 */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">实发工资预览</span>
                <span className="text-xl font-bold">{formatMoney(netSalary)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                计算公式：基本工资 + 奖金 - 扣款
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/salaries')}
                className="flex-1"
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? '创建中...' : '创建工资记录'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
