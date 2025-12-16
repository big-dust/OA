import api from './api';
import type { Salary } from '@/types';

export interface CreateSalaryRequest {
  employee_id: number;
  month: string;
  base_salary: number;
  bonus: number;
  deduction: number;
}

export interface SalaryFilter {
  employee_id?: number;
  month?: string;
}

export const salaryService = {
  // 创建工资记录（财务）
  create: async (data: CreateSalaryRequest): Promise<Salary> => {
    const response = await api.post<Salary>('/salaries', data);
    return response.data;
  },

  // 获取工资记录列表（财务）
  getList: async (filter?: SalaryFilter): Promise<Salary[]> => {
    const response = await api.get<Salary[]>('/salaries', { params: filter });
    return response.data;
  },

  // 获取我的工资记录
  getMy: async (): Promise<Salary[]> => {
    const response = await api.get<Salary[]>('/salaries/my');
    return response.data;
  },

  // 获取工资详情
  getById: async (id: number): Promise<Salary> => {
    const response = await api.get<Salary>(`/salaries/${id}`);
    return response.data;
  },
};
