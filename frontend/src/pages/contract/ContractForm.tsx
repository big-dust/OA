import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileText, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { contractService, contractTemplateService } from '@/services/contract';
import { employeeService } from '@/services/employee';
import { ContractType } from '@/types';
import type { ContractTemplate, Employee, ContractTypeValue } from '@/types';

// 合同类型显示名称
const contractTypeNames: Record<ContractTypeValue, string> = {
  [ContractType.Onboarding]: '入职合同',
  [ContractType.Offboarding]: '离职合同',
};

export default function ContractForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    template_id: '',
    type: '' as ContractTypeValue | '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 加载模板和员工列表
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [templatesData, employeesData] = await Promise.all([
          contractTemplateService.getList(),
          employeeService.getList(),
        ]);
        setTemplates(templatesData);
        setEmployees(employeesData);
      } catch {
        toast.error('加载数据失败');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // 当选择模板时，自动设置合同类型
  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id.toString() === templateId);
    setFormData({
      ...formData,
      template_id: templateId,
      type: template?.type || '',
    });
  };

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_id) {
      newErrors.employee_id = '请选择员工';
    }
    if (!formData.template_id) {
      newErrors.template_id = '请选择合同模板';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const template = templates.find((t) => t.id.toString() === formData.template_id);
    if (!template) {
      toast.error('请选择有效的合同模板');
      return;
    }

    setIsSubmitting(true);
    try {
      await contractService.create({
        employee_id: parseInt(formData.employee_id),
        template_id: parseInt(formData.template_id),
        type: template.type,
      });
      toast.success('合同创建成功');
      navigate('/contracts');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '创建失败';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 获取选中的模板
  const selectedTemplate = templates.find((t) => t.id.toString() === formData.template_id);

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
            <Button variant="ghost" size="icon" onClick={() => navigate('/contracts')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <FileText className="w-5 h-5 text-primary" />
            <CardTitle>创建合同</CardTitle>
          </div>
          <CardDescription>选择员工和合同模板创建新合同</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 选择员工 */}
            <div className="space-y-2">
              <Label htmlFor="employee_id">员工 *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
              >
                <SelectTrigger id="employee_id" className={errors.employee_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="请选择员工" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.name} ({employee.employee_no}) - {employee.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.employee_id && <p className="text-sm text-red-500">{errors.employee_id}</p>}
            </div>

            {/* 选择合同模板 */}
            <div className="space-y-2">
              <Label htmlFor="template_id">合同模板 *</Label>
              <Select
                value={formData.template_id}
                onValueChange={handleTemplateChange}
              >
                <SelectTrigger id="template_id" className={errors.template_id ? 'border-red-500' : ''}>
                  <SelectValue placeholder="请选择合同模板" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.title} ({contractTypeNames[template.type]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.template_id && <p className="text-sm text-red-500">{errors.template_id}</p>}
            </div>

            {/* 显示合同类型 */}
            {selectedTemplate && (
              <div className="space-y-2">
                <Label>合同类型</Label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {contractTypeNames[selectedTemplate.type]}
                </div>
              </div>
            )}

            {/* 预览合同模板内容 */}
            {selectedTemplate && (
              <div className="space-y-2">
                <Label>模板内容预览</Label>
                <div className="p-4 bg-muted rounded-md whitespace-pre-wrap text-sm max-h-64 overflow-y-auto">
                  {selectedTemplate.content}
                </div>
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/contracts')}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '创建中...' : '创建合同'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
