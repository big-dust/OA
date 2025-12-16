import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { FileText, PenLine, Eye } from 'lucide-react';
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

export default function MyContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  // 加载我的合同列表
  const fetchContracts = useCallback(async () => {
    try {
      const data = await contractService.getMy();
      setContracts(data);
    } catch {
      toast.error('获取合同列表失败');
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

  // 打开签署确认对话框
  const openSignDialog = (contract: Contract) => {
    setSelectedContract(contract);
    setSignDialogOpen(true);
  };

  // 签署合同
  const handleSign = async () => {
    if (!selectedContract) return;

    setIsSigning(true);
    try {
      await contractService.sign(selectedContract.id);
      toast.success('合同签署成功');
      setSignDialogOpen(false);
      setSelectedContract(null);
      await fetchContracts();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '签署失败';
      toast.error(message);
    } finally {
      setIsSigning(false);
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
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle>我的合同</CardTitle>
          </div>
          <CardDescription>查看和签署您的合同</CardDescription>
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
                      <TableCell>{contractTypeNames[contract.type]}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusBadgeStyles[contract.status]}>
                          {contractStatusNames[contract.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateTime(contract.created_at)}</TableCell>
                      <TableCell>{formatDateTime(contract.signed_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewContractDetail(contract)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            查看
                          </Button>
                          {contract.status === ContractStatus.Pending && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openSignDialog(contract)}
                            >
                              <PenLine className="w-4 h-4 mr-1" />
                              签署
                            </Button>
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

      {/* 合同详情对话框 */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>合同详情</DialogTitle>
            <DialogDescription>
              {contractTypeNames[selectedContract?.type || ContractType.Onboarding]}
            </DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
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
                  {selectedContract.content}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 签署确认对话框 */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>签署合同</DialogTitle>
            <DialogDescription>
              请仔细阅读合同内容后确认签署
            </DialogDescription>
          </DialogHeader>
          {selectedContract && (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="font-medium">合同类型：</span>
                <span className="ml-2">{contractTypeNames[selectedContract.type]}</span>
              </div>
              <div className="border rounded-md p-4 max-h-64 overflow-y-auto">
                <h4 className="font-medium mb-2 text-sm">合同内容</h4>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {selectedContract.content}
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                <strong>注意：</strong>签署后合同将生效，此操作无法撤销。
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSign} disabled={isSigning}>
              {isSigning ? '签署中...' : '确认签署'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
