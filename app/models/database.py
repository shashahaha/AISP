from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class UserRole(str, enum.Enum):
    """用户角色"""
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class SessionStatus(str, enum.Enum):
    """会话状态"""
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class User(Base):
    """用户表"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True)
    full_name = Column(String(100))
    role = Column(SQLEnum(UserRole), default=UserRole.STUDENT, nullable=False)
    hashed_password = Column(String(200))
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    sessions = relationship("ChatSession", back_populates="user")


class Case(Base):
    """病例表"""
    __tablename__ = "cases"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    difficulty = Column(String(20))  # easy, medium, hard
    category = Column(String(50))  # 内科、外科、妇科等

    # 患者信息（JSON格式存储完整病例数据）
    patient_info = Column(JSON, nullable=False)
    chief_complaint = Column(JSON, nullable=False)
    symptoms = Column(JSON, nullable=False)
    standard_diagnosis = Column(String(200))
    differential_diagnosis = Column(JSON)
    key_questions = Column(JSON)

    created_by = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    sessions = relationship("ChatSession", back_populates="case")


class ChatSession(Base):
    """问诊会话表"""
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, index=True, nullable=False)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    case_id = Column(Integer, ForeignKey("cases.id"), nullable=False)

    status = Column(SQLEnum(SessionStatus), default=SessionStatus.ACTIVE)

    # 会话数据
    conversation_history = Column(JSON, default=list)
    turn_count = Column(Integer, default=0)

    # 评分数据
    inquiry_score = Column(Float)
    diagnosis_score = Column(Float)
    communication_score = Column(Float)
    total_score = Column(Float)

    # 学生提交的诊断
    student_diagnosis = Column(Text)

    # 时间戳
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))

    # 关系
    user = relationship("User", back_populates="sessions")
    case = relationship("Case", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")


class Message(Base):
    """消息表"""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)

    role = Column(String(20), nullable=False)  # student, patient, system
    content = Column(Text, nullable=False)

    # 元数据
    metadata = Column(JSON)  # 存储情绪、疼痛等级等信息
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    session = relationship("ChatSession", back_populates="messages")
