"""智谱AI集成测试"""
import asyncio
import os
from zai import ZhipuAiClient


# 测试API密钥（从用户提供的）
API_KEY = "18cf1e008bde47ddb1583f6569ff784e.OC2H5SRm8esPOrfl"
BASE_URL = "https://open.bigmodel.cn/api/coding/paas/v4"


async def test_basic_connection():
    """测试基本连接"""
    print("=== 测试智谱AI基本连接 ===\n")

    client = ZhipuAiClient(api_key=API_KEY)

    try:
        response = client.chat.completions.create(
            model="glm-4.7",
            messages=[
                {
                    "role": "system",
                    "content": "你是一个有用的AI助手。"
                },
                {
                    "role": "user",
                    "content": "你好，请简单介绍一下自己。"
                }
            ],
            temperature=0.6
        )

        print("✓ API调用成功！")
        print(f"回复内容: {response.choices[0].message.content}\n")
        return True

    except Exception as e:
        print(f"✗ API调用失败: {str(e)}\n")
        return False


async def test_medical_roleplay():
    """测试医学角色扮演"""
    print("=== 测试医学角色扮演 ===\n")

    client = ZhipuAiClient(api_key=API_KEY)

    system_prompt = """你是AI标准化病人模拟器。

核心规则：
1. 你是一名58岁男性建筑工人，因胸痛3小时前来就诊
2. 性格内向、焦虑，表达简单直接
3. 只能描述亲身体验的症状，不得使用医学术语
4. 胸骨后压榨性疼痛，向左肩放射，持续5-10分钟
5. 劳累后加重，休息后缓解
6. 回答长度控制在20-50字之间"""

    try:
        response = await asyncio.to_thread(
            client.chat.completions.create,
            model="glm-4.7",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "医生：您好，请问您哪里不舒服？"}
            ],
            temperature=0.7,
            max_tokens=100
        )

        reply = response.choices[0].message.content
        print("✓ 角色扮演测试成功！")
        print(f"患者回复: {reply}\n")

        # 检查回复质量
        quality_checks = {
            "提到了胸痛": "胸痛" in reply or "胸口疼" in reply or "疼" in reply,
            "口语化表达": "心绞痛" not in reply and "心肌梗死" not in reply,
            "长度适中": 10 <= len(reply) <= 80
        }

        print("回复质量检查:")
        for check, passed in quality_checks.items():
            status = "✓" if passed else "✗"
            print(f"  {status} {check}")

        return all(quality_checks.values())

    except Exception as e:
        print(f"✗ 角色扮演测试失败: {str(e)}\n")
        return False


async def test_conversation_context():
    """测试对话上下文记忆"""
    print("=== 测试对话上下文记忆 ===\n")

    client = ZhipuAiClient(api_key=API_KEY)

    system_prompt = """你是AI标准化病人模拟器。
你是一名58岁男性建筑工人，因胸痛3小时前来就诊。
胸骨后压榨性疼痛，向左肩放射。
只能描述亲身体验，不得使用医学术语。"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "医生：请问您胸口疼痛是什么性质的？"}
    ]

    try:
        # 第一轮对话
        response1 = await asyncio.to_thread(
            client.chat.completions.create,
            model="glm-4.7",
            messages=messages,
            temperature=0.7,
            max_tokens=100
        )

        reply1 = response1.choices[0].message.content
        print(f"第一轮 - 患者: {reply1}")

        # 添加助手回复到历史
        messages.append({"role": "assistant", "content": reply1})

        # 第二轮对话
        messages.append({"role": "user", "content": "医生：疼痛会向其他部位放射吗？"})
        response2 = await asyncio.to_thread(
            client.chat.completions.create,
            model="glm-4.7",
            messages=messages,
            temperature=0.7,
            max_tokens=100
        )

        reply2 = response2.choices[0].message.content
        print(f"第二轮 - 患者: {reply2}\n")

        # 检查是否回答了放射痛
        if "左肩" in reply2 or "肩膀" in reply2 or "放射" in reply2:
            print("✓ 对话上下文测试成功！患者记得自己的症状。")
            return True
        else:
            print("⚠ 对话上下文可能存在问题，患者未提及放射痛。")
            return False

    except Exception as e:
        print(f"✗ 对话上下文测试失败: {str(e)}\n")
        return False


async def main():
    """运行所有测试"""
    print("\n" + "=" * 50)
    print("智谱AI GLM-4.7 集成测试")
    print("=" * 50 + "\n")

    results = []

    # 运行测试
    results.append(("基本连接测试", await test_basic_connection()))
    results.append(("医学角色扮演测试", await test_medical_roleplay()))
    results.append(("对话上下文测试", await test_conversation_context()))

    # 总结
    print("\n" + "=" * 50)
    print("测试总结")
    print("=" * 50)

    for name, passed in results:
        status = "✓ 通过" if passed else "✗ 失败"
        print(f"{status} - {name}")

    total = len(results)
    passed = sum(1 for _, p in results if p)
    print(f"\n总计: {passed}/{total} 测试通过")

    if passed == total:
        print("\n🎉 所有测试通过！智谱AI集成成功。")
    else:
        print("\n⚠ 部分测试失败，请检查配置。")


if __name__ == "__main__":
    asyncio.run(main())
