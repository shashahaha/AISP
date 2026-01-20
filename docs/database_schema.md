# AISP 系统完整数据库表结构设计

## 表结构概览

```
aimed
├── 核心业务表
│   ├── users                    # 用户表
│   ├── cases                    # 病例表
│   ├── chat_sessions            # 会话表
│   └── messages                 # 消息表
│
├── 评分系统表
│   ├── scoring_rules            # 评分规则配置
│   ├── session_scores           # 会话评分详情
│   ├── question_coverage        # 关键问题覆盖记录
│   └── diagnosis_records        # 诊断记录
│
├── 学习管理表
│   ├── learning_records         # 学习记录
│   ├── knowledge_points         # 知识点
│   ├── student_knowledge_mastery # 学生知识点掌握度
│   ├── improvement_suggestions  # 改进建议
│   ├── study_plans              # 学习计划
│   └── learning_milestones      # 学习里程碑
│
└── 系统管理表
    ├── scoring_templates        # 评分模板
    ├── feedback_templates       # 反馈模板
    └── learning_paths           # 学习路径
```

---

## 1. 核心业务表

### 1.1 users (用户表)
```sql
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    full_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'student',
    hashed_password VARCHAR(200),
    is_active INTEGER DEFAULT 1,

    -- 学习相关
    total_sessions INTEGER DEFAULT 0,
    avg_score NUMERIC(5,2),
    completed_cases INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);
```

### 1.2 cases (病例表)
```sql
CREATE TABLE cases (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) DEFAULT 'medium',
    category VARCHAR(50) DEFAULT '内科',

    -- 患者信息 (JSON)
    patient_info JSONB NOT NULL DEFAULT '{}'::jsonb,
    chief_complaint JSONB NOT NULL DEFAULT '{}'::jsonb,
    symptoms JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- 诊断相关
    standard_diagnosis VARCHAR(200),
    differential_diagnosis JSONB DEFAULT '[]'::jsonb,
    key_questions JSONB DEFAULT '[]'::jsonb,

    -- 关联知识点
    knowledge_points JSONB DEFAULT '[]'::jsonb,

    created_by INTEGER REFERENCES users(id),
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### 1.3 chat_sessions (会话表)
```sql
CREATE TYPE session_status AS ENUM ('active', 'completed', 'abandoned');

CREATE TABLE chat_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    case_id INTEGER NOT NULL REFERENCES cases(id),
    status session_status DEFAULT 'active',

    -- 会话数据
    conversation_history JSONB DEFAULT '[]'::jsonb,
    turn_count INTEGER DEFAULT 0,

    -- 简化评分（快速查询）
    inquiry_score NUMERIC(5,2),
    diagnosis_score NUMERIC(5,2),
    communication_score NUMERIC(5,2),
    total_score NUMERIC(5,2),

    -- 学生提交的诊断
    student_diagnosis TEXT,

    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);
```

### 1.4 messages (消息表)
```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- student, patient, system
    content TEXT NOT NULL,
    meta_data JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 2. 评分系统表

