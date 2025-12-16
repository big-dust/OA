import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { RoleType } from '@/types';
import { Role } from '@/types';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleType[];
}

// 角色权限映射 - 定义每个角色拥有的权限
const rolePermissions: Record<RoleType, RoleType[]> = {
  [Role.SuperAdmin]: [Role.SuperAdmin, Role.HR, Role.Finance, Role.DeviceAdmin, Role.Supervisor, Role.Employee],
  [Role.HR]: [Role.HR, Role.Employee],
  [Role.Finance]: [Role.Finance, Role.Employee],
  [Role.DeviceAdmin]: [Role.DeviceAdmin, Role.Employee],
  [Role.Supervisor]: [Role.Supervisor, Role.Employee],
  [Role.Employee]: [Role.Employee],
};

// 检查用户是否有权限访问
function hasPermission(userRole: RoleType, allowedRoles: RoleType[]): boolean {
  // 如果没有指定允许的角色，则所有已登录用户都可以访问
  if (allowedRoles.length === 0) {
    return true;
  }
  
  // 获取用户角色拥有的所有权限
  const userPermissions = rolePermissions[userRole] || [Role.Employee];
  
  // 检查用户是否拥有任一允许的角色权限
  return allowedRoles.some(role => userPermissions.includes(role));
}

export default function PrivateRoute({ children, allowedRoles = [] }: PrivateRouteProps) {
  const { isAuthenticated, employee } = useAuthStore();
  const location = useLocation();

  // 未登录，重定向到登录页
  if (!isAuthenticated || !employee) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 首次登录需要修改密码，重定向到修改密码页面
  // 但如果当前已经在修改密码页面，则不重定向
  if (employee.is_first_login && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // 检查角色权限
  if (allowedRoles.length > 0 && !hasPermission(employee.role, allowedRoles)) {
    // 无权限访问，重定向到仪表盘
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
