from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schemas import ChatRequest, ChatResponse, DiagnosisSubmit, DiagnosisFeedback
from app.core.chat_engine import get_chat_engine
from app.services.session_service import SessionService
from app.db.session import get_async_db

router = APIRouter(prefix="/api/chat", tags=["对话"])


@router.post("/start", response_model=Dict[str, Any])
async def start_chat_session(
    request: ChatRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """
    开始新的问诊会话

    - **case_id**: 病例ID (如 "case_001")
    - **message**: 第一条消息（可选，预留字段）
    """
    # 获取病例数据
    case_data = await _get_case_data(request.case_id)

    # 获取用户ID (临时硬编码，应从JWT token获取)
    user_id = 1

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
    case_data = await _get_case_data(session.case_id)

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
    case_data = await _get_case_data(session.case_id)

    # 获取对话历史
    conversation_history = await session_service.get_conversation_history(submit.session_id)

    # 调用对话引擎生成反馈
    engine = get_chat_engine()
    feedback = await engine.end_session(
        session_id=submit.session_id,
        conversation_history=conversation_history,
        case_data=case_data
    )

    # 检查诊断是否正确
    diagnosis_correct = _check_diagnosis(
        submit.diagnosis,
        case_data.get("standard_diagnosis", "")
    )

    # 计算评分
    scores = _calculate_scores(feedback, diagnosis_correct)

    # 保存评分
    await session_service.save_scores(
        session_id=submit.session_id,
        **scores
    )

    # 更新会话状态为完成
    await session_service.update_session_status(
        session_id=submit.session_id,
        status="completed"
    )

    await db.commit()

    # 添加诊断信息到反馈
    feedback["student_diagnosis"] = submit.diagnosis
    feedback["diagnosis_correct"] = diagnosis_correct
    feedback["scores"] = scores

    return feedback


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
    db: AsyncSession = Depends(get_async_db)
):
    """
    获取当前用户的会话列表

    - **status**: 状态筛选 (active/completed/abandoned)
    - **limit**: 返回数量限制
    """
    # 临时硬编码用户ID
    user_id = 1

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


async def _get_case_data(case_id: str) -> Dict[str, Any]:
    """获取病例数据（临时实现，后续从数据库获取）"""
    cases = {
        "case_001": {
            "case_id": "case_001",
            "title": "胸痛待查",
            "description": "58岁男性建筑工人，突发胸痛3小时",
            "difficulty": "medium",
            "category": "内科",
            "patient_info": {
                "age": 58,
                "gender": "男",
                "occupation": "建筑工人",
                "education": "初中",
                "personality": "内向、焦虑、表达简单",
                "speech_style": "简单直接，略显紧张"
            },
            "chief_complaint": {
                "text": "胸痛3小时"
            },
            "symptoms": {
                "onset": "3小时前劳动时突然出现",
                "location": "胸骨后",
                "nature": "压榨性疼痛",
                "severity": "7/10分",
                "duration": "持续5-10分钟",
                "radiation": "向左肩放射",
                "aggravating_factors": ["体力劳动", "情绪激动", "寒冷刺激"],
                "relieving_factors": ["休息", "含服硝酸甘油"],
                "associated_symptoms": ["轻度气短", "出汗"]
            },
            "standard_diagnosis": "不稳定性心绞痛",
            "differential_diagnosis": ["急性心肌梗死", "主动脉夹层", "肺栓塞"],
            "key_questions": [
                "疼痛的性质和部位",
                "疼痛的诱发和缓解因素",
                "既往心脏病史",
                "高血压病史",
                "吸烟饮酒史"
            ]
        }
    }

    return cases.get(case_id, cases["case_001"])


def _check_diagnosis(student_diagnosis: str, correct_diagnosis: str) -> bool:
    """检查诊断是否正确"""
    return correct_diagnosis.lower() in student_diagnosis.lower()


def _calculate_scores(
    feedback: Dict[str, Any],
    diagnosis_correct: bool
) -> Dict[str, float]:
    """
    计算综合评分

    Args:
        feedback: 反馈数据
        diagnosis_correct: 诊断是否正确

    Returns:
        评分字典 {inquiry_score, diagnosis_score, communication_score, total_score}
    """
    # 问诊评分 (40%)
    coverage_rate = feedback.get("completeness", {}).get("coverage_rate", 0)
    inquiry_score = coverage_rate * 40

    # 诊断评分 (35%)
    diagnosis_score = 35 if diagnosis_correct else 0

    # 沟通评分 (25%) - 基于问诊轮次和礼貌性
    turn_count = feedback.get("turn_count", 0)
    if turn_count >= 10:
        communication_score = 25
    elif turn_count >= 5:
        communication_score = 20
    else:
        communication_score = 15

    # 总分
    total_score = inquiry_score + diagnosis_score + communication_score

    return {
        "inquiry_score": round(inquiry_score, 2),
        "diagnosis_score": round(diagnosis_score, 2),
        "communication_score": round(communication_score, 2),
        "total_score": round(total_score, 2)
    }
