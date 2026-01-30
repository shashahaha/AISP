from openai import AsyncOpenAI
from typing import List, Dict, Any, Optional
from app.config import settings
import logging
import json

logger = logging.getLogger(__name__)


class BaichuanService:
    """百川大模型服务 - 封装 OpenAI SDK 调用"""

    def __init__(self):
        """初始化百川客户端"""
        self.api_key = settings.BAICHUAN_API_KEY
        self.base_url = settings.BAICHUAN_BASE_URL
        self.model = settings.BAICHUAN_MODEL
        self.temperature = settings.DEFAULT_TEMPERATURE
        self.max_tokens = settings.MAX_TOKENS

        if not self.api_key:
            logger.warning("未配置 BAICHUAN_API_KEY，百川服务功能将受限")

        # 初始化异步客户端
        self.client = AsyncOpenAI(
            api_key=self.api_key or "dummy_key",
            base_url=self.base_url
        )
        
        logger.info(f"百川AI客户端初始化完成，模型: {self.model}")

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False
    ) -> str:
        """
        生成AI回复

        Args:
            messages: 消息列表
            temperature: 温度参数
            max_tokens: 最大token数
            json_mode: 是否强制JSON输出

        Returns:
            AI回复内容
        """
        try:
            if not self.api_key:
                return json.dumps({"error": "未配置百川API Key"}) if json_mode else "系统未配置百川API Key"

            params = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature or self.temperature,
                "max_tokens": max_tokens or self.max_tokens,
            }
            
            if json_mode:
                params["response_format"] = {"type": "json_object"}

            response = await self.client.chat.completions.create(**params)

            if response.choices and len(response.choices) > 0:
                return response.choices[0].message.content
            else:
                logger.warning("百川API返回空响应")
                return ""

        except Exception as e:
            logger.error(f"百川API调用错误: {str(e)}")
            return ""

    async def evaluate_student_performance(
        self,
        case_data: Dict[str, Any],
        conversation_history: List[Dict[str, Any]],
        student_diagnosis: str
    ) -> Dict[str, Any]:
        """
        使用百川模型评估学生表现
        """
        # 1. 整理对话记录
        dialogue_text = ""
        for i, msg in enumerate(conversation_history):
            role = "医生" if msg.get("role") == "student" else "患者"
            content = msg.get("content", "")
            dialogue_text += f"{i+1}. {role}: {content}\n"

        # 2. 构建 Prompt
        system_prompt = """你是一位经验丰富的医学教育专家。请根据提供的病例信息、问诊对话记录和学生给出的诊断，对学生的临床表现进行多维度评估。
请严格按照 JSON 格式输出评估结果。
"""

        user_prompt = f"""
【病例标准信息】
主诉: {case_data.get('chief_complaint', {}).get('text', '')}
现病史: {case_data.get('history_present_illness', '')}
既往史: {case_data.get('past_medical_history', '')}
标准诊断: {case_data.get('standard_diagnosis', '')}
关键问题: {', '.join(case_data.get('key_questions', []))}

【学生问诊记录】
{dialogue_text}

【学生给出的诊断】
{student_diagnosis}

请从以下四个维度进行评分（每项满分25分，总分100分），并给出具体评价和建议：

1. 问诊逻辑 (inquiry_logic): 问诊条理是否清晰，是否遵循由主诉到现病史再到既往史的逻辑。
2. 信息采集 (info_collection): 是否遗漏关键症状和重要病史信息。
3. 诊断思维 (diagnosis_reasoning): 诊断结论是否准确，依据是否充分，是否考虑了鉴别诊断。
4. 医患沟通 (communication): 语言是否通俗易懂，态度是否亲切，是否体现人文关怀。

请返回如下 JSON 格式：
{{
    "scores": {{
        "inquiry_logic": <分数>,
        "info_collection": <分数>,
        "diagnosis_reasoning": <分数>,
        "communication": <分数>
    }},
    "comments": {{
        "inquiry_logic": "<评价>",
        "info_collection": "<评价>",
        "diagnosis_reasoning": "<评价>",
        "communication": "<评价>"
    }},
    "suggestions": ["<建议1>", "<建议2>", "<建议3>"],
    "overall_comment": "<总评>"
}}
"""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        # 3. 调用 API
        response_text = await self.generate_response(
            messages, 
            temperature=0.3, # 评分需要相对客观
            max_tokens=1000,
            json_mode=True
        )

        # 4. 解析结果
        try:
            result = json.loads(response_text)
            return result
        except json.JSONDecodeError:
            logger.error(f"无法解析百川API返回的JSON: {response_text}")
            # 返回默认/降级结果
            return {
                "scores": {"inquiry_logic": 0, "info_collection": 0, "diagnosis_reasoning": 0, "communication": 0},
                "comments": {},
                "suggestions": ["系统暂时无法生成智能建议"],
                "overall_comment": "智能评分服务暂时不可用"
            }

# 单例模式
_baichuan_service: Optional[BaichuanService] = None

def get_baichuan_service() -> BaichuanService:
    global _baichuan_service
    if _baichuan_service is None:
        _baichuan_service = BaichuanService()
    return _baichuan_service
