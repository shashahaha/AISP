from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, JSON, Enum as SQLEnum, Boolean, Numeric, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base
import enum


class UserRole(str, enum.Enum):
    """用户角色"""
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"
    ADMIN = "ADMIN"


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
    full_name = Column(String(100), unique=True, index=True)
    role = Column(SQLEnum(UserRole), default=UserRole.STUDENT, nullable=False)
    hashed_password = Column(String(200))
    is_active = Column(Integer, default=1)
    
    # 额外身份信息
    department = Column(String(100))
    student_id = Column(String(50))
    teacher_id = Column(String(50))

    # 学习相关统计 (同步文档设计)
    total_sessions = Column(Integer, default=0)
    avg_score = Column(Numeric(5, 2), default=0.00)
    completed_cases = Column(Integer, default=0)

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
    status = Column(String(20), default="pending")  # draft, pending, approved, rejected
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
    meta_data = Column(JSON)  # 存储情绪、疼痛等级等信息
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    session = relationship("ChatSession", back_populates="messages")


# ===== 评分系统表 =====

class ScoringRule(Base):
    """评分规则配置表"""
    __tablename__ = "scoring_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)

    # 评分权重配置
    inquiry_weight = Column(Numeric(5, 2), default=0.40)
    diagnosis_weight = Column(Numeric(5, 2), default=0.35)
    communication_weight = Column(Numeric(5, 2), default=0.25)

    # 问诊评分细则
    key_question_score = Column(Numeric(5, 2), default=40)
    symptom_detail_score = Column(Numeric(5, 2), default=20)
    logic_score = Column(Numeric(5, 2), default=20)
    etiquette_score = Column(Numeric(5, 2), default=20)

    # 诊断评分细则
    diagnosis_correct_score = Column(Numeric(5, 2), default=35)
    diagnosis_partial_score = Column(Numeric(5, 2), default=15)
    diagnosis_wrong_score = Column(Numeric(5, 2), default=0)

    # 沟通评分细则
    min_turns_for_full_score = Column(Integer, default=10)
    min_turns_for_pass_score = Column(Integer, default=5)

    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class DiagnosisAccuracy(str, enum.Enum):
    """诊断准确性"""
    CORRECT = "correct"
    PARTIAL = "partial"
    WRONG = "wrong"


class SessionScore(Base):
    """会话评分详情表"""
    __tablename__ = "session_scores"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    scoring_rule_id = Column(Integer, ForeignKey("scoring_rules.id"))

    # 问诊详细评分
    key_questions_covered = Column(Integer, default=0)
    key_questions_total = Column(Integer, default=0)
    key_question_coverage_rate = Column(Numeric(5, 2))

    covered_questions = Column(JSON, default=list)
    missed_questions = Column(JSON, default=list)

    symptom_inquiry_score = Column(Numeric(5, 2))
    inquiry_logic_score = Column(Numeric(5, 2))
    medical_etiquette_score = Column(Numeric(5, 2))
    inquiry_total_score = Column(Numeric(5, 2))

    # 诊断详细评分
    diagnosis_accuracy = Column(String(20), default="wrong")  # correct/partial/wrong
    differential_considered = Column(Integer, default=0)
    diagnosis_reasoning_score = Column(Numeric(5, 2))
    diagnosis_total_score = Column(Numeric(5, 2))

    # 沟通详细评分
    turn_count = Column(Integer, default=0)
    avg_response_length = Column(Numeric(5, 2))
    polite_expression_rate = Column(Numeric(5, 2))
    empathy_score = Column(Numeric(5, 2))
    communication_total_score = Column(Numeric(5, 2))

    # 综合评分
    final_score = Column(Numeric(5, 2))
    grade = Column(String(10))
    passed = Column(Boolean, default=False)

    # AI评分备注
    ai_comments = Column(Text)
    reviewer_comments = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    session = relationship("ChatSession")
    scoring_rule = relationship("ScoringRule")
    question_coverages = relationship("QuestionCoverage", back_populates="session_score", cascade="all, delete-orphan")
    improvement_suggestions = relationship("ImprovementSuggestion", back_populates="session_score")


class QuestionCoverage(Base):
    """关键问题覆盖记录表"""
    __tablename__ = "question_coverage"

    id = Column(Integer, primary_key=True, index=True)
    session_score_id = Column(Integer, ForeignKey("session_scores.id", ondelete="CASCADE"), nullable=False)

    question_text = Column(Text, nullable=False)
    question_category = Column(String(50))  # 现病史/既往史/个人史等
    is_covered = Column(Boolean, default=False)
    covered_at = Column(DateTime(timezone=True))
    question_quality = Column(String(20))  # excellent/good/fair/poor

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    session_score = relationship("SessionScore", back_populates="question_coverages")


