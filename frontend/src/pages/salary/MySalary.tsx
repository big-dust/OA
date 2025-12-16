import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { DollarSign, Eye, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { salaryService } from '@/services/salary';
import type { Salary } from '@/types';

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

// 格式化月份显示
function formatMonth(month: string): string {
  const [year, mon] = month.split('-');
  return `${year}年${mon}月`;
}

export default function MySalary() {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null);

  // 加载我的工资记录
  const fetchMySalaries = useCallback(async () => {
    try {
      const data = await salaryService.getMy();
      // 按月份降序排列（需求 3.1）
      const sortedData = [...data].sort((a, b) => b.month.localeCompare(a.month));
      setSalaries(sortedData);
    } catch {
      toast.error('获取工资记录失败');
    }
  }, []);

  // 初始加载
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchMySalaries();
      setIsLoading(false);
    };
    loadData();
  }, [fetchMySalaries]);

  // 查看工资详情
  const viewSalaryDetail = (salary: Salary) => {
    setSelectedSalary(salary);
    setDetailDialogOpen(true);
  };

  // 计算统计数据
  const totalNetSalary = salaries.reduce((sum, s) => sum + s.net_salary, 0);
  const avgNetSalary = salaries.length > 0 ? totalNetSalary / salaries.length : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      {salaries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>工资记录数</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{salaries.length} 条</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>累计收入</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatMoney(totalNetSalary)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>平均月薪</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatMoney(avgNetSalary)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 工资列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <CardTitle>我的工资</CardTitle>
          </div>
          <CardDescription>查看您的历史工资记录</CardDescription>
        </CardHeader>
        <CardContent>
          {salaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无工资记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>月份</TableHead>
                    <TableHead className="text-right">基本工资</TableHead>
                    <TableHead className="text-right">奖金</TableHead>
                    <TableHead className="text-right">扣款</TableHead>
                    <TableHead className="text-right">实发工资</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaries.map((salary) => (
                    <TableRow key={salary.id}>
                      <TableCell className="font-medium">{formatMonth(salary.month)}</TableCell>
                      <TableCell className="text-right">{formatMoney(salary.base_salary)}</TableCell>
                      <TableCell className="text-right text-green-600">+{formatMoney(salary.bonus)}</TableCell>
                      <TableCell className="text-right text-red-600">-{formatMoney(salary.deduction)}</TableCell>
                      <TableCell className="text-right font-bold">{formatMoney(salary.net_salary)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewSalaryDetail(salary)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          详情
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
              {selectedSalary && formatMonth(selectedSalary.month)}
            </DialogDescription>
          </DialogHeader>
          {selectedSalary && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">月份</span>
                  <span className="font-medium">{formatMonth(selectedSalary.month)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">基本工资</span>
                  <span>{formatMoney(selectedSalary.base_salary)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">奖金</span>
                  <span className="text-green-600">+{formatMoney(selectedSalary.bonus)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">扣款</span>
                  <span className="text-red-600">-{formatMoney(selectedSalary.deduction)}</span>
                </div>
                <div className="flex justify-between py-3 bg-muted rounded-lg px-3">
                  <span className="font-medium">实发工资</span>
                  <span className="font-bold text-xl">{formatMoney(selectedSalary.net_salary)}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                发放时间：{formatDateTime(selectedSalary.created_at)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
