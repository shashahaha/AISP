import sys
from pathlib import Path

if sys.platform == "win32":
    import os
    os.system("chcp 65001 > nul")

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text

engine = create_engine("postgresql://postgres:123456@localhost:5432/aimed")

with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'session_scores'
        ORDER BY ordinal_position;
    """))

    print("session_scores 表结构:")
    for row in result:
        print(f"  {row[0]:30s} {row[1]}")