class DiagnosisRecord(Base):
    """诊断记录表"""
    __tablename__ = "diagnosis_records"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)

    # 学生诊断
    student_diagnosis = Column(Text, nullable=False)
    diagnosis_confidence = Column(String(20))  # high/medium/low
    reasoning = Column(Text)

    # 标准答案对比
    standard_diagnosis = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False)
    is_partial = Column(Boolean, default=False)
    similarity_score = Column(Numeric(5, 2))

    # 鉴别诊断
    mentioned_differential = Column(JSON, default=list)
    standard_differential = Column(JSON, default=list)
    differential_coverage_rate = Column(Numeric(5, 2))

    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ===== 学习管理表 =====

class LearningRecord(Base):
    """学习记录表"""
    __tablename__ = "learning_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"))
    case_id = Column(Integer, ForeignKey("cases.id"))
    activity_type = Column(String(50), nullable=False)  # session/quiz/review

    # 学习数据
    score = Column(Numeric(5, 2))
    time_spent = Column(Integer)  # 秒
    completion_rate = Column(Numeric(5, 2))

    # 知识点相关
    knowledge_points_tested = Column(JSON, default=list)
    knowledge_points_mastered = Column(JSON, default=list)
    knowledge_points_weak = Column(JSON, default=list)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class KnowledgePoint(Base):
    """知识点表"""
    __tablename__ = "knowledge_points"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False)  # 如: CARDIO-001
    name = Column(String(200), nullable=False)
    category = Column(String(50))  # 心血管/呼吸/消化等
    description = Column(Text)

    # 关联信息
    related_cases = Column(JSON, default=list)
    prerequisite_points = Column(JSON, default=list)
    difficulty = Column(String(20), default="medium")

    # 统计数据
    avg_mastery_rate = Column(Numeric(5, 2))
    times_tested = Column(Integer, default=0)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class MasteryLevel(str, enum.Enum):
    """掌握等级"""
    EXPERT = "expert"
    PROFICIENT = "proficient"
    DEVELOPING = "developing"
    NOVICE = "novice"


class StudentKnowledgeMastery(Base):
    """学生知识点掌握度表"""
    __tablename__ = "student_knowledge_mastery"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    knowledge_point_id = Column(Integer, ForeignKey("knowledge_points.id"), nullable=False)

    # 掌握度数据
    mastery_level = Column(String(20))  # expert/proficient/developing/novice
    mastery_rate = Column(Numeric(5, 2))  # 0-100
    correct_count = Column(Integer, default=0)
    total_attempts = Column(Integer, default=0)

    # 时间追踪
    first_attempt_at = Column(DateTime(timezone=True))
    last_attempt_at = Column(DateTime(timezone=True))
    next_review_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 唯一约束
    __table_args__ = (
        {'extend_existing': True}
    )


class SuggestionStatus(str, enum.Enum):
    """建议状态"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class ImprovementSuggestion(Base):
    """改进建议表"""
    __tablename__ = "improvement_suggestions"

    id = Column(Integer, primary_key=True, index=True)
    session_score_id = Column(Integer, ForeignKey("session_scores.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    suggestion_type = Column(String(50), nullable=False)  # inquiry/diagnosis/communication/knowledge
    priority = Column(String(20), default="medium")  # high/medium/low

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    action_items = Column(JSON, default=list)

    # 关联知识点
    related_knowledge_points = Column(JSON, default=list)

    # 状态追踪
    status = Column(String(20), default="pending")  # pending/in_progress/completed
    completed_at = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # 关系
    session_score = relationship("SessionScore", back_populates="improvement_suggestions")


class StudyPlanStatus(str, enum.Enum):
    """学习计划状态"""
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"


class CourseTask(Base):
    """课程任务表"""
    __tablename__ = "course_tasks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    
    # 存储病例ID列表和学生ID列表 (JSON 格式)
    case_ids = Column(JSON, default=list)
    assigned_students = Column(JSON, default=list)
    
    difficulty = Column(String(20))  # easy, medium, hard
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # 关系
    teacher = relationship("User")


class StudyPlan(Base):
    """学习计划表"""
    __tablename__ = "study_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)

    # 计划数据
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    target_score = Column(Numeric(5, 2))

    # 计划内容
    planned_cases = Column(JSON, default=list)
    planned_knowledge_points = Column(JSON, default=list)

    # 进度追踪
    total_milestones = Column(Integer, default=0)
    completed_milestones = Column(Integer, default=0)
    progress_rate = Column(Numeric(5, 2))

    status = Column(String(20), default="active")  # active/completed/paused

    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class LearningMilestone(Base):
    """学习里程碑表"""
    __tablename__ = "learning_milestones"

    id = Column(Integer, primary_key=True, index=True)
    study_plan_id = Column(Integer, ForeignKey("study_plans.id", ondelete="SET NULL"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String(200), nullable=False)
    description = Column(Text)
    milestone_type = Column(String(50), nullable=False)  # case_count/score_level/knowledge_mastery

    # 目标与完成状态
    target_value = Column(Numeric(10, 2), nullable=False)
    current_value = Column(Numeric(10, 2), default=0)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True))

    due_date = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

