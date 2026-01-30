"""
数据库初始化脚本

功能：
1. 创建数据库（如果不存在）
2. 创建所有表
3. 插入示例病例数据
"""

import asyncio
import sys
import os
from pathlib import Path

# 设置控制台编码为UTF-8
if sys.platform == "win32":
    os.system("chcp 65001 > nul")

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.models.database import User, Case, ChatSession, Message, UserRole
from app.config import settings
import json


# 同步引擎（用于创建数据库和表）
from sqlalchemy import create_engine
from sqlalchemy.orm import Session


def create_database_if_not_exists():
    """创建数据库（如果不存在）"""
    from sqlalchemy import text
    from app.config import settings

    if "sqlite" in settings.DATABASE_URL_SYNC:
        print("[OK] SQLite模式，跳过数据库创建步骤")
        return

    # 如果是SQLite，跳过创建数据库步骤
    if "sqlite" in settings.DATABASE_URL:
        print("[INFO] 使用SQLite数据库，跳过创建数据库步骤")
        return

    # 连接到postgres默认数据库
    default_db_url = "postgresql://postgres:123456@localhost:5432/postgres"
    engine = create_engine(default_db_url, isolation_level="AUTOCOMMIT")

    with engine.connect() as conn:
        # 检查数据库是否存在
        result = conn.execute(text(
            "SELECT 1 FROM pg_database WHERE datname = 'aimed'"
        ))
        exists = result.scalar()

        if not exists:
            # 创建数据库
            conn.execute(text("CREATE DATABASE aimed OWNER postgres"))
            print("[OK] 数据库 'aimed' 创建成功")
        else:
            print("[OK] 数据库 'aimed' 已存在")

    engine.dispose()


def create_tables():
    """创建所有表"""
    from app.db.base import engine
    from app.db.session import async_engine

    print("正在创建数据库表...")

    # 使用同步引擎创建表
    Base.metadata.create_all(bind=engine)
    print("[OK] 数据库表创建成功")


def insert_sample_data(session: Session):
    """插入示例数据"""

    # 检查是否已有数据
    existing_user = session.query(User).filter_by(username="admin").first()
    if existing_user:
        print("[OK] 示例数据已存在，跳过插入")
        return

    print("正在插入示例数据...")

    # 1. 创建用户 - 先flush确保用户ID生成
    users = [
        User(
            username="admin",
            email="admin@aimed.com",
            full_name="系统管理员",
            role=UserRole.ADMIN,
            is_active=1
        ),
        User(
            username="teacher",
            email="teacher@aimed.com",
            full_name="张老师",
            role=UserRole.TEACHER,
            is_active=1
        ),
        User(
            username="student1",
            email="student1@aimed.com",
            full_name="李同学",
            role=UserRole.STUDENT,
            is_active=1
        ),
    ]
    session.add_all(users)
    session.flush()  # 确保用户先被持久化，获取ID

    # 2. 加载示例病例
    sample_cases_path = Path(__file__).parent.parent / "data" / "cases" / "sample_cases.json"

    if sample_cases_path.exists():
        with open(sample_cases_path, "r", encoding="utf-8") as f:
            cases_data = json.load(f)

        for case_item in cases_data.get("cases", []):
            case = Case(
                case_id=case_item.get("case_id"),
                title=case_item.get("title"),
                description=case_item.get("description"),
                difficulty=case_item.get("difficulty", "medium"),
                category=case_item.get("category", "内科"),
                patient_info=case_item.get("patient_info", {}),
                chief_complaint=case_item.get("chief_complaint", {}),
                symptoms=case_item.get("symptoms", {}),
                standard_diagnosis=case_item.get("standard_diagnosis"),
                differential_diagnosis=case_item.get("differential_diagnosis", []),
                key_questions=case_item.get("key_questions", []),
                created_by=1,  # admin (ID=1)
                is_active=1
            )
            session.add(case)

    session.commit()
    print("[OK] 示例数据插入成功")


def main():
    """主函数"""
    print("=" * 50)
    print("AISP 数据库初始化")
    print("=" * 50)

    try:
        # 1. 创建数据库
        create_database_if_not_exists()

        # 2. 创建表
        create_tables()

        # 3. 插入示例数据
        from app.db.base import SessionLocal
        db = SessionLocal()
        try:
            insert_sample_data(db)
        finally:
            db.close()

        print("=" * 50)
        print("[OK] 数据库初始化完成！")
        print("=" * 50)

    except Exception as e:
        print(f"[ERROR] 初始化失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
