import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Calendar, ArrowLeft } from 'lucide-react';
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
import { leaveService } from '@/services/leave';
import { LeaveType } from '@/types';
import type { LeaveTypeValue } from '@/types';

// 请假类型选项
const leaveTypeOptions: { value: LeaveTypeValue; label: string }[] = [
  { value: LeaveType.Annual, label: '年假' },
  { value: LeaveType.Sick, label: '病假' },
  { value: LeaveType.Personal, label: '事假' },
  { value: LeaveType.Marriage, label: '婚假' },
  { value: LeaveType.Maternity, label: '产假' },
  { value: LeaveType.Bereavement, label: '丧假' },
];

export default function LeaveForm() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: '' as LeaveTypeValue | '',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.leave_type) {
      newErrors.leave_type = '请选择请假类型';
    }
    if (!formData.start_date) {
      newErrors.start_date = '请选择开始日期';
    }
    if (!formData.end_date) {
      newErrors.end_date = '请选择结束日期';
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = '结束日期不能早于开始日期';
    }
    if (!formData.reason.trim()) {
      newErrors.reason = '请填写请假原因';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await leaveService.create({
        leave_type: formData.leave_type as LeaveTypeValue,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason.trim(),
      });
      toast.success('请假申请已提交');
      navigate('/leaves');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || '提交失败';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/leaves')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Calendar className="w-5 h-5 text-primary" />
            <CardTitle>申请请假</CardTitle>
          </div>
          <CardDescription>填写请假信息并提交申请</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 请假类型 */}
            <div className="space-y-2">
              <Label htmlFor="leave_type">请假类型 *</Label>
              <Select
                value={formData.leave_type}
                onValueChange={(value) => setFormData({ ...formData, leave_type: value as LeaveTypeValue })}
              >
                <SelectTrigger id="leave_type" className={errors.leave_type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="请选择请假类型" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.leave_type && <p className="text-sm text-red-500">{errors.leave_type}</p>}
            </div>

            {/* 开始日期 */}
            <div className="space-y-2">
              <Label htmlFor="start_date">开始日期 *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className={errors.start_date ? 'border-red-500' : ''}
              />
              {errors.start_date && <p className="text-sm text-red-500">{errors.start_date}</p>}
            </div>

            {/* 结束日期 */}
            <div className="space-y-2">
              <Label htmlFor="end_date">结束日期 *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className={errors.end_date ? 'border-red-500' : ''}
              />
              {errors.end_date && <p className="text-sm text-red-500">{errors.end_date}</p>}
            </div>

            {/* 请假原因 */}
            <div className="space-y-2">
              <Label htmlFor="reason">请假原因 *</Label>
              <textarea
                id="reason"
                rows={4}
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="请详细说明请假原因"
                className={`w-full px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.reason ? 'border-red-500' : 'border-input'
                }`}
              />
              {errors.reason && <p className="text-sm text-red-500">{errors.reason}</p>}
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/leaves')}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '提交中...' : '提交申请'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
