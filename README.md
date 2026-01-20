# AISP - AI医学标准化病人系统

基于智谱AI GLM-4.7的医学教育对话系统，提供虚拟患者问诊训练和智能评分功能。

## 技术栈

```
FastAPI 0.109 + SQLAlchemy 2.0 + PostgreSQL 15+
智谱AI GLM-4.7 + LangChain + asyncpg
```

## 系统架构

```
前端层 → API层(FastAPI) → 服务层(ChatEngine/ScoringEngine) → PostgreSQL
                              ↓
                         智谱AI GLM-4.7
```

## 核心功能

### AI对话引擎
- 患者角色扮演（年龄/性格/症状）
- 情绪模拟（焦虑/疼痛等级）
- 对话历史管理与开场白生成
- 基于LangChain的提示词管理

### 智能评分系统
| 维度 | 权重 | 评分项 |
|------|------|--------|
| 问诊 | 40% | 关键问题覆盖、症状询问、逻辑性、医学礼仪 |
| 诊断 | 35% | 诊断准确性、鉴别诊断、推理能力 |
| 沟通 | 25% | 对话轮次、礼貌表达、共情能力 |

### 数据持久化
- 14张数据库表（用户/会话/病例/评分/学习）
- 完整的问诊记录与评分详情
- 知识点掌握度追踪
- 改进建议自动生成

## 快速开始

### 环境要求
```bash
Python 3.10+
PostgreSQL 15+
```

### 安装
```bash
git clone https://github.com/shashahaha/AISP.git
cd AISP
pip install -r requirements.txt
```

### 配置 (.env)
```bash
ZHIPU_API_KEY=your_api_key
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/aimed
```

### 初始化数据库
```bash
python scripts/init_db.py
```

### 启动服务
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

访问 http://localhost:8000/docs 查看API文档

## API接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/chat/start` | POST | 开始问诊会话 |
| `/api/chat/message` | POST | 发送问诊消息 |
| `/api/chat/end` | POST | 结束会话并评分 |
| `/api/chat/session/{id}` | GET | 获取会话详情 |
| `/api/chat/sessions` | GET | 获取会话列表 |

## 数据库结构

```
users / cases / chat_sessions / messages          # 核心业务
scoring_rules / session_scores / question_coverage / diagnosis_records / improvement_suggestions  # 评分系统
learning_records / knowledge_points / student_knowledge_mastery / study_plans / learning_milestones  # 学习管理
```

## 项目结构

```
app/
├── api/              # API路由
├── core/             # 核心引擎 (ChatEngine, ScoringEngine)
├── services/         # 服务层
├── models/           # 数据模型
└── db/               # 数据库配置
scripts/              # 工具脚本
docs/                 # 文档
```

## 文档

- [系统架构文档](AIserver.md)
- [数据库架构](docs/database_schema.md)
- [产品需求文档](AISP系统产品需求文档.md)

## 许可证

MIT License
