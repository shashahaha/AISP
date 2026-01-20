"""
Fix session_scores table to use VARCHAR for diagnosis_accuracy
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
    # Drop and recreate the table with proper column type
    print("Dropping old tables...")
    conn.execute(text('DROP TABLE IF EXISTS improvement_suggestions CASCADE'))
    conn.execute(text('DROP TABLE IF EXISTS question_coverage CASCADE'))
    conn.execute(text('DROP TABLE IF EXISTS session_scores CASCADE'))
    conn.execute(text('DROP TYPE IF EXISTS diagnosisaccuracy CASCADE'))

    print("Recreating session_scores table...")
    # Recreate table with correct types
    conn.execute(text('''
        CREATE TABLE session_scores (
            id SERIAL PRIMARY KEY,
            session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
            scoring_rule_id INTEGER REFERENCES scoring_rules(id),

            -- 问诊详细评分
            key_questions_covered INTEGER DEFAULT 0,
            key_questions_total INTEGER DEFAULT 0,
            key_question_coverage_rate NUMERIC(5, 2),
            covered_questions JSON DEFAULT '[]',
            missed_questions JSON DEFAULT '[]',
            symptom_inquiry_score NUMERIC(5, 2),
            inquiry_logic_score NUMERIC(5, 2),
            medical_etiquette_score NUMERIC(5, 2),
            inquiry_total_score NUMERIC(5, 2),

            -- 诊断详细评分
            diagnosis_accuracy VARCHAR(20) DEFAULT 'wrong',
            differential_considered INTEGER DEFAULT 0,
            diagnosis_reasoning_score NUMERIC(5, 2),
            diagnosis_total_score NUMERIC(5, 2),

            -- 沟通详细评分
            turn_count INTEGER DEFAULT 0,
            avg_response_length NUMERIC(5, 2),
            polite_expression_rate NUMERIC(5, 2),
            empathy_score NUMERIC(5, 2),
            communication_total_score NUMERIC(5, 2),

            -- 综合评分
            final_score NUMERIC(5, 2),
            grade VARCHAR(10),
            passed BOOLEAN DEFAULT FALSE,

            -- AI评分备注
            ai_comments TEXT,
            reviewer_comments TEXT,

            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        )
    '''))

    conn.execute(text('CREATE INDEX idx_session_scores_session_id ON session_scores(session_id)'))
    conn.execute(text('CREATE INDEX idx_session_scores_final_score ON session_scores(final_score)'))

    conn.commit()
    print("[OK] Table recreated with VARCHAR type for diagnosis_accuracy")

engine.dispose()
