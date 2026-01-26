-- AISP 数据库建表脚本
-- 手动创建表的SQL脚本（备用方案）

-- 创建枚举类型
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_status AS ENUM ('active', 'completed', 'abandoned');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    full_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'student',
    hashed_password VARCHAR(200),
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 病例表
CREATE TABLE IF NOT EXISTS cases (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) DEFAULT 'medium',
    category VARCHAR(50) DEFAULT '内科',

    -- 患者信息（JSON格式）
    patient_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    chief_complaint JSONB NOT NULL DEFAULT '{}'::jsonb,
    symptoms JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- 诊断相关
    standard_diagnosis VARCHAR(200),
    differential_diagnosis JSONB DEFAULT '[]'::jsonb,
    key_questions JSONB DEFAULT '[]'::jsonb,

    created_by INTEGER REFERENCES users(id),
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- 问诊会话表
CREATE TABLE IF NOT EXISTS chat_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    case_id INTEGER NOT NULL REFERENCES cases(id),

    status session_status DEFAULT 'active',

    -- 会话数据
    conversation_history JSONB DEFAULT '[]'::jsonb,
    turn_count INTEGER DEFAULT 0,

    -- 评分数据
    inquiry_score NUMERIC(5, 2),
    diagnosis_score NUMERIC(5, 2),
    communication_score NUMERIC(5, 2),
    total_score NUMERIC(5, 2),

    -- 学生提交的诊断
    student_diagnosis TEXT,

    -- 时间戳
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- student, patient, system
    content TEXT NOT NULL,

    -- 元数据（情绪、疼痛等级等）
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_cases_case_id ON cases(case_id);
CREATE INDEX IF NOT EXISTS idx_cases_category ON cases(category);
CREATE INDEX IF NOT EXISTS idx_cases_difficulty ON cases(difficulty);

CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_case_id ON chat_sessions(case_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON chat_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- 插入示例用户
INSERT INTO users (username, email, full_name, role, is_active)
VALUES
    ('admin', 'admin@aimed.com', '系统管理员', 'admin', 1),
    ('teacher', 'teacher@aimed.com', '张老师', 'teacher', 1),
    ('student1', 'student1@aimed.com', '李同学', 'student', 1)
ON CONFLICT (username) DO NOTHING;

-- 插入示例病例
INSERT INTO cases (case_id, title, description, difficulty, category, patient_info, chief_complaint, symptoms, standard_diagnosis, differential_diagnosis, key_questions, created_by, is_active)
VALUES
    (
        'case_001',
        '胸痛待查 - 不稳定性心绞痛',
        '58岁男性建筑工人，因胸痛3小时就诊。请完成问诊并做出诊断。',
        'medium',
        '心内科',
        '{"age": 58, "gender": "男", "occupation": "建筑工人", "education": "初中", "personality": "内向、焦虑"}'::jsonb,
        '{"text": "胸痛3小时"}'::jsonb,
        '{"location": "胸骨后", "nature": "压榨性疼痛", "severity": "7/10分", "duration": "持续5-10分钟", "radiation": "向左肩放射", "aggravating_factors": ["体力劳动", "情绪激动"], "relieving_factors": ["休息", "硝酸甘油"], "associated_symptoms": ["气短", "出汗"]}'::jsonb,
        '不稳定性心绞痛',
        '["急性心肌梗死", "主动脉夹层", "肺栓塞"]'::jsonb,
        '["疼痛的性质和部位", "疼痛的诱发和缓解因素", "既往心脏病史", "危险因素"]'::jsonb,
        1,
        1
    ),
    (
        'case_002',
        '腹痛待查 - 急性胃炎',
        '25岁女性白领，因上腹痛伴恶心呕吐1天就诊。请完成问诊并做出诊断。',
        'easy',
        '消化内科',
        '{"age": 25, "gender": "女", "occupation": "白领", "education": "本科", "personality": "年轻、表达清晰、略显紧张"}'::jsonb,
        '{"text": "上腹痛伴恶心呕吐1天"}'::jsonb,
        '{"location": "上腹部", "nature": "烧灼样疼痛", "severity": "6/10分", "duration": "阵发性加重", "aggravating_factors": ["进食后"], "relieving_factors": ["空腹"], "associated_symptoms": ["恶心", "呕吐", "食欲不振"]}'::jsonb,
        '急性胃炎',
        '["消化性溃疡", "急性胆囊炎", "急性胰腺炎"]'::jsonb,
        '["疼痛的部位和性质", "诱发因素", "饮食史", "伴随症状"]'::jsonb,
        1,
        1
    )
ON CONFLICT (case_id) DO NOTHING;

-- 显示完成信息
SELECT 'AISP 数据库表创建完成！' AS status;
SELECT COUNT(*) AS "用户数量" FROM users;
SELECT COUNT(*) AS "病例数量" FROM cases;
