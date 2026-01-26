from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.schemas import ChatRequest, ChatResponse, DiagnosisSubmit, DiagnosisFeedback
from app.core.chat_engine import get_chat_engine
from app.services.session_service import SessionService
from app.services.scoring_service import ScoringService
from app.db.session import get_async_db
from app.models.database import Case, SessionStatus, ImprovementSuggestion, User
from app.api.auth import get_current_user, get_current_user_optional

router = APIRouter(prefix="/api/chat", tags=["对话"])


@router.post("/start", response_model=Dict[str, Any])
async def start_chat_session(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    开始新的问诊会话

    - **case_id**: 病例ID (如 "case_001")
    - **message**: 第一条消息（可选，预留字段）
    """
    # 获取病例数据
    case_data = await _get_case_data(db, request.case_id)

    # 使用当前用户ID
    user_id = current_user.id

    # 检查是否已有活跃会话
    session_service = SessionService(db)
    existing_session = await session_service.get_active_session(user_id, request.case_id)

    if existing_session:
        # 如果有活跃会话，继续使用
        session = existing_session
    else:
        # 创建新会话
        session = await session_service.create_session(
            user_id=user_id,
            case_id=request.case_id,
            case_data=case_data
        )

    # 启动对话引擎，生成开场白
    engine = get_chat_engine()
    session_info = await engine.start_session(
        case_data=case_data,
        user_id=user_id
    )

    # 保存开场白作为第一条患者消息
    await session_service.add_message(
        session_id=session.session_id,
        role="patient",
        content=session_info["opening_message"],
        metadata={"type": "opening"}
    )

    await db.commit()

    return {
        "session_id": session.session_id,
        "message": session_info["opening_message"],
        "case_info": session_info["case_info"],
        "is_new_session": existing_session is None
    }


@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    发送问诊消息

    - **session_id**: 会话ID
    - **case_id**: 病例ID
    - **message**: 学生的问诊问题
    """
    # 获取会话服务
    session_service = SessionService(db)

    # 获取会话
    session = await session_service.get_session_by_id(request.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在或已过期"
        )

    if session.status.value != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"会话已{session.status.value}，无法继续对话"
        )

    # 保存学生消息
    await session_service.add_message(
        session_id=request.session_id,
        role="student",
        content=request.message
    )

    # 获取病例数据
    case_data = await _get_case_data(db, session.case.case_id)

    # 获取对话历史
    conversation_history = await session_service.get_conversation_history(request.session_id)

    # 调用对话引擎
    engine = get_chat_engine()
    response = await engine.chat(
        session_id=request.session_id,
        user_message=request.message,
        case_data=case_data,
        conversation_history=conversation_history,
        turn_count=session.turn_count or 0
    )

    # 保存患者回复
    await session_service.add_message(
        session_id=request.session_id,
        role="patient",
        content=response.response,
        metadata=response.metadata
    )

    await db.commit()

    return response


