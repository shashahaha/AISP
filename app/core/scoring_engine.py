"""
评分引擎 - AISP系统的核心评分模块

功能：
1. 问诊评分 (40%) - 关键问题覆盖、症状询问、问诊逻辑、医德医风
2. 诊断评分 (35%) - 诊断准确性、鉴别诊断、推理过程
3. 沟通评分 (25%) - 对话轮次、礼貌表达、共情能力
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
import re


@dataclass
class ScoringResult:
    """评分结果"""
    # 问诊评分
    key_questions_covered: int
    key_questions_total: int
    coverage_rate: float
    covered_questions: List[str]
    missed_questions: List[str]

    # 问诊详细评分
    symptom_inquiry_score: float
    inquiry_logic_score: float
    medical_etiquette_score: float
    inquiry_total_score: float

    # 诊断详细评分
    diagnosis_accuracy: str  # correct/partial/wrong
    differential_count: int
    diagnosis_reasoning_score: float
    diagnosis_total_score: float

    # 沟通详细评分
    turn_count: int
    avg_response_length: float
    polite_rate: float
    empathy_score: float
    communication_total_score: float

    # 综合评分
    final_score: float
    grade: str
    passed: bool

    # 建议
    suggestions: List[str]

    # 元数据
    ai_comments: str


class ScoringEngine:
    """评分引擎"""

    # 默认评分权重
    DEFAULT_WEIGHTS = {
        "inquiry": 0.40,      # 问诊权重
        "diagnosis": 0.35,    # 诊断权重
        "communication": 0.25 # 沟通权重
    }

    # 默认评分标准
    DEFAULT_STANDARDS = {
        # 问诊评分标准
        "key_question_score": 40,      # 关键问题分值
        "symptom_detail_score": 20,     # 症状细节分值
        "logic_score": 20,              # 逻辑分值
        "etiquette_score": 20,          # 医德分值

        # 诊断评分标准
        "correct_score": 35,            # 正确分值
        "partial_score": 15,            # 部分正确分值
        "wrong_score": 0,               # 错误分值

        # 沟通评分标准
        "full_turns": 10,               # 满分轮次
        "pass_turns": 5,                # 及格轮次
    }

    def __init__(self, weights: Dict[str, float] = None, standards: Dict[str, Any] = None):
        """
        初始化评分引擎

        Args:
            weights: 评分权重配置
            standards: 评分标准配置
        """
        self.weights = weights or self.DEFAULT_WEIGHTS.copy()
        self.standards = standards or self.DEFAULT_STANDARDS.copy()

    def score_session(
        self,
        conversation_history: List[Dict[str, Any]],
        student_diagnosis: str,
        case_data: Dict[str, Any]
    ) -> ScoringResult:
        """
        对整个会话进行评分

        Args:
            conversation_history: 对话历史
            student_diagnosis: 学生诊断
            case_data: 病例数据

        Returns:
            ScoringResult对象
        """
        # 1. 问诊评分
        inquiry_result = self._score_inquiry(conversation_history, case_data)

        # 2. 诊断评分
        diagnosis_result = self._score_diagnosis(
            conversation_history,
            student_diagnosis,
            case_data
        )

        # 3. 沟通评分
        communication_result = self._score_communication(conversation_history)

        # 4. 计算综合评分
        final_score = (
            inquiry_result["total"] * self.weights["inquiry"] +
            diagnosis_result["total"] * self.weights["diagnosis"] +
            communication_result["total"] * self.weights["communication"]
        )

        # 5. 计算等级
        grade = self._calculate_grade(final_score)
        passed = final_score >= 60

        # 6. 生成建议
        suggestions = self._generate_suggestions(
            inquiry_result,
            diagnosis_result,
            communication_result,
            case_data
        )

        # 7. 生成AI评语
        ai_comments = self._generate_ai_comments(
            final_score,
            grade,
            inquiry_result,
            diagnosis_result,
            communication_result
        )

        return ScoringResult(
            # 问诊评分
            key_questions_covered=inquiry_result["covered_count"],
            key_questions_total=inquiry_result["total_count"],
            coverage_rate=inquiry_result["coverage_rate"],
            covered_questions=inquiry_result["covered"],
            missed_questions=inquiry_result["missed"],

            # 问诊详细评分
            symptom_inquiry_score=inquiry_result["symptom_score"],
            inquiry_logic_score=inquiry_result["logic_score"],
            medical_etiquette_score=inquiry_result["etiquette_score"],
            inquiry_total_score=inquiry_result["total"],

            # 诊断详细评分
            diagnosis_accuracy=diagnosis_result["accuracy"],
            differential_count=diagnosis_result["differential_count"],
            diagnosis_reasoning_score=diagnosis_result["reasoning_score"],
            diagnosis_total_score=diagnosis_result["total"],

            # 沟通详细评分
            turn_count=communication_result["turn_count"],
            avg_response_length=communication_result["avg_length"],
            polite_rate=communication_result["polite_rate"],
            empathy_score=communication_result["empathy_score"],
            communication_total_score=communication_result["total"],

            # 综合评分
            final_score=round(final_score, 2),
            grade=grade,
            passed=passed,

            # 建议
            suggestions=suggestions,

            # AI评语
            ai_comments=ai_comments
        )

    def _score_inquiry(
        self,
        conversation_history: List[Dict[str, Any]],
        case_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        问诊评分

        评分维度：
        1. 关键问题覆盖 (40分)
        2. 症状细节询问 (20分)
        3. 问诊逻辑 (20分)
        4. 医德医风 (20分)
        """
        # 提取学生问题
        student_questions = [
            msg.get("content", "")
            for msg in conversation_history
            if msg.get("role") == "student"
        ]

        # 获取关键问题列表
        key_questions = case_data.get("key_questions", [])

        # 1. 检查关键问题覆盖
        covered = []
        missed = []

        for question in key_questions:
            found = False
            question_lower = question.lower()

            for student_q in student_questions:
                # 检查是否包含关键词
                keywords = self._extract_keywords(question)
                if any(kw.lower() in student_q.lower() for kw in keywords):
                    found = True
                    break

            if found:
                covered.append(question)
            else:
                missed.append(question)

        coverage_rate = len(covered) / len(key_questions) if key_questions else 0
        key_question_score = coverage_rate * self.standards["key_question_score"]

        # 2. 症状细节询问评分
        symptom_score = self._score_symptom_inquiry(student_questions, case_data)

        # 3. 问诊逻辑评分
        logic_score = self._score_inquiry_logic(student_questions, case_data)

        # 4. 医德医风评分
        etiquette_score = self._score_medical_etiquette(student_questions)

        # 总分
        total = key_question_score + symptom_score + logic_score + etiquette_score

        return {
            "covered_count": len(covered),
            "total_count": len(key_questions),
            "coverage_rate": coverage_rate,
            "covered": covered,
            "missed": missed,
            "symptom_score": symptom_score,
            "logic_score": logic_score,
            "etiquette_score": etiquette_score,
            "total": total
        }

    def _score_diagnosis(
        self,
        conversation_history: List[Dict[str, Any]],
        student_diagnosis: str,
        case_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        诊断评分

        评分维度：
        1. 诊断准确性 (基础分)
        2. 鉴别诊断考虑
        3. 诊断推理
        """
        standard_diagnosis = case_data.get("standard_diagnosis", "")
        differential_diagnosis = case_data.get("differential_diagnosis", [])

        # 1. 检查诊断准确性
        accuracy, base_score = self._check_diagnosis_accuracy(
            student_diagnosis,
            standard_diagnosis
        )

        # 2. 检查鉴别诊断
        differential_count = self._count_differential_mentioned(
            student_diagnosis,
            conversation_history,
            differential_diagnosis
        )

        # 3. 诊断推理评分
        reasoning_score = self._score_diagnosis_reasoning(
            conversation_history,
            case_data
        )

        # 总分
        total = base_score + reasoning_score

        return {
            "accuracy": accuracy,
            "differential_count": differential_count,
            "reasoning_score": reasoning_score,
            "total": min(total, 35)  # 诊断满分35
        }

    def _score_communication(
        self,
        conversation_history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        沟通评分

        评分维度：
        1. 对话轮次
        2. 礼貌表达
        3. 共情能力
        """
        # 统计轮次
        student_messages = [
            msg for msg in conversation_history
            if msg.get("role") == "student"
        ]
        turn_count = len(student_messages)

        # 1. 轮次评分
        turn_score = self._score_turn_count(turn_count)

        # 2. 礼貌表达评分
        polite_rate, polite_score = self._score_polite_expression(student_messages)

        # 3. 共情评分
        empathy_score = self._score_empathy(student_messages)

        # 平均回复长度
        avg_length = 0
        if student_messages:
            total_length = sum(len(msg.get("content", "")) for msg in student_messages)
            avg_length = total_length / len(student_messages)

        # 总分
        total = turn_score + polite_score + empathy_score

        return {
            "turn_count": turn_count,
            "avg_length": avg_length,
            "polite_rate": polite_rate,
            "empathy_score": empathy_score,
            "total": min(total, 25)  # 沟通满分25
        }

    def _extract_keywords(self, question: str) -> List[str]:
        """从问题中提取关键词"""
        # 移除标点符号
        question = re.sub(r'[^\w\s]', '', question)

        # 分词
        words = question.split()

        # 过滤掉常用词
        stop_words = {"的", "了", "是", "在", "有", "和", "与", "或"}
        keywords = [w for w in words if w not in stop_words and len(w) > 1]

        return keywords

    def _score_symptom_inquiry(
        self,
        questions: List[str],
        case_data: Dict[str, Any]
    ) -> float:
        """
        症状细节询问评分

        检查是否询问了症状的各个维度
        """
        symptoms = case_data.get("symptoms", {})
        all_text = " ".join(questions).lower()

        score = 0
        max_score = self.standards["symptom_detail_score"]

        # 检查各个症状维度
        dimensions = [
            ("部位", symptoms.get("location", ""), ["部位", "哪里", "位置"]),
            ("性质", symptoms.get("nature", ""), ["性质", "怎么", "样", "感觉"]),
            ("程度", symptoms.get("severity", ""), ["程度", "多", "严重", "几分"]),
            ("持续时间", symptoms.get("duration", ""), ["多久", "多长时间", "持续"]),
            ("诱因", symptoms.get("aggravating_factors", []), ["诱因", "什么", "原因", "引起"]),
            ("缓解因素", symptoms.get("relieving_factors", []), ["缓解", "怎么", "舒服"]),
            ("伴随症状", symptoms.get("associated_symptoms", []), ["还", "其他", "伴随"])
        ]

        for dim_name, dim_value, keywords in dimensions:
            if isinstance(dim_value, list):
                dim_value = " ".join(dim_value)

            # 检查是否询问了该维度
            if any(kw in all_text for kw in keywords):
                score += max_score / len(dimensions)

        return min(score, max_score)

    def _score_inquiry_logic(
        self,
        questions: List[str],
        case_data: Dict[str, Any]
    ) -> float:
        """
        问诊逻辑评分

        评估问诊是否有逻辑性（从一般到具体）
        """
        if not questions:
            return 0

        max_score = self.standards["logic_score"]
        score = max_score  # 默认满分

        # 检查是否有重复问题
        unique_questions = set()
        duplicates = 0
        for q in questions:
            q_normalized = re.sub(r'[^\w\s]', '', q.lower().strip())
            if q_normalized in unique_questions and len(q_normalized) > 5:
                duplicates += 1
            unique_questions.add(q_normalized)

        # 重复问题扣分
        if duplicates > 0:
            score -= (duplicates * 2)

        return max(score, 0)

    def _score_medical_etiquette(self, questions: List[str]) -> float:
        """
        医德医风评分

        检查是否有礼貌用语
        """
        max_score = self.standards["etiquette_score"]

        polite_patterns = [
            r"请", r"您好", r"麻烦", r"谢谢", r"不好意思"
        ]

        polite_count = 0
        for q in questions:
            for pattern in polite_patterns:
                if re.search(pattern, q):
                    polite_count += 1
                    break

        # 至少一半的问题有礼貌用语才能得满分
        if len(questions) > 0:
            polite_rate = polite_count / len(questions)
            score = polite_rate * max_score
        else:
            score = 0

        return score

    def _check_diagnosis_accuracy(
        self,
        student_diagnosis: str,
        standard_diagnosis: str
    ) -> Tuple[str, float]:
        """检查诊断准确性"""
        student_lower = student_diagnosis.lower()
        standard_lower = standard_diagnosis.lower()

        # 完全匹配
        if standard_lower in student_lower or student_lower in standard_lower:
            return "correct", self.standards["correct_score"]

        # 部分匹配（包含关键词）
        student_words = set(re.findall(r'[\w]+', student_lower))
        standard_words = set(re.findall(r'[\w]+', standard_lower))
        overlap = student_words & standard_words

        if len(overlap) >= 2:
            return "partial", self.standards["partial_score"]

        return "wrong", self.standards["wrong_score"]

    def _count_differential_mentioned(
        self,
        student_diagnosis: str,
        conversation_history: List[Dict[str, Any]],
        differential_diagnosis: List[str]
    ) -> int:
        """计算提及的鉴别诊断数量"""
        if not differential_diagnosis:
            return 0

        count = 0
        all_text = (student_diagnosis + " " + " ".join(
            msg.get("content", "") for msg in conversation_history
        )).lower()

        for diff in differential_diagnosis:
            if diff.lower() in all_text:
                count += 1

        return count

    def _score_diagnosis_reasoning(
        self,
        conversation_history: List[Dict[str, Any]],
        case_data: Dict[str, Any]
    ) -> float:
        """诊断推理评分"""
        # 简化版：基于问诊完整度
        student_questions = [
            msg.get("content", "")
            for msg in conversation_history
            if msg.get("role") == "student"
        ]

        key_questions = case_data.get("key_questions", [])
        if not key_questions:
            return 0

        # 检查关键问题覆盖率
        covered = 0
        for question in key_questions:
            keywords = self._extract_keywords(question)
            for student_q in student_questions:
                if any(kw.lower() in student_q.lower() for kw in keywords):
                    covered += 1
                    break

        coverage_rate = covered / len(key_questions)

        # 基于覆盖率给推理分
        if coverage_rate >= 0.8:
            return 10
        elif coverage_rate >= 0.6:
            return 7
        elif coverage_rate >= 0.4:
            return 5
        else:
            return 0

    def _score_turn_count(self, turn_count: int) -> float:
        """轮次评分"""
        full_turns = self.standards["full_turns"]
        pass_turns = self.standards["pass_turns"]

        if turn_count >= full_turns:
            return 15  # 满分
        elif turn_count >= pass_turns:
            # 线性插值
            ratio = (turn_count - pass_turns) / (full_turns - pass_turns)
            return 10 + ratio * 5
        else:
            # 低于及格线
            return max(5, turn_count * 2)

    def _score_polite_expression(self, messages: List[Dict[str, Any]]) -> Tuple[float, float]:
        """礼貌表达评分"""
        if not messages:
            return 0, 0

        polite_patterns = [
            r"请", r"您好", r"麻烦", r"谢谢", r"不好意思", r"请问"
        ]

        polite_count = 0
        for msg in messages:
            content = msg.get("content", "")
            for pattern in polite_patterns:
                if re.search(pattern, content):
                    polite_count += 1
                    break

        polite_rate = polite_count / len(messages)
        polite_score = polite_rate * 5

        return polite_rate, polite_score

    def _score_empathy(self, messages: List[Dict[str, Any]]) -> float:
        """共情评分"""
        empathy_patterns = [
            r"理解", r"担心", r"不容易", r"别急", r"慢慢来",
            r"感受", r"心情", r"安慰"
        ]

        empathy_count = 0
        for msg in messages:
            content = msg.get("content", "")
            for pattern in empathy_patterns:
                if re.search(pattern, content):
                    empathy_count += 1
                    break

        # 最多5分
        return min(empathy_count, 5)

    def _calculate_grade(self, score: float) -> str:
        """计算等级"""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"

    def _generate_suggestions(
        self,
        inquiry_result: Dict[str, Any],
        diagnosis_result: Dict[str, Any],
        communication_result: Dict[str, Any],
        case_data: Dict[str, Any]
    ) -> List[str]:
        """生成改进建议"""
        suggestions = []

        # 问诊相关建议
        missed = inquiry_result.get("missed", [])
        if missed:
            suggestions.append(f"建议询问以下关键问题：{', '.join(missed[:3])}")

        if inquiry_result["coverage_rate"] < 0.7:
            suggestions.append("问诊覆盖面还不够，建议更全面地了解患者症状")

        # 诊断相关建议
        if diagnosis_result["accuracy"] == "wrong":
            suggestions.append("诊断结果不够准确，建议加强相关疾病的学习")

        if diagnosis_result["differential_count"] == 0:
            suggestions.append("建议考虑鉴别诊断，提高诊断思维的全面性")

        # 沟通相关建议
        if communication_result["polite_rate"] < 0.5:
            suggestions.append("建议在问诊中适当使用礼貌用语，体现医者人文关怀")

        if communication_result["empathy_score"] < 3:
            suggestions.append("建议多关注患者感受，适当表达共情")

        return suggestions

    def _generate_ai_comments(
        self,
        final_score: float,
        grade: str,
        inquiry_result: Dict[str, Any],
        diagnosis_result: Dict[str, Any],
        communication_result: Dict[str, Any]
    ) -> str:
        """生成AI评语"""
        comments = []

        # 总体评价
        if grade == "A":
            comments.append("表现优秀！问诊全面，诊断准确，沟通规范。")
        elif grade == "B":
            comments.append("表现良好，各方面都做得不错，还有提升空间。")
        elif grade == "C":
            comments.append("表现合格，基础掌握较好，需要加强细节。")
        elif grade == "D":
            comments.append("表现及格，建议加强基础训练，提高问诊技巧。")
        else:
            comments.append("需要加强训练，建议系统学习问诊方法。")

        # 具体评价
        coverage = inquiry_result["coverage_rate"]
        if coverage >= 0.8:
            comments.append("问诊覆盖面广，关键问题询问到位。")
        elif coverage >= 0.5:
            comments.append("问诊覆盖一般，部分关键问题未涉及。")
        else:
            comments.append("问诊覆盖不足，需要更系统地了解患者情况。")

        if diagnosis_result["accuracy"] == "correct":
            comments.append("诊断准确，体现了扎实的医学知识。")
        elif diagnosis_result["accuracy"] == "partial":
            comments.append("诊断方向基本正确，需要提高准确性。")
        else:
            comments.append("诊断结果有待提高，建议加强相关知识学习。")

        return " ".join(comments)


# 全局单例
_scoring_engine: Optional[ScoringEngine] = None


def get_scoring_engine() -> ScoringEngine:
    """获取评分引擎单例"""
    global _scoring_engine
    if _scoring_engine is None:
        _scoring_engine = ScoringEngine()
    return _scoring_engine
