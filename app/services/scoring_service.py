"""
评分服务层 - 负责评分相关的数据库操作
"""

from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime

from app.models.database import (
    SessionScore, ScoringRule, QuestionCoverage, DiagnosisRecord,
    LearningRecord, ImprovementSuggestion, KnowledgePoint,
    StudentKnowledgeMastery, ChatSession
)
from app.core.scoring_engine import ScoringEngine, ScoringResult


class ScoringService:
    """评分服务"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.engine = ScoringEngine()

    async def score_session(
        self,
        session_id: int,
        conversation_history: list,
        student_diagnosis: str,
        case_data: Dict[str, Any],
        scoring_rule_id: Optional[int] = None
    ) -> SessionScore:
        """
        对会话进行评分并保存结果

        Args:
            session_id: 会话ID
            conversation_history: 对话历史
            student_diagnosis: 学生诊断
            case_data: 病例数据
            scoring_rule_id: 评分规则ID（可选）

        Returns:
            SessionScore对象
        """
        # 使用评分引擎计算评分
        result = self.engine.score_session(
            conversation_history=conversation_history,
            student_diagnosis=student_diagnosis,
            case_data=case_data
        )

        # 获取会话的用户ID
        session_result = await self.db.execute(
            select(ChatSession).where(ChatSession.id == session_id)
        )
        chat_session = session_result.scalar_one_or_none()
        user_id = chat_session.user_id if chat_session else 1  # 默认用户ID

        # 创建评分记录
        session_score = SessionScore(
            session_id=session_id,
            scoring_rule_id=scoring_rule_id,

            # 问诊详细评分
            key_questions_covered=result.key_questions_covered,
            key_questions_total=result.key_questions_total,
            key_question_coverage_rate=result.coverage_rate,
            covered_questions=result.covered_questions,
            missed_questions=result.missed_questions,
            symptom_inquiry_score=result.symptom_inquiry_score,
            inquiry_logic_score=result.inquiry_logic_score,
            medical_etiquette_score=result.medical_etiquette_score,
            inquiry_total_score=result.inquiry_total_score,

            # 诊断详细评分
            diagnosis_accuracy=result.diagnosis_accuracy,
            differential_considered=result.differential_count,
            diagnosis_reasoning_score=result.diagnosis_reasoning_score,
            diagnosis_total_score=result.diagnosis_total_score,

            # 沟通详细评分
            turn_count=result.turn_count,
            avg_response_length=result.avg_response_length,
            polite_expression_rate=result.polite_rate,
            empathy_score=result.empathy_score,
            communication_total_score=result.communication_total_score,

            # 综合评分
            final_score=result.final_score,
            grade=result.grade,
            passed=result.passed,

            # AI评语
            ai_comments=result.ai_comments
        )

        self.db.add(session_score)
        await self.db.flush()

        # 创建问题覆盖记录
        for question in result.covered_questions:
            self.db.add(QuestionCoverage(
                session_score_id=session_score.id,
                question_text=question,
                question_category="现病史",
                is_covered=True,
                covered_at=datetime.utcnow()
            ))

        for question in result.missed_questions:
            self.db.add(QuestionCoverage(
                session_score_id=session_score.id,
                question_text=question,
                question_category="现病史",
                is_covered=False
            ))

        # 创建改进建议
        for suggestion in result.suggestions:
            # 确定建议类型
            suggestion_type = "inquiry"  # 默认
            if "诊断" in suggestion or "鉴别" in suggestion:
                suggestion_type = "diagnosis"
            elif "沟通" in suggestion or "礼貌" in suggestion or "共情" in suggestion:
                suggestion_type = "communication"

            self.db.add(ImprovementSuggestion(
                session_score_id=session_score.id,
                user_id=user_id,
                suggestion_type=suggestion_type,
                title="改进建议",
                description=suggestion,
                action_items=[]
            ))

        # 创建诊断记录
        self.db.add(DiagnosisRecord(
            session_id=session_id,
            student_diagnosis=student_diagnosis,
            standard_diagnosis=case_data.get("standard_diagnosis", ""),
            is_correct=(result.diagnosis_accuracy == "correct"),
            is_partial=(result.diagnosis_accuracy == "partial"),
            diagnosis_confidence="high" if result.diagnosis_accuracy == "correct" else "medium"
        ))

        await self.db.commit()

        return session_score

    async def get_session_score(self, session_id: int) -> Optional[SessionScore]:
        """获取会话评分"""
        result = await self.db.execute(
            select(SessionScore)
            .where(SessionScore.session_id == session_id)
        )
        return result.scalar_one_or_none()

    async def get_active_scoring_rule(self) -> Optional[ScoringRule]:
        """获取活跃的评分规则"""
        result = await self.db.execute(
            select(ScoringRule)
            .where(ScoringRule.is_active == True)
            .order_by(ScoringRule.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def create_learning_record(
        self,
        user_id: int,
        session_id: int,
        case_id: int,
        score: float,
        time_spent: int,
        knowledge_tested: list,
        knowledge_mastered: list,
        knowledge_weak: list
    ) -> LearningRecord:
        """创建学习记录"""
        record = LearningRecord(
            user_id=user_id,
            session_id=session_id,
            case_id=case_id,
            activity_type="session",
            score=score,
            time_spent=time_spent,
            completion_rate=1.0,  # 完成的会话
            knowledge_points_tested=knowledge_tested,
            knowledge_points_mastered=knowledge_mastered,
            knowledge_points_weak=knowledge_weak
        )

        self.db.add(record)
        await self.db.commit()

        return record

    async def update_knowledge_mastery(
        self,
        user_id: int,
        case_data: Dict[str, Any],
        score: float,
        passed: bool
    ):
        """
        更新知识点掌握度

        Args:
            user_id: 用户ID
            case_data: 病例数据
            score: 评分
            passed: 是否及格
        """
        # 获取病例关联的知识点
        knowledge_point_codes = case_data.get("knowledge_points", [])

        if not knowledge_point_codes:
            # 如果病例没有指定知识点，根据类别推断
            category = case_data.get("category", "")
            code_prefix = {
                "心内科": "CARDIO",
                "心内科": "CARDIO",
                "心内": "CARDIO",
                "消化内科": "GASTRO",
                "消化": "GASTRO",
                "呼吸内科": "RESP",
                "呼吸": "RESP"
            }.get(category, "")

            if code_prefix:
                knowledge_point_codes = [f"{code_prefix}-001"]

        # 更新每个知识点的掌握度
        for code in knowledge_point_codes:
            # 查找知识点
            result = await self.db.execute(
                select(KnowledgePoint)
                .where(KnowledgePoint.code == code)
            )
            point = result.scalar_one_or_none()

            if not point:
                continue

            # 查找或创建掌握记录
            mastery_result = await self.db.execute(
                select(StudentKnowledgeMastery)
                .where(
                    and_(
                        StudentKnowledgeMastery.user_id == user_id,
                        StudentKnowledgeMastery.knowledge_point_id == point.id
                    )
                )
            )
            mastery = mastery_result.scalar_one_or_none()

            now = datetime.utcnow()

            if mastery:
                # 更新现有记录
                mastery.total_attempts += 1
                if passed:
                    mastery.correct_count += 1

                # 计算新的掌握率
                mastery.mastery_rate = (mastery.correct_count / mastery.total_attempts) * 100
                mastery.last_attempt_at = now

                # 确定掌握等级
                if mastery.mastery_rate >= 90:
                    mastery.mastery_level = MasteryLevel.EXPERT
                elif mastery.mastery_rate >= 75:
                    mastery.mastery_level = MasteryLevel.PROFICIENT
                elif mastery.mastery_rate >= 60:
                    mastery.mastery_level = MasteryLevel.DEVELOPING
                else:
                    mastery.mastery_level = MasteryLevel.NOVICE

            else:
                # 创建新记录
                mastery_rate = 100 if passed else 0

                if mastery_rate >= 90:
                    level = MasteryLevel.EXPERT
                elif mastery_rate >= 75:
                    level = MasteryLevel.PROFICIENT
                elif mastery_rate >= 60:
                    level = MasteryLevel.DEVELOPING
                else:
                    level = MasteryLevel.NOVICE

                mastery = StudentKnowledgeMastery(
                    user_id=user_id,
                    knowledge_point_id=point.id,
                    mastery_level=level,
                    mastery_rate=mastery_rate,
                    correct_count=1 if passed else 0,
                    total_attempts=1,
                    first_attempt_at=now,
                    last_attempt_at=now
                )

                self.db.add(mastery)

        await self.db.commit()

    async def get_user_learning_progress(
        self,
        user_id: int,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        获取用户学习进度

        Args:
            user_id: 用户ID
            limit: 返回记录数量限制

        Returns:
            学习进度统计
        """
        # 获取最近的学习记录
        result = await self.db.execute(
            select(LearningRecord)
            .where(LearningRecord.user_id == user_id)
            .order_by(LearningRecord.created_at.desc())
            .limit(limit)
        )
        records = result.scalars().all()

        # 计算统计数据
        total_sessions = len(records)
        if total_sessions > 0:
            avg_score = sum(r.score or 0 for r in records) / total_sessions
            total_time = sum(r.time_spent or 0 for r in records)
        else:
            avg_score = 0
            total_time = 0

        # 获取知识点掌握统计
        mastery_result = await self.db.execute(
            select(StudentKnowledgeMastery)
            .where(StudentKnowledgeMastery.user_id == user_id)
        )
        mastery_records = mastery_result.scalars().all()

        knowledge_stats = {
            "total_points": len(mastery_records),
            "expert": sum(1 for m in mastery_records if m.mastery_level == MasteryLevel.EXPERT),
            "proficient": sum(1 for m in mastery_records if m.mastery_level == MasteryLevel.PROFICIENT),
            "developing": sum(1 for m in mastery_records if m.mastery_level == MasteryLevel.DEVELOPING),
            "novice": sum(1 for m in mastery_records if m.mastery_level == MasteryLevel.NOVICE)
        }

        return {
            "total_sessions": total_sessions,
            "avg_score": round(avg_score, 2),
            "total_time_spent": total_time,
            "recent_records": [
                {
                    "id": r.id,
                    "activity_type": r.activity_type,
                    "score": r.score,
                    "time_spent": r.time_spent,
                    "created_at": r.created_at.isoformat() if r.created_at else None
                }
                for r in records[:10]
            ],
            "knowledge_mastery": knowledge_stats
        }

    async def get_improvement_suggestions(
        self,
        user_id: int,
        status: Optional[str] = None,
        limit: int = 20
    ) -> list:
        """
        获取用户的改进建议

        Args:
            user_id: 用户ID
            status: 状态筛选
            limit: 返回数量限制

        Returns:
            ImprovementSuggestion列表
        """
        query = select(ImprovementSuggestion).where(
            ImprovementSuggestion.user_id == user_id
        )

        if status:
            query = query.where(ImprovementSuggestion.status == status)

        query = query.order_by(
            ImprovementSuggestion.created_at.desc(),
            ImprovementSuggestion.priority.desc()
        ).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()
