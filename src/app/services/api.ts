// API 服务配置
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// API 响应类型定义
export interface ChatStartResponse {
  session_id: string;
  message: string;
  case_info: any;
  is_new_session: boolean;
}

export interface ChatMessageRequest {
  session_id: string;
  case_id: string;
  message: string;
}

export interface ChatMessageResponse {
  session_id: string;
  response: string;
  metadata?: any;
  turn_count: number;
}

export interface DiagnosisSubmitRequest {
  session_id: string;
  diagnosis: string;
  reasoning?: string;
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

// API 客户端类
export class AISPApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          detail: response.statusText,
        }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Unknown error occurred");
    }
  }

  // 开始新的问诊会话
  async startChatSession(caseId: string): Promise<ChatStartResponse> {
    return this.request<ChatStartResponse>("/api/chat/start", {
      method: "POST",
      body: JSON.stringify({ case_id: caseId, message: "" }),
    });
  }

  // 发送问诊消息
  async sendMessage(
    sessionId: string,
    caseId: string,
    message: string,
  ): Promise<ChatMessageResponse> {
    return this.request<ChatMessageResponse>("/api/chat/message", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        case_id: caseId,
        message: message,
      }),
    });
  }

  // 结束会话并提交诊断
  async endSession(
    sessionId: string,
    diagnosis: string,
    reasoning?: string,
  ): Promise<SessionScoreResponse> {
    return this.request<SessionScoreResponse>("/api/chat/end", {
      method: "POST",
      body: JSON.stringify({
        session_id: sessionId,
        diagnosis: diagnosis,
        reasoning: reasoning,
      }),
    });
  }

  // 获取会话详情
  async getSession(sessionId: string): Promise<any> {
    return this.request<any>(`/api/chat/session/${sessionId}`);
  }

  // 获取会话列表
  async listSessions(status?: string, limit: number = 50): Promise<any[]> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (limit) params.append("limit", limit.toString());

    const endpoint = `/api/chat/sessions${params.toString() ? `?${params}` : ""}`;
    return this.request<any[]>(endpoint);
  }

  // 健康检查
  async healthCheck(): Promise<{
    status: string;
    service: string;
    version: string;
  }> {
    return this.request<{ status: string; service: string; version: string }>(
      "/health",
    );
  }
}

// 导出单例实例
export const apiClient = new AISPApiClient();
