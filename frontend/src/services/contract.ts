import api from './api';
import type { Contract, ContractTemplate, ContractTypeValue } from '@/types';

export interface CreateContractRequest {
  employee_id: number;
  template_id: number;
  type: ContractTypeValue;
}

export const contractTemplateService = {
  // 获取合同模板列表
  getList: async (): Promise<ContractTemplate[]> => {
    const response = await api.get<ContractTemplate[]>('/contract-templates');
    return response.data;
  },
};

export const contractService = {
  // 创建合同
  create: async (data: CreateContractRequest): Promise<Contract> => {
    const response = await api.post<Contract>('/contracts', data);
    return response.data;
  },

  // 获取合同列表（HR）
  getList: async (): Promise<Contract[]> => {
    const response = await api.get<Contract[]>('/contracts');
    return response.data;
  },

  // 获取合同详情
  getById: async (id: number): Promise<Contract> => {
    const response = await api.get<Contract>(`/contracts/${id}`);
    return response.data;
  },

  // 获取我的合同
  getMy: async (): Promise<Contract[]> => {
    const response = await api.get<Contract[]>('/contracts/my');
    return response.data;
  },

  // 签署合同
  sign: async (id: number): Promise<Contract> => {
    const response = await api.put<Contract>(`/contracts/${id}/sign`);
    return response.data;
  },
};
