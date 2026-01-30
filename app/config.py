from pydantic_settings import BaseSettings
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置"""
    # 智谱AI API
    ZHIPU_API_KEY: str
    ZHIPU_BASE_URL: str = "https://open.bigmodel.cn/api/coding/paas/v4"
    ZHIPU_MODEL: str = "glm-4.7"

    # 百川大模型 API
    BAICHUAN_API_KEY: str = ""
    BAICHUAN_BASE_URL: str = "https://api.baichuan-ai.com/v1"
    BAICHUAN_MODEL: str = "Baichuan4"

    # DeepSeek API（备用）
    # DEEPSEEK_API_KEY: str = ""
    # DEEPSEEK_BASE_URL: str = "https://api.deepseek.com/v1"

    # 数据库
    DATABASE_URL: str
    DATABASE_URL_SYNC: str

    # 应用信息
    APP_NAME: str = "AISP系统"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    # JWT配置
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24小时

    # 对话配置
    MAX_CONVERSATION_HISTORY: int = 20
    DEFAULT_TEMPERATURE: float = 0.7
    MAX_TOKENS: int = 500
    TIMEOUT: int = 30

    # 日志
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """获取配置单例"""
    return Settings()


settings = get_settings()
