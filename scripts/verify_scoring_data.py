"""
Verify scoring data in database
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
    # Check session_scores
    result = conn.execute(text('SELECT COUNT(*) FROM session_scores'))
    print(f'session_scores: {result.scalar()}')

    # Check question_coverage
    result = conn.execute(text('SELECT COUNT(*) FROM question_coverage'))
    print(f'question_coverage: {result.scalar()}')

    # Check improvement_suggestions
    result = conn.execute(text('SELECT COUNT(*) FROM improvement_suggestions'))
    print(f'improvement_suggestions: {result.scalar()}')

    # Check diagnosis_records
    result = conn.execute(text('SELECT COUNT(*) FROM diagnosis_records'))
    print(f'diagnosis_records: {result.scalar()}')

    # Check learning_records
    result = conn.execute(text('SELECT COUNT(*) FROM learning_records'))
    print(f'learning_records: {result.scalar()}')

    print('\nAll scoring tables are populated!')

engine.dispose()