@router.post("/end", response_model=Dict[str, Any])
async def end_session(
    submit: DiagnosisSubmit,
    db: AsyncSession = Depends(get_async_db)
):
    """
    结束问诊会话并提交诊断

    - **session_id**: 会话ID
    - **diagnosis**: 学生的诊断结果
    - **reasoning**: 诊断推理过程（可选）
    """
    session_service = SessionService(db)
    scoring_service = ScoringService(db)

    # 获取会话
    session = await session_service.get_session_by_id(submit.session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在"
        )

    # 保存学生诊断
    await session_service.save_student_diagnosis(
        session_id=submit.session_id,
        diagnosis=submit.diagnosis
    )

    # 获取病例数据
    case_data = await _get_case_data(db, session.case.case_id)

    # 获取对话历史
    conversation_history = await session_service.get_conversation_history(submit.session_id)

    # 使用新的评分引擎进行评分
    from app.models.database import ChatSession

    # 获取会话的数据库ID
    session_result = await db.execute(
        select(ChatSession).where(ChatSession.session_id == submit.session_id)
    )
    session_db = session_result.scalar_one()

    # 使用评分服务进行完整评分并保存
    session_score = await scoring_service.score_session(
        session_id=session_db.id,
        conversation_history=conversation_history,
        student_diagnosis=submit.diagnosis,
        case_data=case_data
    )

    # 创建学习记录
    await scoring_service.create_learning_record(
        user_id=session.user_id,
        session_id=session_db.id,
        case_id=session.case.id,
        score=session_score.final_score,
        time_spent=0,  # 可以后续计算
        knowledge_tested=[],
        knowledge_mastered=[] if not session_score.passed else [case_data.get("category")],
        knowledge_weak=[case_data.get("category")] if not session_score.passed else []
    )

    # 更新知识点掌握度
    await scoring_service.update_knowledge_mastery(
        user_id=session.user_id,
        case_data=case_data,
        score=session_score.final_score,
        passed=session_score.passed
    )

    # 更新chat_sessions表的评分（快速查询用）
    await session_service.save_scores(
        session_id=submit.session_id,
        inquiry_score=session_score.inquiry_total_score,
        diagnosis_score=session_score.diagnosis_total_score,
        communication_score=session_score.communication_total_score,
        total_score=session_score.final_score
    )

    # 更新会话状态为完成
    await session_service.update_session_status(
        session_id=submit.session_id,
        status=SessionStatus.COMPLETED
    )

    await db.commit()

    # 获取改进建议
    suggestions_result = await db.execute(
        select(ImprovementSuggestion)
        .where(ImprovementSuggestion.session_score_id == session_score.id)
    )
    suggestions = suggestions_result.scalars().all()

    # 构建返回数据
    return {
        "session_id": submit.session_id,
        "completed_at": session_score.created_at.isoformat() if session_score.created_at else None,
        "scores": {
            "inquiry": {
                "total": session_score.inquiry_total_score,
                "symptom_inquiry": session_score.symptom_inquiry_score,
                "inquiry_logic": session_score.inquiry_logic_score,
                "medical_etiquette": session_score.medical_etiquette_score,
                "coverage_rate": session_score.key_question_coverage_rate,
                "covered": session_score.covered_questions,
                "missed": session_score.missed_questions
            },
            "diagnosis": {
                "total": session_score.diagnosis_total_score,
                "accuracy": session_score.diagnosis_accuracy,
                "differential_count": session_score.differential_considered,
                "reasoning": session_score.diagnosis_reasoning_score
            },
            "communication": {
                "total": session_score.communication_total_score,
                "turn_count": session_score.turn_count,
                "polite_rate": session_score.polite_expression_rate,
                "empathy": session_score.empathy_score
            },
            "total": session_score.final_score
        },
        "grade": session_score.grade,
        "passed": session_score.passed,
        "ai_comments": session_score.ai_comments,
        "suggestions": [
            {
                "type": s.suggestion_type,
                "priority": s.priority,
                "title": s.title,
                "description": s.description
            }
            for s in suggestions
        ]
    }


@router.get("/session/{session_id}", response_model=Dict[str, Any])
async def get_session(
    session_id: str,
    db: AsyncSession = Depends(get_async_db)
):
    """获取会话详情"""
    session_service = SessionService(db)
    session = await session_service.get_session_by_id(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会话不存在"
        )

    # 获取消息列表
    messages = await session_service.get_session_messages(session_id)

    return {
        "session_id": session.session_id,
        "case_id": session.case_id,
        "status": session.status.value,
        "turn_count": session.turn_count,
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "completed_at": session.completed_at.isoformat() if session.completed_at else None,
        "scores": {
            "inquiry": session.inquiry_score,
            "diagnosis": session.diagnosis_score,
            "communication": session.communication_score,
            "total": session.total_score
        },
        "messages": [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat() if msg.timestamp else None
            }
            for msg in messages
        ]
    }


@router.get("/sessions", response_model=List[Dict[str, Any]])
async def list_sessions(
    status: str = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    获取当前用户的会话列表

    - **status**: 状态筛选 (active/completed/abandoned)
    - **limit**: 返回数量限制
    """
    # 使用当前用户ID
    user_id = current_user.id

    session_service = SessionService(db)

    # 转换状态字符串
    from app.models.database import SessionStatus
    status_filter = SessionStatus(status) if status else None

    sessions = await session_service.get_user_sessions(
        user_id=user_id,
        status=status_filter,
        limit=limit
    )

    return [
        {
            "session_id": s.session_id,
            "case_id": s.case_id,
            "status": s.status.value,
            "turn_count": s.turn_count,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            "total_score": s.total_score
        }
        for s in sessions
    ]


async def _get_case_data(db: AsyncSession, case_id: str) -> Dict[str, Any]:
    """从数据库获取病例数据"""
    result = await db.execute(
        select(Case).where(Case.case_id == case_id)
    )
    case = result.scalar_one_or_none()

    if not case:
        # 如果数据库中没有，返回默认病例（兜底）
        return {
            "case_id": case_id,
            "title": "默认病例",
            "description": "病例未找到",
            "difficulty": "medium",
            "category": "内科",
            "patient_info": {},
            "chief_complaint": {"text": "我不舒服"},
            "symptoms": {},
            "standard_diagnosis": "待诊断",
            "differential_diagnosis": [],
            "key_questions": []
        }

    # 返回病例数据（合并所有字段）
    return {
        "case_id": case.case_id,
        "title": case.title,
        "description": case.description,
        "difficulty": case.difficulty,
        "category": case.category,
        "patient_info": case.patient_info or {},
        "chief_complaint": case.chief_complaint or {},
        "symptoms": case.symptoms or {},
        "standard_diagnosis": case.standard_diagnosis,
        "differential_diagnosis": case.differential_diagnosis or [],
        "key_questions": case.key_questions or []
    }
