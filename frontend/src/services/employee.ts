import api from './api';
import type { Employee, RoleType } from '@/types';

export interface CreateEmployeeRequest {
  name: string;
  department: string;
  position: string;
  phone: string;
  email: string;
  supervisor_id?: number;
  role: RoleType;
}

export interface UpdateEmployeeRequest {
  name?: string;
  phone?: string;
  email?: string;
}

export interface CreateEmployeeResponse {
  employee: Employee;
  initial_password: string;
}

export const employeeService = {
  // 获取员工列表
  getList: async (): Promise<Employee[]> => {
    const response = await api.get<Employee[]>('/employees');
    return response.data;
  },

  // 获取员工详情
  getById: async (id: number): Promise<Employee> => {
    const response = await api.get<Employee>(`/employees/${id}`);
    return response.data;
  },

  // 创建员工
  create: async (data: CreateEmployeeRequest): Promise<CreateEmployeeResponse> => {
    const response = await api.post<CreateEmployeeResponse>('/employees', data);
    return response.data;
  },

  // 更新员工信息
  update: async (id: number, data: UpdateEmployeeRequest): Promise<Employee> => {
    const response = await api.put<Employee>(`/employees/${id}`, data);
    return response.data;
  },

  // 修改员工角色
  updateRole: async (id: number, role: RoleType): Promise<Employee> => {
    const response = await api.put<Employee>(`/employees/${id}/role`, { role });
    return response.data;
  },

  // 修改直属主管
  updateSupervisor: async (id: number, supervisorId: number | null): Promise<Employee> => {
    const response = await api.put<Employee>(`/employees/${id}/supervisor`, {
      supervisor_id: supervisorId,
    });
    return response.data;
  },

  // 启用/禁用账号
  updateStatus: async (id: number, isActive: boolean): Promise<Employee> => {
    const response = await api.put<Employee>(`/employees/${id}/status`, {
      is_active: isActive,
    });
    return response.data;
  },

  // 获取当前用户信息
  getMe: async (): Promise<Employee> => {
    const response = await api.get<Employee>('/employees/me');
    return response.data;
  },
};
