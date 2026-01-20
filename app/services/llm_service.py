from zai import ZhipuAiClient
from typing import List, Dict, Any, Optional
from app.config import settings
import asyncio
import logging

logger = logging.getLogger(__name__)


class LLMService:
    """LLM服务 - 封装智谱AI API调用"""

    def __init__(self):
        """初始化LLM客户端"""
        self.client = ZhipuAiClient(api_key=settings.ZHIPU_API_KEY)
        self.model = settings.ZHIPU_MODEL
        self.base_url = settings.ZHIPU_BASE_URL
        self.temperature = settings.DEFAULT_TEMPERATURE
        self.max_tokens = settings.MAX_TOKENS

        logger.info(f"智谱AI客户端初始化完成，模型: {self.model}")

    async def generate_response(
        self,
        messages: List[Dict[str, str]],
        stream: bool = False
    ) -> str:
        """
        生成AI回复

        Args:
            messages: 消息历史列表
            stream: 是否使用流式输出

        Returns:
            AI生成的回复文本
        """
        try:
            # 在异步上下文中运行同步的API调用
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model=self.model,
                messages=messages,
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )

            # 提取回复内容
            if response.choices and len(response.choices) > 0:
                return response.choices[0].message.content
            else:
                logger.warning("API返回空响应")
                return "我...我现在不太舒服，能...能再说一遍吗？"

        except Exception as e:
            logger.error(f"LLM调用错误: {str(e)}")
            # 错误处理
            return f"病人正在思考，请稍等..."

    async def chat_with_prompt(
        self,
        system_prompt: str,
        user_message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        使用完整提示词进行对话

        Args:
            system_prompt: 系统提示词
            user_message: 用户消息
            conversation_history: 对话历史

        Returns:
            AI回复
        """
        messages = [{"role": "system", "content": system_prompt}]

        # 添加对话历史
        if conversation_history:
            for msg in conversation_history:
                role = "user" if msg.get("role") == "student" else "assistant"
                messages.append({
                    "role": role,
                    "content": msg.get("content", "")
                })

        # 添加当前消息
        messages.append({"role": "user", "content": user_message})

        return await self.generate_response(messages)

    def validate_response(self, response: str) -> tuple[bool, str]:
        """
        验证AI回复的质量

        Args:
            response: AI生成的回复

        Returns:
            (是否有效, 处理后的回复)
        """
        if not response or response.strip() == "":
            return False, "我...我现在不太舒服，能...能再说一遍吗？"

        # 检查是否使用了医学术语（简单检测）
        medical_terms = ["诊断", "确诊", "心电图", "CT", "MRI", "超声"]
        for term in medical_terms:
            if term in response:
                # 发现医学术语，返回默认回复
                return False, "我不懂这些专业的，我就知道胸口特别疼，难受得很。"

        # 检查回复长度
        if len(response) > 100:
            # 太长了，截断
            return True, response[:80] + "..."

        return True, response


# 全局单例
_llm_service: Optional[LLMService] = None


def get_llm_service() -> LLMService:
    """获取LLM服务单例"""
    global _llm_service
    if _llm_service is None:
        _llm_service = LLMService()
    return _llm_service
