import re
from typing import List, Tuple, Optional


class SafetyFilter:
    """安全过滤器 - 检测和过滤不当内容"""

    # 禁止回答的问题模式
    FORBIDDEN_PATTERNS = {
        "dosage": [
            r"吃几片?",
            r"用多少量",
            r"剂量",
            r"用量",
            r"一次.*粒",
            r"每天.*次",
        ],
        "diagnosis": [
            r"什么病",
            r"什么诊断",
            r"确诊",
            r"我得.*病",
            r"是不是.*炎",
            r"是不是.*症",
        ],
        "treatment": [
            r"怎么治疗",
            r"用什么药",
            r"怎么治",
            r"需要.*手术",
            r"需要.*检查",
        ]
    }

    # 拒答话术
    DENIAL_RESPONSES = {
        "dosage": "我不懂药物剂量，请听医生的。",
        "diagnosis": "我不知道自己得了什么病，您能告诉我吗？",
        "treatment": "我不懂治疗，您是医生，您说怎么办就怎么样。"
    }

    # 危险信号识别
    DANGER_SIGNALS = {
        "suicide": [
            r"不想活",
            r"活着没意思",
            r"想死",
            r"自杀",
        ],
        "violence": [
            r"想打人",
            r"要报复",
            r"杀死",
            r"伤害",
        ]
    }

    @classmethod
    def check_student_input(cls, message: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        检查学生输入的安全性

        Args:
            message: 学生的问题

        Returns:
            (是否安全, 警告类型, 处理后的消息)
        """
        # 检查危险信号
        for signal_type, patterns in cls.DANGER_SIGNALS.items():
            for pattern in patterns:
                if re.search(pattern, message):
                    return False, signal_type, message

        return True, None, message

    @classmethod
    def check_patient_response(cls, response: str) -> Tuple[bool, str]:
        """
        检查AI患者回复，确保不违反规则

        Args:
            response: AI生成的回复

        Returns:
            (是否合规, 处理后的回复)
        """
        # 检查是否包含医学术语
        medical_terms = [
            r"心绞痛", r"心肌梗死", r"冠脉",
            r"心电图", r"CT", r"MRI", r"超声",
            r"抗生素", r"消炎药", r"降压药"
        ]

        for term in medical_terms:
            if term in response:
                # 发现医学术语，替换为口语化表达
                response = cls._replace_medical_term(response, term)

        # 检查是否给出了诊断
        if re.search(r"(你是|你得了|可能是).*炎|症|病", response):
            return False, "我也不太清楚具体是什么病，就是特别难受。"

        # 检查是否给出了治疗建议
        if re.search(r"(你应该|可以|建议).*吃|用|治", response):
            return False, "我不懂这些，您是医生，您说怎么办就怎么样。"

        return True, response

    @classmethod
    def should_refuse_answer(cls, question: str) -> Tuple[bool, Optional[str]]:
        """
        判断是否应该拒答学生的问题

        Args:
            question: 学生的问题

        Returns:
            (是否拒答, 拒答话术)
        """
        for category, patterns in cls.FORBIDDEN_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, question):
                    return True, cls.DENIAL_RESPONSES[category]

        return False, None

    @classmethod
    def _replace_medical_term(cls, text: str, term: str) -> str:
        """将医学术语替换为口语化表达"""
        replacements = {
            "心绞痛": "心脏病",
            "心肌梗死": "很严重的心脏病",
            "冠脉": "心脏血管",
            "心电图": "心脏检查",
            "CT": "拍片子",
            "MRI": "拍片子",
        }

        return text.replace(term, replacements.get(term, "检查"))

    @classmethod
    def check_role_consistency(cls, response: str, patient_age: int) -> bool:
        """
        检查回复是否符合患者角色设定

        Args:
            response: AI回复
            patient_age: 患者年龄

        Returns:
            是否符合角色设定
        """
        # 检查是否使用了过于专业的词汇
        professional_terms = ["主诉", "现病史", "既往史", "家族史"]
        for term in professional_terms:
            if term in response:
                return False

        # 检查是否像医生说话
        if response.startswith("建议") or response.startswith("应该"):
            return False

        return True

    @classmethod
    def extract_symptom_keywords(cls, message: str) -> List[str]:
        """
        从学生问题中提取症状关键词

        Args:
            message: 学生的问题

        Returns:
            症状关键词列表
        """
        symptom_keywords = [
            r"疼|痛|不适",  # 疼痛相关
            r"咳|喘|气短",  # 呼吸相关
            r"吐|泻|恶心",  # 消化相关
            r"晕|乏力",     # 全身症状
            r"发烧|发热",   # 体温
        ]

        found = []
        for pattern in symptom_keywords:
            if re.search(pattern, message):
                found.extend(re.findall(pattern, message))

        return found
