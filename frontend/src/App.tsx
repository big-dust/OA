import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Login from '@/pages/auth/Login';
import ChangePassword from '@/pages/auth/ChangePassword';
import Layout from '@/components/Layout';
import PrivateRoute from '@/components/PrivateRoute';
import Dashboard from '@/pages/dashboard/Dashboard';
import Profile from '@/pages/employee/Profile';
import EmployeeList from '@/pages/employee/EmployeeList';
import EmployeeForm from '@/pages/employee/EmployeeForm';
import Attendance from '@/pages/attendance/Attendance';
import LeaveList from '@/pages/leave/LeaveList';
import LeaveForm from '@/pages/leave/LeaveForm';
import LeaveApproval from '@/pages/leave/LeaveApproval';
import DeviceList from '@/pages/device/DeviceList';
import DeviceForm from '@/pages/device/DeviceForm';
import DeviceRequest from '@/pages/device/DeviceRequest';
import DeviceApproval from '@/pages/device/DeviceApproval';
import MeetingRoomList from '@/pages/meeting-room/MeetingRoomList';
import MeetingRoomForm from '@/pages/meeting-room/MeetingRoomForm';
import BookingCalendar from '@/pages/meeting-room/BookingCalendar';
import MyBookings from '@/pages/meeting-room/MyBookings';
import ContractList from '@/pages/contract/ContractList';
import ContractForm from '@/pages/contract/ContractForm';
import MyContracts from '@/pages/contract/MyContracts';
import SalaryList from '@/pages/salary/SalaryList';
import SalaryForm from '@/pages/salary/SalaryForm';
import MySalary from '@/pages/salary/MySalary';
import { Role } from '@/types';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公开路由 */}
        <Route path="/login" element={<Login />} />
        
        {/* 修改密码路由 - 需要登录但不检查首次登录 */}
        <Route 
          path="/change-password" 
          element={
            <PrivateRoute>
              <ChangePassword />
            </PrivateRoute>
          } 
        />
        
        {/* 受保护的路由 */}
        <Route 
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          {/* 仪表盘 - 所有已登录用户可访问 */}
          <Route path="/dashboard" element={<Dashboard />} />
          
          {/* 个人信息 - 所有已登录用户可访问 (需求 12.1) */}
          <Route path="/profile" element={<Profile />} />
          
          {/* 考勤 - 所有已登录用户可访问 (需求 12.1) */}
          <Route path="/attendance" element={<Attendance />} />
          
          {/* 请假管理 - 所有已登录用户可访问 (需求 12.1) */}
          <Route path="/leaves" element={<LeaveList />} />
          <Route path="/leaves/new" element={<LeaveForm />} />
          
          {/* 请假审批 - 主管和超级管理员可访问 (需求 12.6) */}
          <Route 
            path="/leave-approval" 
            element={
              <PrivateRoute allowedRoles={[Role.Supervisor, Role.SuperAdmin]}>
                <LeaveApproval />
              </PrivateRoute>
            } 
          />
          
          {/* 员工管理 - HR和超级管理员可访问 (需求 12.2, 12.3) */}
          <Route 
            path="/employees" 
            element={
              <PrivateRoute allowedRoles={[Role.HR, Role.SuperAdmin]}>
                <EmployeeList />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/employees/new" 
            element={
              <PrivateRoute allowedRoles={[Role.HR, Role.SuperAdmin]}>
                <EmployeeForm />
              </PrivateRoute>
            } 
          />
          
          {/* 设备列表 - 所有已登录用户可访问 (需求 12.1) */}
          <Route path="/devices" element={<DeviceList />} />
          
          {/* 设备管理 - 设备管理员和超级管理员可访问 (需求 12.5) */}
          <Route 
            path="/devices/new" 
            element={
              <PrivateRoute allowedRoles={[Role.DeviceAdmin, Role.SuperAdmin]}>
                <DeviceForm />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/devices/:id/edit" 
            element={
              <PrivateRoute allowedRoles={[Role.DeviceAdmin, Role.SuperAdmin]}>
                <DeviceForm />
              </PrivateRoute>
            } 
          />
          
          {/* 设备申请 - 所有已登录用户可访问 (需求 12.1) */}
          <Route path="/device-requests" element={<DeviceRequest />} />
          
          {/* 设备审批 - 设备管理员和超级管理员可访问 (需求 12.5) */}
          <Route 
            path="/device-approval" 
            element={
              <PrivateRoute allowedRoles={[Role.DeviceAdmin, Role.SuperAdmin]}>
                <DeviceApproval />
              </PrivateRoute>
            } 
          />
          
          {/* 会议室列表和预定 - 所有已登录用户可访问 (需求 12.1) */}
          <Route path="/meeting-rooms" element={<MeetingRoomList />} />
          <Route path="/meeting-rooms/:id/book" element={<BookingCalendar />} />
          <Route path="/meeting-room-bookings" element={<MyBookings />} />
          
          {/* 会议室管理 - 超级管理员可访问 (需求 12.2) */}
          <Route 
            path="/meeting-rooms/new" 
            element={
              <PrivateRoute allowedRoles={[Role.SuperAdmin]}>
                <MeetingRoomForm />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/meeting-rooms/:id/edit" 
            element={
              <PrivateRoute allowedRoles={[Role.SuperAdmin]}>
                <MeetingRoomForm />
              </PrivateRoute>
            } 
          />
          
          {/* 合同管理 - HR和超级管理员可访问 (需求 12.3) */}
          <Route 
            path="/contracts" 
            element={
              <PrivateRoute allowedRoles={[Role.HR, Role.SuperAdmin]}>
                <ContractList />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/contracts/new" 
            element={
              <PrivateRoute allowedRoles={[Role.HR, Role.SuperAdmin]}>
                <ContractForm />
              </PrivateRoute>
            } 
          />
          
          {/* 我的合同 - 所有已登录用户可访问 (需求 12.1) */}
          <Route path="/my-contracts" element={<MyContracts />} />
          
          {/* 工资管理 - 财务和超级管理员可访问 (需求 12.4) */}
          <Route 
            path="/salaries" 
            element={
              <PrivateRoute allowedRoles={[Role.Finance, Role.SuperAdmin]}>
                <SalaryList />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/salaries/new" 
            element={
              <PrivateRoute allowedRoles={[Role.Finance, Role.SuperAdmin]}>
                <SalaryForm />
              </PrivateRoute>
            } 
          />
          
          {/* 我的工资 - 所有已登录用户可访问 (需求 12.1) */}
          <Route path="/my-salary" element={<MySalary />} />
        </Route>
        
        {/* 默认重定向 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
