from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from app.models.database import ChatSession, Message, Case, User, SessionStatus
from app.models.schemas import SessionCreate, SessionResponse


class SessionService:
    """会话管理服务 - 基于PostgreSQL的会话持久化"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_session(
        self,
        user_id: int,
        case_id: str,
        case_data: Dict[str, Any]
    ) -> ChatSession:
        """
        创建新的问诊会话

        Args:
            db: 数据库会话
            user_id: 用户ID
            case_id: 病例ID (字符串，如 "case_001")
            case_data: 病例完整数据

        Returns:
            创建的ChatSession对象
        """
        # 生成唯一会话ID
        session_uuid = str(uuid.uuid4())

        # 创建会话记录
        db_session = ChatSession(
            session_id=session_uuid,
            user_id=user_id,
            case_id=case_id,  # 这里暂时存储字符串case_id
            status=SessionStatus.ACTIVE,
            conversation_history=[],
            turn_count=0,
            started_at=datetime.utcnow()
        )

        self.db.add(db_session)
        await self.db.flush()

        return db_session

    async def get_session_by_id(self, session_id: str) -> Optional[ChatSession]:
        """
        根据session_id获取会话

        Args:
            session_id: 会话ID

        Returns:
            ChatSession对象或None
        """
        result = await self.db.execute(
            select(ChatSession)
            .where(ChatSession.session_id == session_id)
            .options(selectinload(ChatSession.messages))
        )
        return result.scalar_one_or_none()

    async def get_active_session(
        self,
        user_id: int,
        case_id: str
    ) -> Optional[ChatSession]:
        """
        获取用户的活跃会话

        Args:
            user_id: 用户ID
            case_id: 病例ID

        Returns:
            活跃的ChatSession对象或None
        """
        result = await self.db.execute(
            select(ChatSession)
            .where(
                and_(
                    ChatSession.user_id == user_id,
                    ChatSession.case_id == case_id,
                    ChatSession.status == SessionStatus.ACTIVE
                )
            )
            .order_by(ChatSession.started_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Message:
        """
        添加消息到会话

        Args:
            session_id: 会话ID
            role: 角色 (student/patient/system)
            content: 消息内容
            metadata: 元数据 (情绪、疼痛等级等)

        Returns:
            创建的Message对象
        """
        # 获取会话
        session = await self.get_session_by_id(session_id)
        if not session:
            raise ValueError(f"会话不存在: {session_id}")

        # 创建消息记录
        message = Message(
            session_id=session.id,
            role=role,
            content=content,
            metadata=metadata or {},
            timestamp=datetime.utcnow()
        )

        self.db.add(message)

        # 更新会话的对话历史
        if not session.conversation_history:
            session.conversation_history = []

        session.conversation_history.append({
            "role": role,
            "content": content,
            "metadata": metadata or {},
            "timestamp": datetime.utcnow().isoformat()
        })

        # 更新轮次计数（学生消息计入）
        if role == "student":
            session.turn_count = (session.turn_count or 0) + 1

        await self.db.flush()

        return message

    async def update_session_status(
        self,
        session_id: str,
        status: SessionStatus
    ) -> ChatSession:
        """
        更新会话状态

        Args:
            session_id: 会话ID
            status: 新状态

        Returns:
            更新后的ChatSession对象
        """
        session = await self.get_session_by_id(session_id)
        if not session:
            raise ValueError(f"会话不存在: {session_id}")

        session.status = status

        if status == SessionStatus.COMPLETED:
            session.completed_at = datetime.utcnow()

        await self.db.flush()
        return session

    async def save_scores(
        self,
        session_id: str,
        inquiry_score: Optional[float] = None,
        diagnosis_score: Optional[float] = None,
        communication_score: Optional[float] = None,
        total_score: Optional[float] = None
    ) -> ChatSession:
        """
        保存会话评分

        Args:
            session_id: 会话ID
            inquiry_score: 问诊评分
            diagnosis_score: 诊断评分
            communication_score: 沟通评分
            total_score: 总分

        Returns:
            更新后的ChatSession对象
        """
        session = await self.get_session_by_id(session_id)
        if not session:
            raise ValueError(f"会话不存在: {session_id}")

        if inquiry_score is not None:
            session.inquiry_score = inquiry_score
        if diagnosis_score is not None:
            session.diagnosis_score = diagnosis_score
        if communication_score is not None:
            session.communication_score = communication_score
        if total_score is not None:
            session.total_score = total_score

        await self.db.flush()
        return session

    async def save_student_diagnosis(
        self,
        session_id: str,
        diagnosis: str
    ) -> ChatSession:
        """
        保存学生提交的诊断

        Args:
            session_id: 会话ID
            diagnosis: 诊断结果

        Returns:
            更新后的ChatSession对象
        """
        session = await self.get_session_by_id(session_id)
        if not session:
            raise ValueError(f"会话不存在: {session_id}")

        session.student_diagnosis = diagnosis
        await self.db.flush()
        return session

    async def get_user_sessions(
        self,
        user_id: int,
        status: Optional[SessionStatus] = None,
        limit: int = 50
    ) -> List[ChatSession]:
        """
        获取用户的会话列表

        Args:
            user_id: 用户ID
            status: 状态筛选 (可选)
            limit: 返回数量限制

        Returns:
            ChatSession列表
        """
        query = select(ChatSession).where(ChatSession.user_id == user_id)

        if status:
            query = query.where(ChatSession.status == status)

        query = query.order_by(ChatSession.started_at.desc()).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_session_messages(
        self,
        session_id: str
    ) -> List[Message]:
        """
        获取会话的所有消息

        Args:
            session_id: 会话ID

        Returns:
            Message列表 (按时间排序)
        """
        session = await self.get_session_by_id(session_id)
        if not session:
            return []

        # 从conversation_history返回，或从messages表查询
        return session.messages

    async def cleanup_expired_sessions(
        self,
        hours: int = 24
    ) -> int:
        """
        清理过期的活跃会话

        Args:
            hours: 多少小时前的会话视为过期

        Returns:
            清理的会话数量
        """
        from datetime import timedelta

        expiry_time = datetime.utcnow() - timedelta(hours=hours)

        result = await self.db.execute(
            select(ChatSession)
            .where(
                and_(
                    ChatSession.status == SessionStatus.ACTIVE,
                    ChatSession.started_at < expiry_time
                )
            )
        )
        expired_sessions = result.scalars().all()

        count = 0
        for session in expired_sessions:
            session.status = SessionStatus.ABANDONED
            count += 1

        await self.db.flush()
        return count

    async def get_conversation_history(
        self,
        session_id: str
    ) -> List[Dict[str, Any]]:
        """
        获取会话的对话历史 (用于LLM上下文)

        Args:
            session_id: 会话ID

        Returns:
            对话历史列表 [{role, content, metadata}, ...]
        """
        session = await self.get_session_by_id(session_id)
        if not session:
            return []

        return session.conversation_history or []

    async def increment_turn_count(self, session_id: str) -> int:
        """
        增加会话轮次计数

        Args:
            session_id: 会话ID

        Returns:
            更新后的轮次计数
        """
        session = await self.get_session_by_id(session_id)
        if not session:
            raise ValueError(f"会话不存在: {session_id}")

        session.turn_count = (session.turn_count or 0) + 1
        await self.db.flush()
        return session.turn_count
