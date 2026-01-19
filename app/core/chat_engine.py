from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime
from app.services.llm_service import get_llm_service
from app.core.prompt_manager import PromptManager
from app.core.safety_filter import SafetyFilter
from app.models.schemas import ChatResponse


class ChatEngine:
    """AI对话引擎 - 核心业务逻辑"""

    def __init__(self):
        self.llm_service = get_llm_service()
        self.safety_filter = SafetyFilter()

    async def start_session(
        self,
        case_data: Dict[str, Any],
        user_id: int
    ) -> Dict[str, Any]:
        """
        开始新的问诊会话

        Args:
            case_data: 病例数据
            user_id: 用户ID

        Returns:
            会话信息
        """
        session_id = str(uuid.uuid4())

        # 构建初始回复（患者开场白）
        patient_info = case_data.get("patient_info", {})
        chief_complaint = case_data.get("chief_complaint", {})

        opening = self._generate_opening_statement(patient_info, chief_complaint)

        return {
            "session_id": session_id,
            "opening_message": opening,
            "case_info": {
                "title": case_data.get("title"),
                "difficulty": case_data.get("difficulty"),
            },
            "started_at": datetime.now().isoformat()
        }

    def _generate_opening_statement(
        self,
        patient_info: Dict[str, Any],
        chief_complaint: Dict[str, Any]
    ) -> str:
        """生成患者开场白"""
        age = patient_info.get("age", 50)
        gender = patient_info.get("gender", "男")
        complaint = chief_complaint.get("text", "我不舒服")

        if gender == "男":
            return f"医生您好，我今年{age}岁，{complaint}，已经很难受了。"
        else:
            return f"医生您好，我今年{age}岁，{complaint}，已经很难受了。"

    async def chat(
        self,
        session_id: str,
        user_message: str,
        case_data: Dict[str, Any],
        conversation_history: List[Dict[str, str]],
        turn_count: int
    ) -> ChatResponse:
        """
        处理学生问诊对话

        Args:
            session_id: 会话ID
            user_message: 学生的问题
            case_data: 病例数据
            conversation_history: 对话历史
            turn_count: 当前对话轮次

        Returns:
            ChatResponse对象
        """
        # 1. 安全检查学生输入
        is_safe, danger_type, _ = self.safety_filter.check_student_input(user_message)
        if not is_safe:
            # 发现危险信号，返回警告
            return ChatResponse(
                session_id=session_id,
                response=self._get_danger_warning(danger_type),
                metadata={"danger_detected": True, "type": danger_type},
                turn_count=turn_count + 1
            )

        # 2. 检查是否需要拒答
        should_refuse, refusal_response = self.safety_filter.should_refuse_answer(user_message)
        if should_refuse:
            return ChatResponse(
                session_id=session_id,
                response=refusal_response,
                metadata={"refusal": True},
                turn_count=turn_count + 1
            )

        # 3. 构建提示词
        patient_info = case_data.get("patient_info", {})
        symptoms = case_data.get("symptoms", {})

        symptom_info = {
            "chief_complaint": case_data.get("chief_complaint", {}).get("text", "胸痛"),
            "mood": "焦虑",
            "pain_level": symptoms.get("severity", "7/10分").split("/")[0],
            "behavior": "眉头紧锁，手捂胸口",
            "location": symptoms.get("location", "胸骨后"),
            "nature": symptoms.get("nature", "压榨性疼痛"),
            "duration": symptoms.get("duration", "持续5-10分钟"),
            "aggravating_factors": symptoms.get("aggravating_factors", []),
            "relieving_factors": symptoms.get("relieving_factors", []),
            "associated_symptoms": symptoms.get("associated_symptoms", []),
        }

        system_prompt = PromptManager.build_chat_prompt(
            patient_info=patient_info,
            symptom_info=symptom_info,
            conversation_history=conversation_history
        )

        # 4. 调用LLM生成回复
        try:
            # 构建完整的消息列表
            messages = [{"role": "system", "content": system_prompt}]

            # 添加对话历史（最近N轮）
            recent_history = conversation_history[-10:] if conversation_history else []
            for msg in recent_history:
                role = "user" if msg.get("role") == "student" else "assistant"
                messages.append({
                    "role": role,
                    "content": msg.get("content", "")
                })

            # 添加当前问题
            messages.append({"role": "user", "content": user_message})

            # 生成回复
            response = await self.llm_service.generate_response(messages)

            # 5. 验证回复质量
            is_valid, validated_response = self.safety_filter.check_patient_response(response)

            # 6. 检查角色一致性
            if not self.safety_filter.check_role_consistency(
                validated_response,
                patient_info.get("age", 50)
            ):
                validated_response = "我...我现在不太舒服，能...能再说一遍吗？"

            # 7. 构建元数据
            metadata = {
                "turn_count": turn_count + 1,
                "pain_level": symptom_info.get("pain_level"),
                "emotion": self._infer_emotion(validated_response),
                "timestamp": datetime.now().isoformat()
            }

            return ChatResponse(
                session_id=session_id,
                response=validated_response,
                metadata=metadata,
                turn_count=turn_count + 1
            )

        except Exception as e:
            # 错误处理
            return ChatResponse(
                session_id=session_id,
                response="病人正在思考，请稍等...",
                metadata={"error": str(e)},
                turn_count=turn_count + 1
            )

    def _get_danger_warning(self, danger_type: str) -> str:
        """获取危险警告消息"""
        warnings = {
            "suicide": "我注意到您提到了一些让我担心的话，如果有需要，我们可以休息一下。",
            "violence": "请注意文明用语，这是医学教育环境。"
        }
        return warnings.get(danger_type, "请注意您的表达方式。")

    def _infer_emotion(self, response: str) -> str:
        """从回复中推断情绪状态"""
        anxiety_keywords = ["担心", "害怕", "紧张", "焦虑"]
        pain_keywords = ["疼", "痛", "难受", "不舒服"]

        score = 0
        for word in anxiety_keywords:
            if word in response:
                score += 1

        for word in pain_keywords:
            if word in response:
                score += 1

        if score >= 3:
            return "非常焦虑"
        elif score >= 2:
            return "焦虑"
        elif score >= 1:
            return "略显不安"
        else:
            return "平静"

    async def end_session(
        self,
        session_id: str,
        conversation_history: List[Dict[str, str]],
        case_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        结束问诊会话并生成反馈

        Args:
            session_id: 会话ID
            conversation_history: 完整对话历史
            case_data: 病例数据

        Returns:
            会话反馈
        """
        # 计算问诊完整度
        completeness = self._calculate_inquiry_completeness(
            conversation_history,
            case_data
        )

        # 生成反馈
        feedback = {
            "session_id": session_id,
            "completed_at": datetime.now().isoformat(),
            "turn_count": len(conversation_history) // 2,
            "completeness": completeness,
            "suggestions": self._generate_suggestions(completeness, case_data)
        }

        return feedback

    def _calculate_inquiry_completeness(
        self,
        history: List[Dict[str, str]],
        case_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """计算问诊完整度"""
        key_questions = case_data.get("key_questions", [])

        # 提取学生的问题
        student_questions = [
            msg.get("content", "")
            for msg in history
            if msg.get("role") == "student"
        ]

        # 检查关键问题是否覆盖
        covered = []
        missed = []

        for question in key_questions:
            found = False
            for student_q in student_questions:
                if any(keyword in student_q for keyword in question.split()):
                    found = True
                    break

            if found:
                covered.append(question)
            else:
                missed.append(question)

        return {
            "total_key_questions": len(key_questions),
            "covered": covered,
            "missed": missed,
            "coverage_rate": len(covered) / len(key_questions) if key_questions else 0
        }

    def _generate_suggestions(
        self,
        completeness: Dict[str, Any],
        case_data: Dict[str, Any]
    ) -> List[str]:
        """生成改进建议"""
        suggestions = []

        # 基于遗漏问题生成建议
        missed = completeness.get("missed", [])
        if missed:
            suggestions.append(f"建议询问以下问题：{', '.join(missed[:3])}")

        # 基于问诊轮次生成建议
        if completeness.get("coverage_rate", 0) < 0.7:
            suggestions.append("问诊还不够全面，建议继续深入了解症状特点")

        return suggestions


# 全局单例
_chat_engine: Optional[ChatEngine] = None


def get_chat_engine() -> ChatEngine:
    """获取对话引擎单例"""
    global _chat_engine
    if _chat_engine is None:
        _chat_engine = ChatEngine()
    return _chat_engine
