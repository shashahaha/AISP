from typing import Dict, Any, List

# LangChain 导入 (兼容新旧版本)
try:
    from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
except ImportError:
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder


class PromptManager:
    """提示词管理器 - 管理AI标准化病人的提示词模板"""

    # 系统核心指令（固定）
    SYSTEM_INSTRUCTION = """你是AI标准化病人模拟器，用于医学教育。

核心规则（必须严格遵守）：
1. 只能描述你亲身体验的症状和感受，不得推测或编造
2. 对于未经历的症状必须明确回答"没有"或"不清楚"
3. 回答问题时要体现出相应的情绪状态和疼痛反应
4. 不得主动提及诊断名称或使用医学专业术语
5. 回答长度控制在20-50字之间，口语化表达
6. 必须保持角色一致性，前后回答不得矛盾
7. 禁止回答以下问题：
   - 具体药物剂量和用法
   - 疾病诊断结果
   - 治疗方案建议

如遇禁止回答的问题，使用以下话术：
- 药物询问："我不懂药物剂量，请听医生的"
- 诊断询问："我不知道自己得了什么病，您能告诉我吗？"
- 治疗询问："我不懂治疗，您是医生，您说怎么办就怎么样" """

    # 患者角色设定模板
    PERSONA_TEMPLATE = """
===== 患者角色设定 =====
年龄：{age}岁
性别：{gender}
职业：{occupation}
教育程度：{education}
性格特点：{personality}

主诉：{chief_complaint}

当前状态：
- 情绪：{mood}
- 疼痛程度：{pain_level}/10分
- 表现：{behavior}

症状特征：
- 部位：{symptom_location}
- 性质：{symptom_nature}
- 持续时间：{symptom_duration}
- 诱发因素：{aggravating_factors}
- 缓解因素：{relieving_factors}
- 伴随症状：{associated_symptoms}

===== 说话风格 =====
- 语言特点：{speech_style}
- 禁止使用医学术语
- 根据疼痛等级调整语气：
  * 1-3分：语气正常，表达清晰
  * 4-6分：略显紧张，偶尔停顿
  * 7-8分：语气急促，表达简短
  * 9-10分：说话断续，可能呻吟
"""

    # Few-shot示例（提升角色扮演效果）
    FEW_SHOT_EXAMPLES = [
        {
            "role": "human",
            "content": "医生：您好，请问您哪里不舒服？"
        },
        {
            "role": "ai",
            "content": "医生您好，我胸口疼，已经疼了3个小时了，特别难受。"
        }
    ]

    @classmethod
    def build_chat_prompt(
        cls,
        patient_info: Dict[str, Any],
        symptom_info: Dict[str, Any],
        conversation_history: List[Dict[str, str]] = None
    ) -> ChatPromptTemplate:
        """
        构建完整的对话提示词模板

        Args:
            patient_info: 患者信息
            symptom_info: 症状信息
            conversation_history: 对话历史

        Returns:
            ChatPromptTemplate对象
        """
        # 构建角色设定字符串
        persona_str = cls.PERSONA_TEMPLATE.format(
            age=patient_info.get("age", 50),
            gender=patient_info.get("gender", "男"),
            occupation=patient_info.get("occupation", "工人"),
            education=patient_info.get("education", "初中"),
            personality=patient_info.get("personality", "内向、焦虑"),
            chief_complaint=symptom_info.get("chief_complaint", "胸痛"),
            mood=symptom_info.get("mood", "焦虑"),
            pain_level=symptom_info.get("pain_level", "7"),
            behavior=symptom_info.get("behavior", "眉头紧锁，手捂胸口"),
            symptom_location=symptom_info.get("location", "胸骨后"),
            symptom_nature=symptom_info.get("nature", "压榨性疼痛"),
            symptom_duration=symptom_info.get("duration", "持续5-10分钟"),
            aggravating_factors=", ".join(symptom_info.get("aggravating_factors", [])),
            relieving_factors=", ".join(symptom_info.get("relieving_factors", [])),
            associated_symptoms=", ".join(symptom_info.get("associated_symptoms", [])),
            speech_style=patient_info.get("speech_style", "简单直接，表达清晰")
        )

        # 构建提示词模板
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", cls.SYSTEM_INSTRUCTION + "\n\n" + persona_str),
            MessagesPlaceholder(variable_name="history", optional=True),
            ("human", "{question}")
        ])

        return prompt_template

    @classmethod
    def format_conversation_history(
        cls,
        history: List[Dict[str, str]]
    ) -> List[tuple]:
        """
        格式化对话历史为LangChain消息格式

        Args:
            history: 原始对话历史

        Returns:
            格式化后的消息列表
        """
        messages = []
        for msg in history:
            if msg.get("role") == "student":
                messages.append(("human", msg.get("content")))
            elif msg.get("role") == "patient":
                messages.append(("ai", msg.get("content")))
        return messages

    @classmethod
    def get_pain_level_prompt(cls, pain_level: int) -> str:
        """
        根据疼痛等级生成语气提示

        Args:
            pain_level: 疼痛等级(1-10)

        Returns:
            语气描述
        """
        if pain_level <= 3:
            return "语气正常，表达清晰自然"
        elif pain_level <= 6:
            return "略显紧张，偶尔停顿，语气带点不安"
        elif pain_level <= 8:
            return "语气急促，表达简短，可能有轻微呻吟"
        else:
            return "说话断断续续，频繁呻吟，表情痛苦"
