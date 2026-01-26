from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.enums import UserRole, SessionStatus


# ===== 用户相关 =====
class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: UserRole = UserRole.STUDENT


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional[Dict[str, Any]] = None


# ===== 病例相关 =====
class PatientInfo(BaseModel):
    age: int
    gender: str
    occupation: str
    education: str
    personality: str


class SymptomDetail(BaseModel):
    onset: str
    location: str
    nature: str
    severity: str  # "7/10分"格式
    duration: str
    radiation: Optional[str] = None
    aggravating_factors: List[str]
    relieving_factors: List[str]
    associated_symptoms: List[str]


class CaseBase(BaseModel):
    case_id: str
    title: str
    description: Optional[str] = None
    difficulty: str = "medium"
    category: str = "内科"


class CaseCreate(CaseBase):
    patient_info: PatientInfo
    chief_complaint: Dict[str, Any]
    symptoms: SymptomDetail
    standard_diagnosis: str
    differential_diagnosis: List[str]
    key_questions: List[str]


class CaseResponse(CaseBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ===== 对话相关 =====
class ChatMessage(BaseModel):
    role: str = Field(..., description="student或patient")
    content: str
    metadata: Optional[Dict[str, Any]] = None


class ChatRequest(BaseModel):
    session_id: Optional[str] = None  # 如果为空则创建新会话
    case_id: str
    message: str


class ChatResponse(BaseModel):
    session_id: str
    response: str
    metadata: Optional[Dict[str, Any]] = None
    turn_count: int


# ===== 会话相关 =====
class SessionCreate(BaseModel):
    case_id: str
    user_id: int


class SessionResponse(BaseModel):
    session_id: str
    case_id: int
    status: SessionStatus
    turn_count: int
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ===== 诊断提交 =====
class DiagnosisSubmit(BaseModel):
    session_id: str
    diagnosis: str
    reasoning: Optional[str] = None


class DiagnosisFeedback(BaseModel):
    session_id: str
    total_score: float
    inquiry_score: float
    diagnosis_score: float
    communication_score: float
    feedback: str
    suggestions: List[str]
