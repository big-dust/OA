import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  User, 
  Clock, 
  Calendar, 
  Laptop, 
  DoorOpen, 
  FileText, 
  DollarSign, 
  Users,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { Role } from '@/types';
import type { RoleType } from '@/types';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: RoleType[]; // 如果未指定，则所有角色都可见
}

// 菜单配置
const menuItems: MenuItem[] = [
  { path: '/dashboard', label: '首页', icon: <Home className="w-5 h-5" /> },
  { path: '/profile', label: '个人信息', icon: <User className="w-5 h-5" /> },
  { path: '/attendance', label: '考勤签到', icon: <Clock className="w-5 h-5" /> },
  { path: '/leaves', label: '请假管理', icon: <Calendar className="w-5 h-5" /> },
  { path: '/leave-approval', label: '请假审批', icon: <Calendar className="w-5 h-5" />, roles: [Role.Supervisor, Role.SuperAdmin] },
  { path: '/devices', label: '设备列表', icon: <Laptop className="w-5 h-5" /> },
  { path: '/device-requests', label: '我的设备申请', icon: <Laptop className="w-5 h-5" /> },
  { path: '/device-approval', label: '设备审批', icon: <Laptop className="w-5 h-5" />, roles: [Role.DeviceAdmin, Role.SuperAdmin] },
  { path: '/meeting-rooms', label: '会议室预定', icon: <DoorOpen className="w-5 h-5" /> },
  { path: '/contracts', label: '合同管理', icon: <FileText className="w-5 h-5" />, roles: [Role.HR, Role.SuperAdmin] },
  { path: '/my-contracts', label: '我的合同', icon: <FileText className="w-5 h-5" /> },
  { path: '/salaries', label: '工资管理', icon: <DollarSign className="w-5 h-5" />, roles: [Role.Finance, Role.SuperAdmin] },
  { path: '/my-salary', label: '我的工资', icon: <DollarSign className="w-5 h-5" /> },
  { path: '/employees', label: '员工管理', icon: <Users className="w-5 h-5" />, roles: [Role.HR, Role.SuperAdmin] },
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

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { employee, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 根据用户角色过滤菜单
  const filteredMenuItems = menuItems.filter(item => {
    if (!item.roles) return true;
    if (!employee) return false;
    // 超级管理员可以看到所有菜单
    if (employee.role === Role.SuperAdmin) return true;
    return item.roles.includes(employee.role);
  });

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 移动端顶部导航 */}
      <div className="lg:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
          <Menu className="w-6 h-6" />
        </Button>
        <span className="font-semibold">OA 系统</span>
        <div className="w-10" />
      </div>

      {/* 移动端侧边栏遮罩 */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white border-r transform transition-transform duration-200
        lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b flex items-center justify-between">
            <h1 className="text-xl font-bold text-primary">OA 系统</h1>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* 用户信息 */}
          {employee && (
            <div className="p-4 border-b">
              <div className="font-medium">{employee.name}</div>
              <div className="text-sm text-muted-foreground">
                {roleNames[employee.role]} · {employee.department}
              </div>
            </div>
          )}

          {/* 导航菜单 */}
          <nav className="flex-1 overflow-y-auto p-2">
            {filteredMenuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md mb-1 transition-colors
                  ${isActive(item.path) 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-gray-100 text-gray-700'}
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* 底部操作 */}
          <div className="p-4 border-t">
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              退出登录
            </Button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
