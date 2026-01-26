"""
数据库重置脚本 - 删除并重新创建数据库
"""

import sys
import os
from pathlib import Path

# 设置控制台编码为UTF-8
if sys.platform == "win32":
    os.system("chcp 65001 > nul")

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text


def reset_database():
    """删除并重新创建数据库"""
    # 连接到postgres默认数据库
    default_db_url = "postgresql://postgres:123456@localhost:5432/postgres"
    engine = create_engine(default_db_url, isolation_level="AUTOCOMMIT")

    with engine.connect() as conn:
        # 终止所有连接到aimed数据库的连接
        conn.execute(text("""
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = 'aimed' AND pid <> pg_backend_pid()
        """))

        # 删除数据库（如果存在）
        conn.execute(text("DROP DATABASE IF EXISTS aimed"))
        print("[OK] 数据库 'aimed' 已删除")

        # 重新创建数据库
        conn.execute(text("CREATE DATABASE aimed OWNER postgres"))
        print("[OK] 数据库 'aimed' 重新创建成功")

    engine.dispose()


def main():
    """主函数"""
    print("=" * 50)
    print("AISP 数据库重置")
    print("=" * 50)

    try:
        reset_database()
        print("=" * 50)
        print("[OK] 数据库重置完成！")
        print("=" * 50)

    except Exception as e:
        print(f"[ERROR] 重置失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
