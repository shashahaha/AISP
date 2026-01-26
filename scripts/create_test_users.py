import sys
import asyncio
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.session import AsyncSessionLocal
from app.models.database import User, UserRole
from app.utils.auth import get_password_hash
from sqlalchemy import select

async def create_users():
    print("开始创建/更新测试用户...")
    async with AsyncSessionLocal() as db:
        password = "123456"
        hashed_password = get_password_hash(password)
        
        users_data = [
            {
                "username": "student", 
                "role": UserRole.STUDENT, 
                "full_name": "测试学生",
                "email": "student@test.com"
            },
            {
                "username": "teacher", 
                "role": UserRole.TEACHER, 
                "full_name": "测试教师",
                "email": "teacher@test.com"
            },
            {
                "username": "admin", 
                "role": UserRole.ADMIN, 
                "full_name": "系统管理员",
                "email": "admin@test.com"
            },
        ]

        for u_data in users_data:
            result = await db.execute(select(User).where(User.username == u_data["username"]))
            user = result.scalar_one_or_none()
            
            if user:
                print(f"用户 {u_data['username']} 已存在，更新密码和角色...")
                user.hashed_password = hashed_password
                user.role = u_data["role"]
                # 如果需要也可以更新其他字段
            else:
                print(f"创建用户 {u_data['username']}...")
                user = User(
                    username=u_data["username"],
                    email=u_data["email"],
                    full_name=u_data["full_name"],
                    role=u_data["role"],
                    hashed_password=hashed_password,
                    is_active=1
                )
                db.add(user)
        
        await db.commit()
        print("="*50)
        print("所有测试用户已处理完毕！")
        print("用户列表:")
        for u in users_data:
            print(f"- 用户名: {u['username']}, 角色: {u['role'].value}, 密码: {password}")
        print("="*50)

if __name__ == "__main__":
    asyncio.run(create_users())
