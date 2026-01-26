from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import settings

# 异步引擎配置
engine_kwargs = {
    "echo": settings.DEBUG,
    "pool_pre_ping": True,
}

# SQLite不支持pool_size和max_overflow
if "sqlite" not in settings.DATABASE_URL:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

# 异步引擎
async_engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_kwargs
)

# 异步会话工厂
AsyncSessionLocal = sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


async def get_async_db():
    """异步数据库会话依赖"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
