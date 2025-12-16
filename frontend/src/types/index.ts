// 角色
export const Role = {
  SuperAdmin: 'super_admin',
  HR: 'hr',
  Finance: 'finance',
  DeviceAdmin: 'device_admin',
  Supervisor: 'supervisor',
  Employee: 'employee',
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

// 请假类型
export const LeaveType = {
  Annual: 'annual',
  Sick: 'sick',
  Personal: 'personal',
  Marriage: 'marriage',
  Maternity: 'maternity',
  Bereavement: 'bereavement',
} as const;

export type LeaveTypeValue = (typeof LeaveType)[keyof typeof LeaveType];

// 请假状态
export const LeaveStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
  Cancelled: 'cancelled',
} as const;

export type LeaveStatusValue = (typeof LeaveStatus)[keyof typeof LeaveStatus];

// 设备申请状态
export const DeviceRequestStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
  Collected: 'collected',
  ReturnPending: 'return_pending',
  Returned: 'returned',
  Cancelled: 'cancelled',
} as const;

export type DeviceRequestStatusValue = (typeof DeviceRequestStatus)[keyof typeof DeviceRequestStatus];

// 会议室预定状态
export const BookingStatus = {
  Active: 'active',
  Completed: 'completed',
  Cancelled: 'cancelled',
} as const;

export type BookingStatusValue = (typeof BookingStatus)[keyof typeof BookingStatus];


// 合同类型
export const ContractType = {
  Onboarding: 'onboarding',
  Offboarding: 'offboarding',
} as const;

export type ContractTypeValue = (typeof ContractType)[keyof typeof ContractType];

// 合同状态
export const ContractStatus = {
  Pending: 'pending',
  Signed: 'signed',
} as const;

export type ContractStatusValue = (typeof ContractStatus)[keyof typeof ContractStatus];

// 员工
export interface Employee {
  id: number;
  username: string;
  employee_no: string;
  name: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  hire_date: string;
  supervisor_id: number | null;
  supervisor?: Employee;
  role: RoleType;
  is_first_login: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 考勤记录
export interface Attendance {
  id: number;
  employee_id: number;
  date: string;
  sign_in_time: string | null;
  sign_out_time: string | null;
}

// 请假申请
export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee?: Employee;
  leave_type: LeaveTypeValue;
  start_date: string;
  end_date: string;
  reason: string;
  status: LeaveStatusValue;
  reject_reason: string;
  created_at: string;
  updated_at: string;
}

// 设备
export interface Device {
  id: number;
  name: string;
  type: string;
  total_quantity: number;
  available_quantity: number;
  description: string;
  created_at: string;
  updated_at: string;
}

// 设备申请
export interface DeviceRequest {
  id: number;
  employee_id: number;
  employee?: Employee;
  device_id: number;
  device?: Device;
  status: DeviceRequestStatusValue;
  reject_reason: string;
  created_at: string;
  updated_at: string;
}

// 会议室
export interface MeetingRoom {
  id: number;
  name: string;
  capacity: number;
  location: string;
  created_at: string;
}

// 会议室预定
export interface MeetingRoomBooking {
  id: number;
  employee_id: number;
  employee?: Employee;
  meeting_room_id: number;
  meeting_room?: MeetingRoom;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatusValue;
  created_at: string;
}

// 合同模板
export interface ContractTemplate {
  id: number;
  type: ContractTypeValue;
  title: string;
  content: string;
  created_at: string;
}

// 合同
export interface Contract {
  id: number;
  employee_id: number;
  employee?: Employee;
  template_id: number;
  template?: ContractTemplate;
  type: ContractTypeValue;
  content: string;
  status: ContractStatusValue;
  signed_at: string | null;
  created_at: string;
}

// 工资
export interface Salary {
  id: number;
  employee_id: number;
  employee?: Employee;
  month: string;
  base_salary: number;
  bonus: number;
  deduction: number;
  net_salary: number;
  created_at: string;
}

// 通知
export interface Notification {
  id: number;
  employee_id: number;
  type: string;
  title: string;
  content: string;
  related_type: string;
  related_id: number;
  is_read: boolean;
  created_at: string;
}

// API 响应
export interface ApiResponse<T> {
  code: string;
  message: string;
  data?: T;
  details?: unknown;
}

// 登录请求
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应
export interface LoginResponse {
  token: string;
  employee: Employee;
}

// 修改密码请求
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
