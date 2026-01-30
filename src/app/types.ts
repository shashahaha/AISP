// 用户类型定义
export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  name: string;
  email: string;
  avatar?: string;
  department?: string;
  studentId?: string;
  teacherId?: string;
}

// 病例库类型
export interface CaseItem {
  id: string;
  name: string;
  department: string; // 科室
  disease: string; // 疾病
  population: string; // 人群（儿童、成人、老年）
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  symptoms: string[];
  diagnosis: string;
  treatment: string[];
  aisp: {
    avatar: string;
    name: string;
    age: number;
    gender: string;
    personality: string;
    digitalHumanUrl?: string;
    voiceProfile?: string;
  };
  creatorId?: string; // 创建者ID（教师）
  creatorName?: string; // 创建者姓名
  status: 'draft' | 'pending' | 'approved' | 'rejected'; // 草稿、待审核、已批准、已拒绝
  createdAt: Date;
  approvedAt?: Date;
}

// 对话消息
export interface ChatMessage {
  id: string;
  role: 'user' | 'aisp';
  content: string;
  type?: 'text' | 'audio'; // 消息类型
  audioUrl?: string; // 真实录音文件的 URL (Blob URL)
  duration?: number; // 语音时长(秒)
  timestamp: Date;
}

// 评分结果
export interface EvaluationResult {
  id: string;
  studentId: string;
  caseId: string;
  score: number;
  communicationScore: number;
  diagnosisScore: number;
  treatmentScore: number;
  feedback: string;
  timestamp: Date;
  duration: number; // 分钟
  messages?: ChatMessage[]; // 对话历史记录
}

// 课程任务
export interface CourseTask {
  id: string;
  name: string;
  description: string;
  teacherId: string;
  caseIds: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  createdAt: Date;
  assignedStudents: string[];
}

// 评分标准
export interface ScoringCriteria {
  id: string;
  name: string;
  communicationWeight: number;
  diagnosisWeight: number;
  treatmentWeight: number;
  criteria: {
    excellent: string;
    good: string;
    fair: string;
    poor: string;
  };
}

// 学习统计
export interface LearningStats {
  studentId: string;
  weeklyHours: number[];
  semesterHours: number;
  averageScore: number;
  completedCases: number;
  scoreDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

// 知识库数据源
export interface KnowledgeSource {
  id: string;
  name: string;
  type: 'internal' | 'external';
  url?: string;
  apiKey?: string;
  description: string;
  status: 'active' | 'inactive';
  caseCount: number;
  lastSync?: Date;
  category: string;
}
