"""对话引擎测试"""
import pytest
import asyncio
from app.core.chat_engine import ChatEngine
from app.core.safety_filter import SafetyFilter


@pytest.fixture
def sample_case_data():
    """示例病例数据"""
    return {
        "case_id": "case_001",
        "title": "胸痛待查",
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
            "location": "胸骨后",
            "nature": "压榨性疼痛",
            "severity": "7/10分",
            "duration": "持续5-10分钟",
            "radiation": "向左肩放射",
            "aggravating_factors": ["体力劳动", "情绪激动"],
            "relieving_factors": ["休息", "硝酸甘油"],
            "associated_symptoms": ["气短", "出汗"]
        },
        "standard_diagnosis": "不稳定性心绞痛",
        "key_questions": [
            "疼痛的性质和部位",
            "疼痛的诱发和缓解因素",
            "既往心脏病史"
        ]
    }


class TestSafetyFilter:
    """安全过滤器测试"""

    def test_refuse_dosage_question(self):
        """测试拒答药物剂量问题"""
        filter = SafetyFilter()
        should_refuse, response = filter.should_refuse_answer("这个药吃几片？")

        assert should_refuse is True
        assert "不懂" in response

    def test_refuse_diagnosis_question(self):
        """测试拒答诊断问题"""
        filter = SafetyFilter()
        should_refuse, response = filter.should_refuse_answer("我得了什么病？")

        assert should_refuse is True
        assert "不知道" in response

    def test_normal_question(self):
        """测试正常问题"""
        filter = SafetyFilter()
        should_refuse, response = filter.should_refuse_answer("您哪里不舒服？")

        assert should_refuse is False
        assert response is None

    def test_check_medical_terms(self):
        """测试医学术语检测"""
        filter = SafetyFilter()
        is_valid, response = filter.check_patient_response("您可能是心绞痛")

        assert is_valid is False  # 包含医学术语
        assert "心脏病" in response  # 应该被替换

    def test_danger_signal_detection(self):
        """测试危险信号检测"""
        filter = SafetyFilter()
        is_safe, danger_type, _ = filter.check_student_input("我不想活了")

        assert is_safe is False
        assert danger_type == "suicide"


class TestPromptManager:
    """提示词管理器测试"""

    def test_build_chat_prompt(self, sample_case_data):
        """测试提示词构建"""
        from app.core.prompt_manager import PromptManager

        prompt = PromptManager.build_chat_prompt(
            patient_info=sample_case_data["patient_info"],
            symptom_info={
                "chief_complaint": "胸痛3小时",
                "mood": "焦虑",
                "pain_level": "7",
                "behavior": "眉头紧锁",
                **sample_case_data["symptoms"]
            }
        )

        assert prompt is not None
        assert "58岁" in str(prompt)
        assert "胸骨后" in str(prompt)


class TestChatEngine:
    """对话引擎测试"""

    @pytest.fixture
    def engine(self):
        return ChatEngine()

    def test_generate_opening_statement(self, engine, sample_case_data):
        """测试开场白生成"""
        opening = engine._generate_opening_statement(
            patient_info=sample_case_data["patient_info"],
            chief_complaint=sample_case_data["chief_complaint"]
        )

        assert "58" in opening  # 包含年龄
        assert "胸痛" in opening  # 包含主诉
        assert len(opening) > 10

    def test_calculate_completeness(self, engine, sample_case_data):
        """测试问诊完整度计算"""
        conversation_history = [
            {"role": "student", "content": "请问您哪里不舒服？"},
            {"role": "patient", "content": "我胸口疼"},
            {"role": "student", "content": "疼痛是什么性质的？"},
            {"role": "patient", "content": "压榨样的疼"},
            {"role": "student", "content": "有什么原因会让疼痛加重吗？"},
            {"role": "patient", "content": "干活的时候会加重"},
        ]

        completeness = engine._calculate_inquiry_completeness(
            history=conversation_history,
            case_data=sample_case_data
        )

        assert "coverage_rate" in completeness
        assert "covered" in completeness
        assert "missed" in completeness
        assert completeness["coverage_rate"] > 0  # 应该覆盖了一些问题

    def test_infer_emotion(self, engine):
        """测试情绪推断"""
        emotion1 = engine._infer_emotion("我很担心，一直很害怕")
        assert "焦虑" in emotion1 or "不安" in emotion1

        emotion2 = engine._infer_emotion("挺好的，没什么")
        assert "平静" in emotion2


# 集成测试（需要实际API连接）
@pytest.mark.integration
class TestChatIntegration:
    """对话集成测试"""

    @pytest.mark.asyncio
    async def test_full_conversation_flow(self, sample_case_data):
        """测试完整对话流程"""
        engine = ChatEngine()

        # 1. 开始会话
        session_info = await engine.start_session(
            case_data=sample_case_data,
            user_id=1
        )

        assert "session_id" in session_info
        assert "opening_message" in session_info

        session_id = session_info["session_id"]

        # 2. 进行对话
        response1 = await engine.chat(
            session_id=session_id,
            user_message="请问您哪里不舒服？",
            case_data=sample_case_data,
            conversation_history=[],
            turn_count=0
        )

        assert response1.response
        assert response1.turn_count == 1

        # 3. 结束会话
        conversation_history = [
            {"role": "patient", "content": session_info["opening_message"]},
            {"role": "student", "content": "请问您哪里不舒服？"},
            {"role": "patient", "content": response1.response}
        ]

        feedback = await engine.end_session(
            session_id=session_id,
            conversation_history=conversation_history,
            case_data=sample_case_data
        )

        assert "completeness" in feedback
        assert "turn_count" in feedback


if __name__ == "__main__":
    # 运行测试
    pytest.main([__file__, "-v", "-s", "-m", "not integration"])
