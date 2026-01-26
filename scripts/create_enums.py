"""
手动创建缺失的枚举类型
"""
import sys
from pathlib import Path

if sys.platform == "win32":
    import os
    os.system("chcp 65001 > nul")

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text

engine = create_engine("postgresql://postgres:123456@localhost:5432/aimed")

with engine.connect() as conn:
    # 创建缺失的枚举类型
    print("创建枚举类型...")

    conn.execute(text("""
        DO $$ BEGIN
            CREATE TYPE diagnosis_accuracy AS ENUM ('correct', 'partial', 'wrong');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    print("[OK] diagnosis_accuracy")

    conn.execute(text("""
        DO $$ BEGIN
            CREATE TYPE mastery_level AS ENUM ('expert', 'proficient', 'developing', 'novice');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    print("[OK] mastery_level")

    conn.execute(text("""
        DO $$ BEGIN
            CREATE TYPE suggestion_status AS ENUM ('pending', 'in_progress', 'completed');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    print("[OK] suggestion_status")

    conn.execute(text("""
        DO $$ BEGIN
            CREATE TYPE study_plan_status AS ENUM ('active', 'completed', 'paused');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """))
    print("[OK] study_plan_status")

    print("\n所有枚举类型创建完成！")

engine.dispose()
