# AI对话引擎服务

基于 FastAPI + LangChain + 智谱AI GLM-4.7 的医学教育对话引擎。

## 技术架构

```
客户端 → FastAPI → ChatEngine → PromptManager → 智谱AI GLM-4.7
                ↓                    ↓
           SessionService      SafetyFilter
                ↓
           PostgreSQL (会话持久化)
```

## 技术栈

| 组件 | 技术 |
|------|------|
| Web框架 | FastAPI 0.109 |
| LLM | 智谱AI GLM-4.7 (zai-sdk) |
| 数据库 | PostgreSQL + SQLAlchemy |
| 通信协议 | REST / WebSocket |
| 异步处理 | asyncio + asyncpg |

## 核心模块

### ChatEngine (app/core/chat_engine.py)
```python
class ChatEngine:
    async def start_session(case_data, user_id)  # 创建会话
    async def chat(session_id, message, case_data, history)  # 对话处理
    async def end_session(session_id, history, case_data)  # 生成反馈
```

### PromptManager (app/core/prompt_manager.py)
```python
# 三层提示词结构
SYSTEM_INSTRUCTION    # 角色规则 (拒答约束、回答规范)
PERSONA_TEMPLATE      # 患者设定 (年龄/性格/症状)
CONVERSATION_HISTORY  # 对话上下文 (最近10轮)
```

### SafetyFilter (app/core/safety_filter.py)
```python
# 输入过滤
- 危险信号检测 (自杀/暴力倾向)
- 拒答判断 (药物剂量/诊断/治疗)

# 输出验证
- 医学术语检测
- 角色一致性验证
- 回复长度控制
```

### SessionService (app/services/session_service.py)
```python
# 会话管理 (PostgreSQL持久化)
async def create_session()      # 创建会话
async def add_message()         # 保存消息
async def save_scores()         # 保存评分
async def get_session_by_id()   # 查询会话
```

## API接口

### REST API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/chat/start` | POST | 开始会话 |
| `/api/chat/message` | POST | 发送消息 |
| `/api/chat/end` | POST | 结束会话 |
| `/api/chat/session/{id}` | GET | 查询会话 |
| `/api/chat/sessions` | GET | 会话列表 |

### WebSocket

```
ws://localhost:8000/ws/chat/{session_id}
```

消息格式：
```json
{"type": "start", "case_id": "case_001"}
{"type": "message", "content": "请问您哪里不舒服？"}
{"type": "end", "diagnosis": "不稳定性心绞痛"}
```

## 配置

### 环境变量 (.env)
```bash
# 智谱AI
ZHIPU_API_KEY=your_api_key
ZHIPU_MODEL=glm-4.7

# 数据库
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/aimed

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
python app/main.py
# 访问 http://localhost:8000/docs
```

## 病例数据格式

```json
{
  "case_id": "case_001",
  "patient_info": {
    "age": 58,
    "gender": "男",
    "occupation": "建筑工人",
    "personality": "内向、焦虑"
  },
  "symptoms": {
    "location": "胸骨后",
    "nature": "压榨性疼痛",
    "severity": "7/10分",
    "aggravating_factors": ["体力劳动", "情绪激动"],
    "relieving_factors": ["休息", "硝酸甘油"]
  },
  "standard_diagnosis": "不稳定性心绞痛",
  "key_questions": ["疼痛性质", "诱发因素"]
}
```

## 数据库表结构

```sql
-- 会话表
CREATE TABLE chat_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE,
    user_id INTEGER,
    case_id VARCHAR(50),
    status VARCHAR(20),  -- active/completed/abandoned
    conversation_history JSON,
    turn_count INTEGER,
    inquiry_score FLOAT,
    diagnosis_score FLOAT,
    communication_score FLOAT,
    total_score FLOAT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- 消息表
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES chat_sessions(id),
    role VARCHAR(20),  -- student/patient/system
    content TEXT,
    metadata JSON,
    timestamp TIMESTAMP
);
```

## 评分规则

| 项目 | 权重 | 计算方式 |
|------|------|----------|
| 问诊完整度 | 40% | 关键问题覆盖率 × 40 |
| 诊断准确性 | 35% | 正确=35分，错误=0分 |
| 沟通能力 | 25% | ≥10轮=25，≥5轮=20，<5轮=15 |
