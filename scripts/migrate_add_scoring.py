"""
数据库迁移脚本 - 添加评分系统相关表

运行方式:
    python scripts/migrate_add_scoring.py
"""

import sys
import os
from pathlib import Path

# 设置控制台编码
if sys.platform == "win32":
    os.system("chcp 65001 > nul")

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session


def migrate():
    """执行迁移"""
    # 连接数据库
    engine = create_engine("postgresql://postgres:123456@localhost:5432/aimed")

    with engine.connect() as conn:
        # 使用事务
        with conn.begin():
            # 创建新枚举类型
            print("创建新枚举类型...")

            # 诊断准确性枚举
            conn.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE diagnosis_accuracy AS ENUM ('correct', 'partial', 'wrong');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            """))

            # 掌握等级枚举
            conn.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE mastery_level AS ENUM ('expert', 'proficient', 'developing', 'novice');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            """))

            # 建议状态枚举
            conn.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE suggestion_status AS ENUM ('pending', 'in_progress', 'completed');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            """))

            # 学习计划状态枚举
            conn.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE study_plan_status AS ENUM ('active', 'completed', 'paused');
                EXCEPTION
                    WHEN duplicate_object THEN null;
                END $$;
            """))

            print("[OK] 枚举类型创建完成")

            # 创建新表
            print("\n创建评分系统表...")

            # 1. 评分规则配置表
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS scoring_rules (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,

                    inquiry_weight NUMERIC(5,2) DEFAULT 0.40,
                    diagnosis_weight NUMERIC(5,2) DEFAULT 0.35,
                    communication_weight NUMERIC(5,2) DEFAULT 0.25,

                    key_question_score NUMERIC(5,2) DEFAULT 40,
                    symptom_detail_score NUMERIC(5,2) DEFAULT 20,
                    logic_score NUMERIC(5,2) DEFAULT 20,
                    etiquette_score NUMERIC(5,2) DEFAULT 20,

                    diagnosis_correct_score NUMERIC(5,2) DEFAULT 35,
                    diagnosis_partial_score NUMERIC(5,2) DEFAULT 15,
                    diagnosis_wrong_score NUMERIC(5,2) DEFAULT 0,

                    min_turns_for_full_score INTEGER DEFAULT 10,
                    min_turns_for_pass_score INTEGER DEFAULT 5,

                    is_active BOOLEAN DEFAULT TRUE,
                    created_by INTEGER REFERENCES users(id),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE
                );
            """))

            # 2. 会话评分详情表
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS session_scores (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
                    scoring_rule_id INTEGER REFERENCES scoring_rules(id),

                    key_questions_covered INTEGER DEFAULT 0,
                    key_questions_total INTEGER DEFAULT 0,
                    key_question_coverage_rate NUMERIC(5,2),

                    covered_questions JSONB DEFAULT '[]'::jsonb,
                    missed_questions JSONB DEFAULT '[]'::jsonb,

                    symptom_inquiry_score NUMERIC(5,2),
                    inquiry_logic_score NUMERIC(5,2),
                    medical_etiquette_score NUMERIC(5,2),
                    inquiry_total_score NUMERIC(5,2),

                    diagnosis_accuracy diagnosis_accuracy,
                    differential_considered INTEGER DEFAULT 0,
                    diagnosis_reasoning_score NUMERIC(5,2),
                    diagnosis_total_score NUMERIC(5,2),

                    turn_count INTEGER DEFAULT 0,
                    avg_response_length NUMERIC(5,2),
                    polite_expression_rate NUMERIC(5,2),
                    empathy_score NUMERIC(5,2),
                    communication_total_score NUMERIC(5,2),

                    final_score NUMERIC(5,2),
                    grade VARCHAR(10),
                    passed BOOLEAN DEFAULT FALSE,

                    ai_comments TEXT,
                    reviewer_comments TEXT,

                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE
                );
            """))

            # 3. 关键问题覆盖记录表
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS question_coverage (
                    id SERIAL PRIMARY KEY,
                    session_score_id INTEGER NOT NULL REFERENCES session_scores(id) ON DELETE CASCADE,

                    question_text TEXT NOT NULL,
                    question_category VARCHAR(50),
                    is_covered BOOLEAN DEFAULT FALSE,
                    covered_at TIMESTAMP WITH TIME ZONE,
                    question_quality VARCHAR(20),

                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """))

            # 4. 诊断记录表
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS diagnosis_records (
                    id SERIAL PRIMARY KEY,
                    session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,

                    student_diagnosis TEXT NOT NULL,
                    diagnosis_confidence VARCHAR(20),
                    reasoning TEXT,

                    standard_diagnosis TEXT NOT NULL,
                    is_correct BOOLEAN DEFAULT FALSE,
                    is_partial BOOLEAN DEFAULT FALSE,
                    similarity_score NUMERIC(5,2),

                    mentioned_differential JSONB DEFAULT '[]'::jsonb,
                    standard_differential JSONB DEFAULT '[]'::jsonb,
                    differential_coverage_rate NUMERIC(5,2),

                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """))

            # 5. 学习记录表
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS learning_records (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    session_id INTEGER REFERENCES chat_sessions(id),
                    case_id INTEGER REFERENCES cases(id),
                    activity_type VARCHAR(50) NOT NULL,

                    score NUMERIC(5,2),
                    time_spent INTEGER,
                    completion_rate NUMERIC(5,2),

                    knowledge_points_tested JSONB DEFAULT '[]'::jsonb,
                    knowledge_points_mastered JSONB DEFAULT '[]'::jsonb,
                    knowledge_points_weak JSONB DEFAULT '[]'::jsonb,

                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """))

            # 6. 知识点表
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS knowledge_points (
                    id SERIAL PRIMARY KEY,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    name VARCHAR(200) NOT NULL,
                    category VARCHAR(50),
                    description TEXT,

                    related_cases JSONB DEFAULT '[]'::jsonb,
                    prerequisite_points JSONB DEFAULT '[]'::jsonb,
                    difficulty VARCHAR(20) DEFAULT 'medium',

                    avg_mastery_rate NUMERIC(5,2),
                    times_tested INTEGER DEFAULT 0,

                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE
                );
            """))

            # 7. 学生知识点掌握度表
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS student_knowledge_mastery (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    knowledge_point_id INTEGER NOT NULL REFERENCES knowledge_points(id),

                    mastery_level mastery_level,
                    mastery_rate NUMERIC(5,2),
                    correct_count INTEGER DEFAULT 0,
                    total_attempts INTEGER DEFAULT 0,

                    first_attempt_at TIMESTAMP WITH TIME ZONE,
                    last_attempt_at TIMESTAMP WITH TIME ZONE,
                    next_review_at TIMESTAMP WITH TIME ZONE,

                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE,

                    UNIQUE(user_id, knowledge_point_id)
                );
            """))

            # 8. 改进建议表
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS improvement_suggestions (
                    id SERIAL PRIMARY KEY,
                    session_score_id INTEGER REFERENCES session_scores(id),
                    user_id INTEGER NOT NULL REFERENCES users(id),

                    suggestion_type VARCHAR(50) NOT NULL,
                    priority VARCHAR(20) DEFAULT 'medium',

                    title VARCHAR(200) NOT NULL,
                    description TEXT NOT NULL,
                    action_items JSONB DEFAULT '[]'::jsonb,

                    related_knowledge_points JSONB DEFAULT '[]'::jsonb,

                    status suggestion_status DEFAULT 'pending',
                    completed_at TIMESTAMP WITH TIME ZONE,

                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """))

            # 9. 学习计划表
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS study_plans (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    name VARCHAR(200) NOT NULL,
                    description TEXT,

                    start_date DATE NOT NULL,
                    end_date DATE,
                    target_score NUMERIC(5,2),

                    planned_cases JSONB DEFAULT '[]'::jsonb,
                    planned_knowledge_points JSONB DEFAULT '[]'::jsonb,

                    total_milestones INTEGER DEFAULT 0,
                    completed_milestones INTEGER DEFAULT 0,
                    progress_rate NUMERIC(5,2),

                    status study_plan_status DEFAULT 'active',

                    created_by INTEGER REFERENCES users(id),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE
                );
            """))

            # 10. 学习里程碑表
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS learning_milestones (
                    id SERIAL PRIMARY KEY,
                    study_plan_id INTEGER REFERENCES study_plans(id) ON DELETE SET NULL,
                    user_id INTEGER NOT NULL REFERENCES users(id),

                    title VARCHAR(200) NOT NULL,
                    description TEXT,
                    milestone_type VARCHAR(50) NOT NULL,

                    target_value NUMERIC(10,2) NOT NULL,
                    current_value NUMERIC(10,2) DEFAULT 0,
                    is_completed BOOLEAN DEFAULT FALSE,
                    completed_at TIMESTAMP WITH TIME ZONE,

                    due_date TIMESTAMP WITH TIME ZONE,

                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
            """))

            print("[OK] 新表创建完成")

            # 创建索引
            print("\n创建索引...")
            indexes = [
                ("idx_session_scores_session_id", "CREATE INDEX IF NOT EXISTS idx_session_scores_session_id ON session_scores(session_id)"),
                ("idx_session_scores_final_score", "CREATE INDEX IF NOT EXISTS idx_session_scores_final_score ON session_scores(final_score)"),
                ("idx_learning_records_user_id", "CREATE INDEX IF NOT EXISTS idx_learning_records_user_id ON learning_records(user_id)"),
                ("idx_knowledge_points_code", "CREATE INDEX IF NOT EXISTS idx_knowledge_points_code ON knowledge_points(code)"),
                ("idx_student_knowledge_user_id", "CREATE INDEX IF NOT EXISTS idx_student_knowledge_user_id ON student_knowledge_mastery(user_id)"),
                ("idx_student_knowledge_point_id", "CREATE INDEX IF NOT EXISTS idx_student_knowledge_point_id ON student_knowledge_mastery(knowledge_point_id)"),
                ("idx_improvement_suggestions_user_id", "CREATE INDEX IF NOT EXISTS idx_improvement_suggestions_user_id ON improvement_suggestions(user_id)"),
                ("idx_study_plans_user_id", "CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id)"),
            ]

            for idx_name, sql in indexes:
                conn.execute(text(sql))
                print(f"  [OK] {idx_name}")

            # 插入默认数据
            print("\n插入默认数据...")

            # 默认评分规则
            conn.execute(text("""
                INSERT INTO scoring_rules (name, description, inquiry_weight, diagnosis_weight, communication_weight)
                VALUES
                ('默认评分标准', 'AISP系统默认评分标准', 0.40, 0.35, 0.25),
                ('初级学生标准', '适合初学者的评分标准，侧重问诊完整性', 0.50, 0.30, 0.20),
                ('高级学生标准', '适合高年级学生的评分标准，侧重诊断准确性', 0.30, 0.50, 0.20)
                ON CONFLICT DO NOTHING;
            """))

            print("[OK] 默认评分规则插入完成")

            # 示例知识点
            conn.execute(text("""
                INSERT INTO knowledge_points (code, name, category, difficulty)
                VALUES
                ('CARDIO-001', '心绞痛的问诊要点', '心血管', 'medium'),
                ('CARDIO-002', '急性心肌梗死鉴别诊断', '心血管', 'hard'),
                ('GASTRO-001', '急性胃炎问诊要点', '消化', 'easy'),
                ('RESP-001', '肺炎问诊要点', '呼吸', 'medium')
                ON CONFLICT (code) DO NOTHING;
            """))

            print("[OK] 示例知识点插入完成")

    print("\n" + "=" * 50)
    print("[OK] 迁移完成！")
    print("=" * 50)


if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\n[ERROR] 迁移失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
