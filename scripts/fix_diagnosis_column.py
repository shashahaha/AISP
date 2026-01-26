"""
修复session_scores表的diagnosis_accuracy列类型
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
    # 删除依赖表
    conn.execute(text("DROP TABLE IF EXISTS improvement_suggestions CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS question_coverage CASCADE"))
    conn.execute(text("DROP TABLE IF EXISTS session_scores CASCADE"))

    # 删除枚举类型
    conn.execute(text("DROP TYPE IF EXISTS diagnosis_accuracy CASCADE"))
    conn.execute(text("DROP TYPE IF EXISTS mastery_level CASCADE"))
    conn.execute(text("DROP TYPE IF EXISTS suggestion_status CASCADE"))
    conn.execute(text("DROP TYPE IF EXISTS study_plan_status CASCADE"))

    print("[OK] 删除旧表和类型完成")

    # 添加索引
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_session_scores_session_id ON session_scores(session_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_session_scores_final_score ON session_scores(final_score)"))

    print("[OK] session_scores表修复完成")

engine.dispose()
