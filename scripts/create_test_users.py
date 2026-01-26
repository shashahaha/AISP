#!/usr/bin/env python
"""创建测试用户"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.database import User
from app.utils.auth import get_password_hash

DATABASE_URL = "postgresql+asyncpg://postgres:123456@localhost:5432/aimed"

async def create_users():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 检查用户是否存在
        from sqlalchemy import select
        
        users_to_create = [
            {
                "username": "student1",
                "email": "student1@example.com",
                "role": "student",
                "password": "password123"
            },
            {
                "username": "teacher1", 
                "email": "teacher1@example.com",
                "role": "teacher",
                "password": "password123"
            },
            {
                "username": "admin",
                "email": "admin@example.com",
                "role": "admin",
                "password": "admin123"
            }
        ]
        
        for user_data in users_to_create:
            result = await session.execute(
                select(User).where(User.username == user_data["username"])
            )
            existing = result.scalar_one_or_none()
            
            if not existing:
                user = User(
                    username=user_data["username"],
                    hashed_password=get_password_hash(user_data["password"]),
                    email=user_data["email"],
                    role=user_data["role"],
                    is_active=True
                )
                session.add(user)
                print(f"✓ 创建用户: {user_data['username']}")
            else:
                print(f"- 用户已存在: {user_data['username']}")
        
        await session.commit()
        print("\n测试用户创建完成！")

if __name__ == "__main__":
    asyncio.run(create_users())
