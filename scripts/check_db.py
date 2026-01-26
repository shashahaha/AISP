"""
查询数据库中的数据
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text


def check_database():
    """查询数据库所有表的记录数"""
    # 连接到数据库
    engine = create_engine("postgresql://postgres:123456@localhost:5432/aimed")

    with engine.connect() as conn:
        # 查询所有表
        tables = [
            "users",
            "cases",
            "chat_sessions",
            "messages"
        ]

        print("=" * 50)
        print("数据库记录统计")
        print("=" * 50)

        for table in tables:
            result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            print(f"{table:20s}: {count} 条记录")

        print("=" * 50)

        # 详细显示chat_sessions
        print("\nchat_sessions 表详情:")
        result = conn.execute(text("""
            SELECT session_id, user_id, case_id, status, turn_count,
                   inquiry_score, diagnosis_score, communication_score, total_score,
                   started_at, completed_at
            FROM chat_sessions
            ORDER BY started_at DESC
        """))
        rows = result.fetchall()
        if rows:
            for row in rows:
                print(f"  - session_id: {row[0]}")
                print(f"    status: {row[3]}, turn_count: {row[4]}")
                print(f"    scores: inquiry={row[5]}, diagnosis={row[6]}, communication={row[7]}, total={row[8]}")
                print()
        else:
            print("  (无记录)")

        # 详细显示messages
        print("\nmessages 表详情:")
        result = conn.execute(text("""
            SELECT m.id, s.session_id, m.role, m.content, m.timestamp
            FROM messages m
            JOIN chat_sessions s ON m.session_id = s.id
            ORDER BY m.timestamp DESC
            LIMIT 10
        """))
        rows = result.fetchall()
        if rows:
            for row in rows:
                print(f"  - [{row[2]}] {row[3][:50]}... (session: {row[1]})")
        else:
            print("  (无记录)")

    engine.dispose()


if __name__ == "__main__":
    check_database()
