# AISP系统文档

基于 FastAPI + LangChain + 智谱AI GLM-4.7 的AI医学标准化病人系统。

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端层 (待开发)                          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ REST/WebSocket
┌──────────────────────────────▼──────────────────────────────────┐
│                        API层 (FastAPI)                           │
│  /api/chat/*  /api/scoring/*  /api/learning/*  /api/admin/*     │
└──────┬──────────────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────────┐
│                        服务层                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ ChatEngine   │  │ScoringEngine │  │ LearningService      │ │
│  │ 对话生成     │  │ 评分计算     │  │ 学习追踪             │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐                           │
│  │SessionService│  │UserService   │                           │
│  │会话管理      │  │用户管理      │                           │
│  └──────────────┘  └──────────────┘                           │
└──────┬──────────────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────────┐
│                    数据持久化层 (PostgreSQL)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐     │
│  │ users    │ │ cases    │ │chat_     │ │scoring_      │     │
│  │          │ │          │ │sessions  │ │tables        │     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘     │
│  ┌──────────┐ ┌──────────┐                                      │
│  │learning_ │ │knowledge │                                      │
│  │tables    │ │tables    │                                      │
│  └──────────┘ └──────────┘                                      │
└─────────────────────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────────┐
│                    外部服务                                       │
│  ┌──────────────┐  ┌──────────────┐                           │
│  │ 智谱AI GLM   │  │   (待扩展)    │                           │
│  │   LLM服务    │  │               │                           │
│  └──────────────┘  └──────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| Web框架 | FastAPI | 0.109 |
| LLM | 智谱AI GLM-4.7 | zai-sdk |
| 数据库 | PostgreSQL | 15+ |
| ORM | SQLAlchemy | 2.0 |
| 异步驱动 | asyncpg | - |
| 提示词管理 | LangChain | - |

## 核心模块

### 1. AI对话引擎 (ChatEngine)

**位置:** `app/core/chat_engine.py`

**功能:**
- 患者角色扮演 (年龄/性格/症状)
- 情绪模拟 (焦虑/疼痛等级)
- 对话历史管理
- 开场白生成

**核心方法:**
```python
class ChatEngine:
    async def start_session(case_data, user_id)
        → {"session_id", "opening_message", "case_info"}

    async def chat(session_id, user_message, case_data, history, turn_count)
        → ChatResponse(response, metadata, turn_count)

    async def end_session(session_id, history, case_data, student_diagnosis)
        → {"feedback", "key_questions_covered", "suggestions"}
```

**提示词结构 (PromptManager):**
```
SYSTEM_INSTRUCTION    # 角色规则 (拒答约束、回答规范)
    ↓
PERSONA_TEMPLATE      # 患者设定 (年龄/性格/症状)
    ↓
CONVERSATION_HISTORY  # 对话上下文 (最近10轮)
    ↓
智谱AI GLM-4.7        → 患者回复
```

### 2. 评分系统 (ScoringEngine)

**位置:** `app/core/scoring_engine.py` + `app/services/scoring_service.py`

**评分维度:**

| 维度 | 权重 | 评分项 | 分值范围 |
|------|------|--------|----------|
| **问诊** | 40% | 关键问题覆盖 | 0-40分 |
| | | 症状详细询问 | 0-20分 |
| | | 问诊逻辑性 | 0-20分 |
| | | 医学礼仪 | 0-20分 |
| **诊断** | 35% | 诊断准确性 | 0-35分 |
| | | 鉴别诊断 | 0-15分 |
| | | 诊断推理 | 0-20分 |
| **沟通** | 25% | 对话轮次 | 0-10分 |
| | | 礼貌表达 | 0-10分 |
| | | 共情能力 | 0-5分 |

**核心方法:**
```python
class ScoringEngine:
    def score_session(conversation_history, student_diagnosis, case_data)
        → ScoringResult(
            inquiry_total_score,      # 问诊总分 (0-40)
            diagnosis_total_score,    # 诊断总分 (0-35)
            communication_total_score, # 沟通总分 (0-25)
            final_score,              # 综合评分 (0-100)
            grade,                    # 等级 (A/B/C/D/F)
            passed,                   # 是否及格 (≥60分)
            diagnosis_accuracy,       # 诊断准确性 (correct/partial/wrong)
            covered_questions,        # 已覆盖问题列表
            missed_questions,         # 未覆盖问题列表
            suggestions               # 改进建议列表
          )
```

### 3. 数据库层

**位置:** `app/models/database.py` + `app/db/session.py`

**数据库表结构:**

#### 用户与权限 (3张表)
```sql
users           -- 用户表 (学生/教师/管理员)
chat_sessions   -- 问诊会话表
messages        -- 消息记录表
```

#### 病例管理 (1张表)
```sql
cases           -- 病例表 (含患者信息、症状、标准诊断)
```

#### 评分系统 (5张表)
```sql
scoring_rules           -- 评分规则配置
session_scores          -- 会话评分详情
question_coverage       -- 关键问题覆盖记录
diagnosis_records       -- 诊断记录
improvement_suggestions -- 改进建议
```

#### 学习管理 (5张表)
```sql
learning_records           -- 学习记录
knowledge_points          -- 知识点
student_knowledge_mastery -- 学生知识点掌握度
study_plans              -- 学习计划
learning_milestones      -- 学习里程碑
```

## API接口

### 对话API

| 端点 | 方法 | 说明 | 请求 |
|------|------|------|------|
| `/api/chat/start` | POST | 开始会话 | `{"case_id": "case_001"}` |
| `/api/chat/message` | POST | 发送消息 | `{"session_id", "message"}` |
| `/api/chat/end` | POST | 结束会话 | `{"session_id", "diagnosis"}` |
| `/api/chat/session/{id}` | GET | 会话详情 | - |
| `/api/chat/sessions` | GET | 会话列表 | `?status=active&limit=50` |

### 评分响应示例
```json
{
  "session_id": "xxx",
  "completed_at": "2024-01-20T07:19:59",
  "scores": {
    "inquiry": {
      "total": 32.0,
      "symptom_inquiry": 16,
      "inquiry_logic": 8,
      "medical_etiquette": 8,
      "coverage_rate": 80.0,
      "covered": ["疼痛性质", "放射部位"],
      "missed": ["既往史", "家族史"]
    },
    "diagnosis": {
      "total": 28,
      "accuracy": "correct",
      "differential_count": 2,
      "reasoning": 14
    },
    "communication": {
      "total": 20,
      "turn_count": 12,
      "polite_rate": 85.5,
      "empathy": 4.0
    },
    "total": 80.0
  },
  "grade": "B",
  "passed": true,
  "ai_comments": "问诊较为全面，诊断准确...",
  "suggestions": [
    {"type": "inquiry", "priority": "medium", "title": "...", "description": "..."}
  ]
}
```

## 配置

### 环境变量 (.env)
```bash
# 智谱AI
ZHIPU_API_KEY=your_api_key
ZHIPU_MODEL=glm-4.7

# 数据库
DATABASE_URL=postgresql+asyncpg://postgres:123456@localhost:5432/aimed
DATABASE_URL_SYNC=postgresql://postgres:123456@localhost:5432/aimed

# 应用
DEBUG=true
DEFAULT_TEMPERATURE=0.7
MAX_TOKENS=500
```

### 依赖安装
```bash
pip install -r requirements.txt
```

### 启动服务
```bash
# 开发环境
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 生产环境
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# 访问文档
http://localhost:8000/docs
```

### 数据库初始化
```bash
# 初始化数据库
python scripts/init_db.py

# 重置数据库
python scripts/reset_db.py
```

## 病例数据格式

```json
{
  "case_id": "case_001",
  "title": "胸痛待查",
  "difficulty": "medium",
  "category": "心血管内科",

  "patient_info": {
    "age": 58,
    "gender": "男",
    "occupation": "建筑工人",
    "personality": "内向、容易焦虑"
  },

  "chief_complaint": {
    "text": "胸痛3天，加重1小时"
  },

  "symptoms": {
    "location": "胸骨后",
    "nature": "压榨性疼痛",
    "severity": "7/10分",
    "onset": "3天前",
    "aggravating_factors": ["体力劳动", "情绪激动", "饱餐"],
    "relieving_factors": ["休息", "硝酸甘油"],
    "associated_symptoms": ["出汗", "恶心"]
  },

  "standard_diagnosis": "急性冠脉综合征",
  "differential_diagnosis": [
    "急性心肌梗死",
    "不稳定性心绞痛",
    "主动脉夹层"
  ],

  "key_questions": [
    "疼痛的性质和部位",
    "疼痛的诱发和缓解因素",
    "既往心脏病史",
    "高血压病、糖尿病史",
    "吸烟饮酒史",
    "家族史"
  ],

  "knowledge_points": ["心血管-001", "症状学-023"]
}
```

## 项目结构

```
AIMed/
├── app/
│   ├── api/              # API路由层
│   │   └── chat.py       # 对话API
│   ├── core/             # 核心业务逻辑
│   │   ├── chat_engine.py      # AI对话引擎
│   │   ├── prompt_manager.py   # 提示词管理
│   │   └── scoring_engine.py   # 评分引擎
│   ├── services/         # 服务层
│   │   ├── session_service.py  # 会话服务
│   │   └── scoring_service.py  # 评分服务
│   ├── models/           # 数据模型
│   │   ├── database.py   # SQLAlchemy模型
│   │   └── schemas.py    # Pydantic模型
│   ├── db/               # 数据库配置
│   │   └── session.py    # 异步会话
│   └── main.py           # FastAPI应用入口
├── scripts/              # 工具脚本
│   ├── init_db.py        # 数据库初始化
│   └── reset_db.py       # 数据库重置
├── docs/                 # 文档
│   └── database_schema.md
├── .env                  # 环境变量
├── requirements.txt      # 依赖清单
└── AIserver.md           # 本文档
```

## 开发指南

### 添加新评分规则
修改 `app/core/scoring_engine.py` 中的权重配置：
```python
class ScoringEngine:
    DEFAULT_WEIGHTS = {
        "inquiry": 0.40,
        "diagnosis": 0.35,
        "communication": 0.25
    }
```

### 添加新病例
1. 在数据库 `cases` 表中插入病例数据
2. 确保 `key_questions` 包含所有需要评估的关键问题
3. 设置合适的 `difficulty` 和 `category`

### 扩展学习功能
`app/services/` 下的服务可以扩展：
- 知识点推荐算法
- 学习路径规划
- 学习效果分析

## 许可证

MIT License
