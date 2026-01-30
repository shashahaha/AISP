from enum import Enum


class UserRole(str, Enum):
    """用户角色枚举"""
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"
    ADMIN = "ADMIN"


class SessionStatus(str, Enum):
    """会话状态枚举"""
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class PainLevel(str, Enum):
    """疼痛等级"""
    MILD = "1-3"
    MODERATE = "4-6"
    SEVERE = "7-8"
    EXTREME = "9-10"


class MessageRole(str, Enum):
    """消息角色"""
    STUDENT = "student"
    PATIENT = "patient"
    SYSTEM = "system"
