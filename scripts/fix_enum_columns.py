"""
Fix all enum columns to use VARCHAR instead
"""
import sys
from pathlib import Path

if sys.platform == "win32":
    import os
    os.system("chcp 65001 > nul")

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:123456@localhost:5432/aimed')

with engine.connect() as conn:
    print("Dropping and recreating improvement_suggestions table...")

    # Drop the table
    conn.execute(text('DROP TABLE IF EXISTS improvement_suggestions CASCADE'))

    # Recreate with VARCHAR type for status
    conn.execute(text("""
        CREATE TABLE improvement_suggestions (
            id SERIAL PRIMARY KEY,
            session_score_id INTEGER REFERENCES session_scores(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id),
            suggestion_type VARCHAR(50) NOT NULL,
            priority VARCHAR(20) DEFAULT 'medium',
            title VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            action_items JSON DEFAULT '[]',
            related_knowledge_points JSON DEFAULT '[]',
            status VARCHAR(20) DEFAULT 'pending',
            completed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    """))

    conn.commit()
    print("[OK] improvement_suggestions table recreated with VARCHAR type for status")

engine.dispose()
