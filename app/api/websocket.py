from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Optional
import json
import asyncio
from app.core.chat_engine import get_chat_engine
from app.services.session_service import SessionService
from app.db.session import AsyncSessionLocal

router = APIRouter()


class ConnectionManager:
    """WebSocket连接管理器"""

    def __init__(self):
        # 活跃连接映射: session_id -> WebSocket
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        """接受连接"""
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        """断开连接"""
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_message(self, session_id: str, message: dict):
        """发送消息到特定会话"""
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(message)

    async def broadcast(self, message: dict):
        """广播消息到所有连接"""
        for connection in self.active_connections.values():
            await connection.send_json(message)


manager = ConnectionManager()


async def get_db():
    """获取数据库会话（用于WebSocket）"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


@router.websocket("/ws/chat/{session_id}")
async def websocket_chat_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket实时对话接口

    连接URL: ws://localhost:8000/ws/chat/{session_id}

    消息格式:
    ```json
    {
        "type": "message|start|end",
        "case_id": "case_001",
        "content": "学生的问题",
        "diagnosis": "诊断结果"  // type=end时使用
    }
    ```
    """
    await manager.connect(websocket, session_id)

    # 创建数据库会话
    async with AsyncSessionLocal() as db:
        try:
            while True:
                # 接收客户端消息
                data = await websocket.receive_text()
                message = json.loads(data)

                msg_type = message.get("type", "message")

                if msg_type == "start":
                    # 开始新会话
                    await handle_start_session(websocket, session_id, message, db)

                elif msg_type == "message":
                    # 处理对话消息
                    await handle_chat_message(websocket, session_id, message, db)

                elif msg_type == "end":
                    # 结束会话
                    await handle_end_session(websocket, session_id, message, db)

                else:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"未知消息类型: {msg_type}"
                    })

        except WebSocketDisconnect:
            manager.disconnect(session_id)
        except Exception as e:
            await websocket.send_json({
                "type": "error",
                "message": f"服务器错误: {str(e)}"
            })
            manager.disconnect(session_id)


async def handle_start_session(
    websocket: WebSocket,
    session_id: str,
    message: dict,
    db: AsyncSession
):
    """处理开始会话"""
    case_id = message.get("case_id", "case_001")
    user_id = 1  # 临时硬编码

    # 获取会话服务
    session_service = SessionService(db)

    # 检查是否已有会话
    existing_session = await session_service.get_session_by_id(session_id)

    if existing_session:
        # 已有会话，直接返回
        await websocket.send_json({
            "type": "session_resumed",
            "session_id": session_id,
            "message": "会话已恢复"
        })
        return

    # 获取病例数据
    case_data = await _get_case_data(case_id)

    # 创建数据库会话记录
    db_session = await session_service.create_session(
        user_id=user_id,
        case_id=case_id,
        case_data=case_data
    )

    # 启动对话引擎
    engine = get_chat_engine()
    session_info = await engine.start_session(
        case_data=case_data,
        user_id=user_id
    )

    # 保存开场白
    await session_service.add_message(
        session_id=db_session.session_id,
        role="patient",
        content=session_info["opening_message"],
        metadata={"type": "opening"}
    )

    await db.commit()

    # 发送开场白
    await websocket.send_json({
        "type": "session_started",
        "session_id": db_session.session_id,
        "message": session_info["opening_message"],
        "case_info": session_info["case_info"]
    })


async def handle_chat_message(
    websocket: WebSocket,
    session_id: str,
    message: dict,
    db: AsyncSession
):
    """处理对话消息"""
    session_service = SessionService(db)

    # 获取会话
    session = await session_service.get_session_by_id(session_id)

    if not session:
        await websocket.send_json({
            "type": "error",
            "message": "会话不存在，请先开始新会话"
        })
        return

    if session.status.value != "active":
        await websocket.send_json({
            "type": "error",
            "message": f"会话已{session.status.value}"
        })
        return

    user_message = message.get("content", "")

    # 保存学生问题
    await session_service.add_message(
        session_id=session_id,
        role="student",
        content=user_message
    )

    # 发送"正在思考"状态
    await websocket.send_json({
        "type": "thinking",
        "message": "病人正在思考..."
    })

    # 获取病例数据
    case_data = await _get_case_data(session.case_id)

    # 获取对话历史
    conversation_history = await session_service.get_conversation_history(session_id)

    # 调用对话引擎
    engine = get_chat_engine()
    response = await engine.chat(
        session_id=session_id,
        user_message=user_message,
        case_data=case_data,
        conversation_history=conversation_history,
        turn_count=session.turn_count or 0
    )

    # 保存患者回复
    await session_service.add_message(
        session_id=session_id,
        role="patient",
        content=response.response,
        metadata=response.metadata
    )

    await db.commit()

    # 发送回复
    await websocket.send_json({
        "type": "response",
        "session_id": session_id,
        "message": response.response,
        "metadata": response.metadata,
        "turn_count": response.turn_count
    })


async def handle_end_session(
    websocket: WebSocket,
    session_id: str,
    message: dict,
    db: AsyncSession
):
    """处理结束会话"""
    session_service = SessionService(db)

    # 获取会话
    session = await session_service.get_session_by_id(session_id)

    if not session:
        await websocket.send_json({
            "type": "error",
            "message": "会话不存在"
        })
        return

    # 保存学生诊断
    student_diagnosis = message.get("diagnosis", "")
    await session_service.save_student_diagnosis(
        session_id=session_id,
        diagnosis=student_diagnosis
    )

    # 获取病例数据
    case_data = await _get_case_data(session.case_id)

    # 获取对话历史
    conversation_history = await session_service.get_conversation_history(session_id)

    # 调用对话引擎生成反馈
    engine = get_chat_engine()
    feedback = await engine.end_session(
        session_id=session_id,
        conversation_history=conversation_history,
        case_data=case_data
    )

    # 检查诊断
    diagnosis_correct = _check_diagnosis(
        student_diagnosis,
        case_data.get("standard_diagnosis", "")
    )

    # 计算评分
    scores = _calculate_scores(feedback, diagnosis_correct)

    # 保存评分
    await session_service.save_scores(
        session_id=session_id,
        **scores
    )

    # 更新会话状态
    await session_service.update_session_status(
        session_id=session_id,
        status="completed"
    )

    await db.commit()

    # 发送反馈
    await websocket.send_json({
        "type": "session_ended",
        "session_id": session_id,
        "feedback": {
            **feedback,
            "student_diagnosis": student_diagnosis,
            "diagnosis_correct": diagnosis_correct,
            "scores": scores
        }
    })


async def _get_case_data(case_id: str) -> dict:
    """获取病例数据"""
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
    feedback: dict,
    diagnosis_correct: bool
) -> dict:
    """计算评分"""
    # 问诊评分 (40%)
    coverage_rate = feedback.get("completeness", {}).get("coverage_rate", 0)
    inquiry_score = coverage_rate * 40

    # 诊断评分 (35%)
    diagnosis_score = 35 if diagnosis_correct else 0

    # 沟通评分 (25%)
    turn_count = feedback.get("turn_count", 0)
    if turn_count >= 10:
        communication_score = 25
    elif turn_count >= 5:
        communication_score = 20
    else:
        communication_score = 15

    total_score = inquiry_score + diagnosis_score + communication_score

    return {
        "inquiry_score": round(inquiry_score, 2),
        "diagnosis_score": round(diagnosis_score, 2),
        "communication_score": round(communication_score, 2),
        "total_score": round(total_score, 2)
    }