### 2.1 scoring_rules (评分规则配置表)
```sql
CREATE TABLE scoring_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- 评分权重配置
    inquiry_weight NUMERIC(5,2) DEFAULT 0.40,    -- 问诊权重
    diagnosis_weight NUMERIC(5,2) DEFAULT 0.35,  -- 诊断权重
    communication_weight NUMERIC(5,2) DEFAULT 0.25, -- 沟通权重

    -- 问诊评分细则
    key_question_score NUMERIC(5,2) DEFAULT 40,   -- 关键问题覆盖分值
    symptom_detail_score NUMERIC(5,2) DEFAULT 20,  -- 症状细节分值
    logic_score NUMERIC(5,2) DEFAULT 20,          -- 问诊逻辑分值
    etiquette_score NUMERIC(5,2) DEFAULT 20,      -- 医德医风分值

    -- 诊断评分细则
    diagnosis_correct_score NUMERIC(5,2) DEFAULT 35,   -- 诊断正确分值
    diagnosis_partial_score NUMERIC(5,2) DEFAULT 15,    -- 诊断部分正确
    diagnosis_wrong_score NUMERIC(5,2) DEFAULT 0,       -- 诊断错误

    -- 沟通评分细则
    min_turns_for_full_score INTEGER DEFAULT 10,  -- 满分最少轮次
    min_turns_for_pass_score INTEGER DEFAULT 5,   -- 及格最少轮次

    is_active INTEGER DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### 2.2 session_scores (会话评分详情表)
```sql
CREATE TABLE session_scores (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    scoring_rule_id INTEGER REFERENCES scoring_rules(id),

    -- 问诊详细评分
    key_questions_covered INTEGER DEFAULT 0,      -- 已覆盖关键问题数
    key_questions_total INTEGER DEFAULT 0,        -- 总关键问题数
    key_question_coverage_rate NUMERIC(5,2),      -- 覆盖率

    covered_questions JSONB DEFAULT '[]'::jsonb,  -- 已覆盖的问题列表
    missed_questions JSONB DEFAULT '[]'::jsonb,   -- 遗漏的问题列表

    symptom_inquiry_score NUMERIC(5,2),          -- 症状询问评分
    inquiry_logic_score NUMERIC(5,2),            -- 问诊逻辑评分
    medical_etiquette_score NUMERIC(5,2),        -- 医德医风评分
    inquiry_total_score NUMERIC(5,2),            -- 问诊总分

    -- 诊断详细评分
    diagnosis_accuracy VARCHAR(20),               -- 诊断准确性 (correct/partial/wrong)
    differential_considered INTEGER DEFAULT 0,    -- 考虑的鉴别诊断数量
    diagnosis_reasoning_score NUMERIC(5,2),       -- 诊断推理评分
    diagnosis_total_score NUMERIC(5,2),           -- 诊断总分

    -- 沟通详细评分
    turn_count INTEGER DEFAULT 0,
    avg_response_length NUMERIC(5,2),             -- 平均回复长度
    polite_expression_rate NUMERIC(5,2),         -- 礼貌表达率
    empathy_score NUMERIC(5,2),                   -- 共情评分
    communication_total_score NUMERIC(5,2),       -- 沟通总分

    -- 综合评分
    final_score NUMERIC(5,2),                    -- 最终总分
    grade VARCHAR(10),                            -- 等级 (A/B/C/D/F)
    passed INTEGER DEFAULT 0,                     -- 是否及格

    -- AI评分备注
    ai_comments TEXT,                             -- AI评语
    reviewer_comments TEXT,                       -- 教师审核评语

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### 2.3 question_coverage (关键问题覆盖记录表)
```sql
CREATE TABLE question_coverage (
    id SERIAL PRIMARY KEY,
    session_score_id INTEGER NOT NULL REFERENCES session_scores(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,                  -- 问题内容
    question_category VARCHAR(50),                -- 问题分类 (现病史/既往史/个人史等)
    is_covered INTEGER DEFAULT 0,                 -- 是否被问及
    covered_at TIMESTAMP WITH TIME ZONE,          -- 问及时间
    question_quality VARCHAR(20),                 -- 问题质量 (excellent/good/fair/poor)

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.4 diagnosis_records (诊断记录表)
```sql
CREATE TABLE diagnosis_records (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,

    -- 学生诊断
    student_diagnosis TEXT NOT NULL,
    diagnosis_confidence VARCHAR(20),             -- 诊断信心度 (high/medium/low)
    reasoning TEXT,                               -- 诊断推理

    -- 标准答案对比
    standard_diagnosis TEXT NOT NULL,
    is_correct INTEGER DEFAULT 0,
    is_partial INTEGER DEFAULT 0,
    similarity_score NUMERIC(5,2),                -- 相似度分数

    -- 鉴别诊断
    mentioned_differential JSONB DEFAULT '[]'::jsonb,  -- 提到的鉴别诊断
    standard_differential JSONB DEFAULT '[]'::jsonb,    -- 标准鉴别诊断
    differential_coverage_rate NUMERIC(5,2),           -- 鉴别诊断覆盖率

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 3. 学习管理表

### 3.1 learning_records (学习记录表)
```sql
CREATE TABLE learning_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    session_id INTEGER REFERENCES chat_sessions(id),
    case_id INTEGER REFERENCES cases(id),
    activity_type VARCHAR(50) NOT NULL,           -- activity类型 (session/quiz/review)

    -- 学习数据
    score NUMERIC(5,2),
    time_spent INTEGER,                           -- 花费时间(秒)
    completion_rate NUMERIC(5,2),                 -- 完成率

    -- 知识点相关
    knowledge_points_tested JSONB DEFAULT '[]'::jsonb,
    knowledge_points_mastered JSONB DEFAULT '[]'::jsonb,
    knowledge_points_weak JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.2 knowledge_points (知识点表)
```sql
CREATE TABLE knowledge_points (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,             -- 知识点编号 (如: CARDIO-001)
    name VARCHAR(200) NOT NULL,                   -- 知识点名称
    category VARCHAR(50),                          -- 分类 (心血管/呼吸/消化等)
    description TEXT,

    -- 关联信息
    related_cases JSONB DEFAULT '[]'::jsonb,      -- 关联病例
    prerequisite_points JSONB DEFAULT '[]'::jsonb, -- 前置知识点
    difficulty VARCHAR(20) DEFAULT 'medium',

    -- 统计数据
    avg_mastery_rate NUMERIC(5,2),                -- 平均掌握度
    times_tested INTEGER DEFAULT 0,

    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### 3.3 student_knowledge_mastery (学生知识点掌握度表)
```sql
CREATE TABLE student_knowledge_mastery (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    knowledge_point_id INTEGER NOT NULL REFERENCES knowledge_points(id),

    -- 掌握度数据
    mastery_level VARCHAR(20),                    -- 掌握等级 (expert/proficient/developing/novice)
    mastery_rate NUMERIC(5,2),                    -- 掌握率 0-100
    correct_count INTEGER DEFAULT 0,              -- 正确次数
    total_attempts INTEGER DEFAULT 0,             -- 总尝试次数

    -- 时间追踪
    first_attempt_at TIMESTAMP WITH TIME ZONE,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE,      -- 建议复习时间

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,

    UNIQUE(user_id, knowledge_point_id)
);
```

### 3.4 improvement_suggestions (改进建议表)
```sql
CREATE TABLE improvement_suggestions (
    id SERIAL PRIMARY KEY,
    session_score_id INTEGER REFERENCES session_scores(id),
    user_id INTEGER NOT NULL REFERENCES users(id),

    suggestion_type VARCHAR(50) NOT NULL,         -- 建议类型 (inquiry/diagnosis/communication/knowledge)
    priority VARCHAR(20) DEFAULT 'medium',        -- 优先级 (high/medium/low)

    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    action_items JSONB DEFAULT '[]'::jsonb,       -- 行动建议列表

    -- 关联知识点
    related_knowledge_points JSONB DEFAULT '[]'::jsonb,

    -- 状态追踪
    status VARCHAR(20) DEFAULT 'pending',         -- 状态 (pending/in_progress/completed)
    completed_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.5 study_plans (学习计划表)
```sql
CREATE TABLE study_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- 计划数据
    start_date DATE NOT NULL,
    end_date DATE,
    target_score NUMERIC(5,2),                    -- 目标分数

    -- 计划内容
    planned_cases JSONB DEFAULT '[]'::jsonb,      -- 计划练习病例
    planned_knowledge_points JSONB DEFAULT '[]'::jsonb,

    -- 进度追踪
    total_milestones INTEGER DEFAULT 0,
    completed_milestones INTEGER DEFAULT 0,
    progress_rate NUMERIC(5,2),                   -- 进度百分比

    status VARCHAR(20) DEFAULT 'active',          -- 状态 (active/completed/paused)

    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### 3.6 learning_milestones (学习里程碑表)
```sql
CREATE TABLE learning_milestones (
    id SERIAL PRIMARY KEY,
    study_plan_id INTEGER REFERENCES study_plans(id) ON DELETE SET NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),

    title VARCHAR(200) NOT NULL,
    description TEXT,
    milestone_type VARCHAR(50) NOT NULL,          -- 类型 (case_count/score_level/knowledge mastery)

    -- 目标与完成状态
    target_value NUMERIC(10,2) NOT NULL,
    current_value NUMERIC(10,2) DEFAULT 0,
    is_completed INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,

    due_date TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. 系统管理表

### 4.1 scoring_templates (评分模板表)
```sql
CREATE TABLE scoring_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- 模板配置
    template_config JSONB NOT NULL,               -- 模板配置
    适用场景 TEXT,

    is_default INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 索引汇总

```sql
-- 性能优化索引
CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_case_id ON chat_sessions(case_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_started_at ON chat_sessions(started_at);
CREATE INDEX idx_chat_sessions_total_score ON chat_sessions(total_score);

CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

CREATE INDEX idx_session_scores_session_id ON session_scores(session_id);
CREATE INDEX idx_learning_records_user_id ON learning_records(user_id);
CREATE INDEX idx_student_knowledge_mastery_user_id ON student_knowledge_mastery(user_id);
CREATE INDEX idx_student_knowledge_mastery_point_id ON student_knowledge_mastery(knowledge_point_id);
```

---

## 视图定义

```sql
-- 学生学习概览视图
CREATE VIEW student_learning_overview AS
SELECT
    u.id AS user_id,
    u.username,
    u.full_name,
    COUNT(DISTINCT cs.id) AS total_sessions,
    AVG(cs.total_score) AS avg_score,
    COUNT(DISTINCT CASE WHEN cs.status = 'completed' THEN cs.case_id END) AS completed_cases,
    MAX(cs.started_at) AS last_practice_date
FROM users u
LEFT JOIN chat_sessions cs ON u.id = cs.user_id
GROUP BY u.id, u.username, u.full_name;

-- 病例统计视图
CREATE VIEW case_statistics AS
SELECT
    c.id AS case_id,
    c.case_id,
    c.title,
    c.category,
    c.difficulty,
    COUNT(cs.id) AS practice_count,
    AVG(cs.total_score) AS avg_score,
    AVG(cs.turn_count) AS avg_turns
FROM cases c
LEFT JOIN chat_sessions cs ON c.id = cs.case_id
GROUP BY c.id, c.case_id, c.title, c.category, c.difficulty;
```

---

## 数据关系图

```
users (1) ----< (N) chat_sessions
       |
       | 1
       |
       N
       |
       v
learning_records (1) ----< (N) knowledge_points
       |
       | 1
       |
       N
       |
       v
student_knowledge_mastery

cases (1) ----< (N) chat_sessions
       |
       | 1
       |
       N
       |
       v
knowledge_points (N:M)

chat_sessions (1) ----< (1) session_scores
       |
       | 1
       |
       N
       |
       v
question_coverage, diagnosis_records, messages

session_scores (1) ----< (N) improvement_suggestions
```

---

## 默认数据

### 默认评分规则
```sql
INSERT INTO scoring_rules (name, inquiry_weight, diagnosis_weight, communication_weight) VALUES
('默认评分标准', 0.40, 0.35, 0.25),
('初级学生标准', 0.50, 0.30, 0.20),
('高级学生标准', 0.30, 0.50, 0.20);
```

### 示例知识点
```sql
INSERT INTO knowledge_points (code, name, category, difficulty) VALUES
('CARDIO-001', '心绞痛的问诊要点', '心血管', 'medium'),
('CARDIO-002', '急性心肌梗死鉴别诊断', '心血管', 'hard'),
('GASTRO-001', '急性胃炎问诊要点', '消化', 'easy');
```
