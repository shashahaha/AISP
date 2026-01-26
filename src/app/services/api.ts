// API 服务配置
import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '../stores/authStore';

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API 响应类型定义
export interface ChatStartResponse {
  session_id: string;
  message: string;
  case_info: any;
  is_new_session: boolean;
}

export interface ChatMessageResponse {
  session_id: string;
  response: string;
  metadata?: any;
  turn_count: number;
}

export interface Case {
  id: number;
  case_id: string;
  title: string;
  description?: string;
  difficulty: string;
  category: string;
  patient_info: Record<string, any>;
  chief_complaint: Record<string, any>;
  symptoms: Record<string, any>;
  standard_diagnosis: string;
  differential_diagnosis?: string[];
  key_questions?: string[];
  is_active: number;
  created_at?: string;
}

export interface SessionScoreResponse {
  session_id: string;
  completed_at: string;
  scores: {
    inquiry: {
      total: number;
      symptom_inquiry: number;
      inquiry_logic: number;
      medical_etiquette: number;
      coverage_rate: number;
      covered: string[];
      missed: string[];
    };
    diagnosis: {
      total: number;
      accuracy: string;
      differential_count: number;
      reasoning: number;
    };
    communication: {
      total: number;
      turn_count: number;
      polite_rate: number;
      empathy: number;
    };
    total: number;
  };
  grade: string;
  passed: boolean;
  ai_comments: string;
  suggestions: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
  }>;
}

// 认证接口
export const authAPI = {
  login: async (username: string, password: string) => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    const response = await apiClient.post('/api/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  },

  register: async (username: string, password: string, email: string, role: string) => {
    const response = await apiClient.post('/api/auth/register', null, {
      params: { username, password, email, role }
    });
    return response.data;
  },

  getCurrentUser: async (token: string) => {
    const response = await apiClient.get('/api/auth/me', {
      params: { token }
    });
    return response.data;
  },
};

// 病例接口
export const casesAPI = {
  list: async (filters?: { category?: string; difficulty?: string; is_active?: boolean }): Promise<Case[]> => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());

    const response = await apiClient.get(`/api/cases?${params}`);
    return response.data;
  },

  get: async (caseId: string): Promise<Case> => {
    const response = await apiClient.get(`/api/cases/${caseId}`);
    return response.data;
  },

  create: async (caseData: {
    case_id: string;
    title: string;
    description?: string;
    difficulty?: string;
    category?: string;
    patient_info: Record<string, any>;
    chief_complaint: Record<string, any>;
    symptoms: Record<string, any>;
    standard_diagnosis: string;
    differential_diagnosis?: string[];
    key_questions?: string[];
  }): Promise<Case> => {
    const response = await apiClient.post('/api/cases', caseData);
    return response.data;
  },

  update: async (caseId: string, caseData: Partial<Case>): Promise<Case> => {
    const response = await apiClient.put(`/api/cases/${caseId}`, caseData);
    return response.data;
  },

  delete: async (caseId: string): Promise<void> => {
    await apiClient.delete(`/api/cases/${caseId}`);
  },

  getCategories: async (): Promise<string[]> => {
    const response = await apiClient.get('/api/cases/categories/list');
    return response.data;
  },
};

// 对话接口（保留原有的 AISPApiClient 类，但内部使用 apiClient）
export class AISPApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = apiClient;
  }

  // 开始新的问诊会话
  async startChatSession(caseId: string): Promise<ChatStartResponse> {
    const response = await this.client.post('/api/chat/start', {
      case_id: caseId,
      message: ''
    });
    return response.data;
  }

  // 发送问诊消息
  async sendMessage(
    sessionId: string,
    caseId: string,
    message: string
  ): Promise<ChatMessageResponse> {
    const response = await this.client.post('/api/chat/message', {
      session_id: sessionId,
      case_id: caseId,
      message: message
    });
    return response.data;
  }

  // 结束会话并提交诊断
  async endSession(
    sessionId: string,
    diagnosis: string,
    reasoning?: string
  ): Promise<SessionScoreResponse> {
    const response = await this.client.post('/api/chat/end', {
      session_id: sessionId,
      diagnosis: diagnosis,
      reasoning: reasoning
    });
    return response.data;
  }

  // 获取会话详情
  async getSession(sessionId: string): Promise<any> {
    const response = await this.client.get(`/api/chat/session/${sessionId}`);
    return response.data;
  }

  // 获取会话列表
  async listSessions(status?: string, limit: number = 50): Promise<any[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());

    const response = await this.client.get(`/api/chat/sessions?${params}`);
    return response.data;
  }

  // 健康检查
  async healthCheck(): Promise<{
    status: string;
    service: string;
    version: string;
  }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// 导出单例实例
export const apiClientInstance = new AISPApiClient();

// 导出原始 axios 实例供直接使用
export { apiClient };
