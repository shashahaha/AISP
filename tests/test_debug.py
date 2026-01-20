"""智谱AI调试测试"""
import asyncio
from zai import ZhipuAiClient

API_KEY = "18cf1e008bde47ddb1583f6569ff784e.OC2H5SRm8esPOrfl"


async def test_debug():
    """调试测试"""
    print("=== 调试智谱AI API ===\n")

    client = ZhipuAiClient(api_key=API_KEY)

    # 测试1: 简单对话
    print("测试1: 简单对话")
    response = client.chat.completions.create(
        model="glm-4.7",
        messages=[
            {"role": "user", "content": "你好，用一句话介绍自己"}
        ],
        temperature=0.7
    )

    print(f"完整响应: {response}")
    print(f"回复类型: {type(response)}")
    print(f"Choices: {response.choices}")
    print(f"回复内容: {response.choices[0].message.content}")
    print()

    # 测试2: 医学角色扮演（简化版）
    print("测试2: 医学角色扮演")

    system_prompt = """你是AI标准化病人模拟器。
你是一名58岁男性建筑工人，因胸痛3小时前来就诊。
性格内向、焦虑，表达简单直接。
只能描述亲身体验，不得使用医学术语。
胸骨后压榨性疼痛，向左肩放射。
回答要简洁，20-50字。"""

    response2 = await asyncio.to_thread(
        client.chat.completions.create,
        model="glm-4.7",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "医生：您好，请问您哪里不舒服？"}
        ],
        temperature=0.7
    )

    print(f"回复内容: {response2.choices[0].message.content}")
    print(f"回复长度: {len(response2.choices[0].message.content)}")
    print()

    # 测试3: 不使用system角色
    print("测试3: 将提示词放在user消息中")

    response3 = await asyncio.to_thread(
        client.chat.completions.create,
        model="glm-4.7",
        messages=[
            {
                "role": "user",
                "content": """你是AI标准化病人模拟器。
你是一名58岁男性建筑工人，因胸痛3小时前来就诊。
性格内向、焦虑。

医生：您好，请问您哪里不舒服？
患者：（请你以患者身份回答）"""
            }
        ],
        temperature=0.7
    )

    print(f"回复内容: {response3.choices[0].message.content}")


if __name__ == "__main__":
    asyncio.run(test_debug())
