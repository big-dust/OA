import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { FileText, Plus, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { contractService } from '@/services/contract';
import { ContractStatus, ContractType } from '@/types';
import type { Contract, ContractStatusValue, ContractTypeValue } from '@/types';

// 合同类型显示名称
const contractTypeNames: Record<ContractTypeValue, string> = {
  [ContractType.Onboarding]: '入职合同',
  [ContractType.Offboarding]: '离职合同',
};

// 合同状态显示名称
const contractStatusNames: Record<ContractStatusValue, string> = {
  [ContractStatus.Pending]: '待签署',
  [ContractStatus.Signed]: '已签署',
};

// 状态徽章样式
const statusBadgeStyles: Record<ContractStatusValue, string> = {
  [ContractStatus.Pending]: 'bg-yellow-100 text-yellow-700',
  [ContractStatus.Signed]: 'bg-green-100 text-green-700',
};

// 格式化日期时间显示
function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// 格式化日期为 YYYY-MM-DD
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

// 替换合同内容中的占位符
function replaceContractPlaceholders(contract: Contract): string {
  let content = contract.content;
  const employee = contract.employee;
  
  if (employee) {
    content = content.replace(/\{\{employee_name\}\}/g, employee.name || '');
    content = content.replace(/\{\{employee_no\}\}/g, employee.employee_no || '');
    content = content.replace(/\{\{department\}\}/g, employee.department || '');
    content = content.replace(/\{\{position\}\}/g, employee.position || '');
    content = content.replace(/\{\{hire_date\}\}/g, formatDate(employee.hire_date));
    content = content.replace(/\{\{start_date\}\}/g, formatDate(employee.hire_date));
  }
  
  // 替换当前日期和结束日期
  const today = formatDate(new Date().toISOString());
  content = content.replace(/\{\{current_date\}\}/g, today);
  content = content.replace(/\{\{end_date\}\}/g, today);
  
  return content;
}

export default function ContractList() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // 加载合同列表
  const fetchContracts = useCallback(async () => {
    try {
      const data = await contractService.getList();
      setContracts(data || []);
    } catch {
      toast.error('获取合同列表失败');
      setContracts([]);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchContracts();
      setIsLoading(false);
    };
    loadData();
  }, [fetchContracts]);

  // 查看合同详情
  const viewContractDetail = (contract: Contract) => {
    setSelectedContract(contract);
    setDetailDialogOpen(true);
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
              <FileText className="w-5 h-5 text-primary" />
              <CardTitle>合同管理</CardTitle>
            </div>
            <Link to="/contracts/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                创建合同
              </Button>
            </Link>
          </div>
          <CardDescription>查看和管理所有员工合同</CardDescription>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无合同记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>员工姓名</TableHead>
                    <TableHead>工号</TableHead>
                    <TableHead>合同类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>签署时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>{contract.employee?.name || '-'}</TableCell>
                      <TableCell>{contract.employee?.employee_no || '-'}</TableCell>
                      <TableCell>{contractTypeNames[contract.type]}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusBadgeStyles[contract.status]}>
                          {contractStatusNames[contract.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(contract.created_at)}</TableCell>
                      <TableCell>{formatDateTime(contract.signed_at)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewContractDetail(contract)}
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

      {/* 合同详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>合同详情</DialogTitle>
            <DialogDescription>
              {selectedContract?.employee?.name} - {contractTypeNames[selectedContract?.type || ContractType.Onboarding]}
            </DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">员工姓名：</span>
                  <span className="ml-2">{selectedContract.employee?.name}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">工号：</span>
                  <span className="ml-2">{selectedContract.employee?.employee_no}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">合同类型：</span>
                  <span className="ml-2">{contractTypeNames[selectedContract.type]}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">状态：</span>
                  <Badge variant="secondary" className={`ml-2 ${statusBadgeStyles[selectedContract.status]}`}>
                    {contractStatusNames[selectedContract.status]}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">创建时间：</span>
                  <span className="ml-2">{formatDateTime(selectedContract.created_at)}</span>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">签署时间：</span>
                  <span className="ml-2">{formatDateTime(selectedContract.signed_at)}</span>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">合同内容</h4>
                <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm">
                  {replaceContractPlaceholders(selectedContract)}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
