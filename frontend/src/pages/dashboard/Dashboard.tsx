import { Link } from 'react-router-dom';
import {
  User,
  Clock,
  Calendar,
  Laptop,
  DoorOpen,
  FileText,
  DollarSign,
  Users,
  ClipboardCheck,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { Role } from '@/types';
import type { RoleType } from '@/types';

interface QuickAction {
  path: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  roles?: RoleType[]; // 如果未指定，则所有角色都可见
  color: string;
}

// 快捷操作配置
const quickActions: QuickAction[] = [
  {
    path: '/profile',
    label: '个人信息',
    description: '查看和编辑个人资料',
    icon: <User className="w-6 h-6" />,
    color: 'bg-blue-500',
  },
  {
    path: '/attendance',
    label: '考勤签到',
    description: '每日签到签退',
    icon: <Clock className="w-6 h-6" />,
    color: 'bg-green-500',
  },
  {
    path: '/leaves',
    label: '请假管理',
    description: '申请请假和查看记录',
    icon: <Calendar className="w-6 h-6" />,
    color: 'bg-orange-500',
  },
  {
    path: '/leave-approval',
    label: '请假审批',
    description: '审批下属请假申请',
    icon: <ClipboardCheck className="w-6 h-6" />,
    roles: [Role.Supervisor, Role.SuperAdmin],
    color: 'bg-purple-500',
  },
  {
    path: '/devices',
    label: '设备列表',
    description: '查看可用设备',
    icon: <Laptop className="w-6 h-6" />,
    color: 'bg-cyan-500',
  },
  {
    path: '/device-requests',
    label: '我的设备申请',
    description: '查看设备申请记录',
    icon: <Laptop className="w-6 h-6" />,
    color: 'bg-teal-500',
  },
  {
    path: '/device-approval',
    label: '设备审批',
    description: '审批设备申请',
    icon: <Settings className="w-6 h-6" />,
    roles: [Role.DeviceAdmin, Role.SuperAdmin],
    color: 'bg-indigo-500',
  },
  {
    path: '/meeting-rooms',
    label: '会议室预定',
    description: '预定会议室',
    icon: <DoorOpen className="w-6 h-6" />,
    color: 'bg-pink-500',
  },
  {
    path: '/meeting-room-bookings',
    label: '我的预定',
    description: '查看会议室预定记录',
    icon: <DoorOpen className="w-6 h-6" />,
    color: 'bg-rose-500',
  },
  {
    path: '/my-contracts',
    label: '我的合同',
    description: '查看和签署合同',
    icon: <FileText className="w-6 h-6" />,
    color: 'bg-amber-500',
  },
  {
    path: '/contracts',
    label: '合同管理',
    description: '管理员工合同',
    icon: <FileText className="w-6 h-6" />,
    roles: [Role.HR, Role.SuperAdmin],
    color: 'bg-yellow-500',
  },
  {
    path: '/my-salary',
    label: '我的工资',
    description: '查看工资明细',
    icon: <DollarSign className="w-6 h-6" />,
    color: 'bg-emerald-500',
  },
  {
    path: '/salaries',
    label: '工资管理',
    description: '管理员工工资',
    icon: <DollarSign className="w-6 h-6" />,
    roles: [Role.Finance, Role.SuperAdmin],
    color: 'bg-lime-500',
  },
  {
    path: '/employees',
    label: '员工管理',
    description: '管理员工信息',
    icon: <Users className="w-6 h-6" />,
    roles: [Role.HR, Role.SuperAdmin],
    color: 'bg-violet-500',
  },
];

// 角色显示名称
const roleNames: Record<RoleType, string> = {
  [Role.SuperAdmin]: '超级管理员',
  [Role.HR]: 'HR',
  [Role.Finance]: '财务',
  [Role.DeviceAdmin]: '设备管理员',
  [Role.Supervisor]: '主管',
  [Role.Employee]: '员工',
};

export default function Dashboard() {
  const { employee } = useAuthStore();

  // 根据用户角色过滤快捷操作
  const filteredActions = quickActions.filter((action) => {
    if (!action.roles) return true;
    if (!employee) return false;
    // 超级管理员可以看到所有操作
    if (employee.role === Role.SuperAdmin) return true;
    return action.roles.includes(employee.role);
  });

  return (
    <div className="space-y-6">
      {/* 欢迎区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            欢迎回来，{employee?.name || '用户'}！
          </CardTitle>
          <CardDescription>
            {employee && (
              <span>
                {roleNames[employee.role]} · {employee.department} · {employee.position}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            这是您的 OA 系统仪表盘，您可以通过下方的快捷入口快速访问常用功能。
          </p>
        </CardContent>
      </Card>

      {/* 快捷操作区域 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredActions.map((action) => (
            <Link key={action.path} to={action.path}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${action.color} text-white`}>
                      {action.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{action.label}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
