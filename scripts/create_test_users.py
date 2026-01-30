#!/usr/bin/env python
"""创建测试用户"""
import asyncio
import sys
import os
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.database import User, UserRole
from app.utils.auth import get_password_hash
from app.config import settings

async def create_users():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # 检查用户是否存在
        from sqlalchemy import select
        
        users_to_create = [
            {
                "username": "student1",
                "email": "student1@example.com",
                "role": "STUDENT",
                "password": "password123",
                "full_name": "测试学生"
            },
            {
                "username": "teacher1", 
                "email": "teacher1@example.com",
                "role": "TEACHER",
                "password": "password123",
                "full_name": "测试教师"
            },
            {
                "username": "admin",
                "email": "admin@example.com",
                "role": "ADMIN",
                "password": "admin123",
                "full_name": "系统管理员"
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
                    full_name=user_data["full_name"],
                    is_active=True
                )
                session.add(user)
                print(f"✓ 创建用户: {user_data['username']}")
            else:
                # 更新所有字段以确保数据完整
                existing.hashed_password = get_password_hash(user_data["password"])
                existing.email = user_data["email"]
                existing.role = user_data["role"]
                existing.full_name = user_data["full_name"]
                print(f"✓ 更新用户: {user_data['username']}")
        
        await session.commit()
        print("\n测试用户创建/更新完成！")

if __name__ == "__main__":
    asyncio.run(create_users())
