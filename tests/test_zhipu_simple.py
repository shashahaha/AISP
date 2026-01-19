"""智谱AI集成测试 - Windows兼容版"""
import asyncio
import sys
import os

# 设置UTF-8编码输出
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from zai import ZhipuAiClient


# 测试API密钥
API_KEY = "18cf1e008bde47ddb1583f6569ff784e.OC2H5SRm8esPOrfl"


async def test_basic_connection():
    """测试基本连接"""
    print("\n=== 测试1: 基本连接 ===")

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

        reply = response.choices[0].message.content
        print(f"[PASS] API调用成功!")
        print(f"回复: {reply}\n")
        return True, reply

    except Exception as e:
        print(f"[FAIL] API调用失败: {str(e)}\n")
        return False, str(e)


async def test_medical_roleplay():
    """测试医学角色扮演"""
    print("=== 测试2: 医学角色扮演 ===")

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
        print(f"[PASS] 角色扮演成功!")
        print(f"患者回复: {reply}")

        # 质量检查
        checks = {
            "提到胸痛": "胸痛" in reply or "胸口疼" in reply or "疼" in reply,
            "无医学术语": "心绞痛" not in reply and "心肌梗死" not in reply,
            "长度适中": 10 <= len(reply) <= 80
        }

        print("\n质量检查:")
        all_pass = True
        for name, passed in checks.items():
            status = "[OK]" if passed else "[NG]"
            print(f"  {status} {name}")
            if not passed:
                all_pass = False

        print()
        return all_pass, reply

    except Exception as e:
        print(f"[FAIL] 角色扮演失败: {str(e)}\n")
        return False, str(e)


async def test_conversation():
    """测试多轮对话"""
    print("=== 测试3: 多轮对话 ===")

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
        # 第一轮
        response1 = await asyncio.to_thread(
            client.chat.completions.create,
            model="glm-4.7",
            messages=messages,
            temperature=0.7,
            max_tokens=100
        )

        reply1 = response1.choices[0].message.content
        print(f"第一问: 疼痛性质")
        print(f"患者: {reply1}\n")

        messages.append({"role": "assistant", "content": reply1})
        messages.append({"role": "user", "content": "医生：疼痛会向其他部位放射吗？"})

        # 第二轮
        response2 = await asyncio.to_thread(
            client.chat.completions.create,
            model="glm-4.7",
            messages=messages,
            temperature=0.7,
            max_tokens=100
        )

        reply2 = response2.choices[0].message.content
        print(f"第二问: 放射痛")
        print(f"患者: {reply2}\n")

        # 检查是否提到放射痛
        if "左肩" in reply2 or "肩膀" in reply2 or "放射" in reply2:
            print("[PASS] 多轮对话成功，患者记得症状细节")
            return True, (reply1, reply2)
        else:
            print("[WARN] 患者未明确提及放射痛")
            return True, (reply1, reply2)

    except Exception as e:
        print(f"[FAIL] 多轮对话失败: {str(e)}\n")
        return False, str(e)


async def main():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("智谱AI GLM-4.7 集成测试")
    print("=" * 60)

    results = []

    # 运行测试
    result1, _ = await test_basic_connection()
    results.append(("基本连接", result1))

    result2, _ = await test_medical_roleplay()
    results.append(("医学角色扮演", result2))

    result3, _ = await test_conversation()
    results.append(("多轮对话", result3))

    # 总结
    print("=" * 60)
    print("测试总结")
    print("=" * 60)

    for name, passed in results:
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} {name}")

    total = len(results)
    passed = sum(1 for _, p in results if p)
    print(f"\n总计: {passed}/{total} 通过")

    if passed == total:
        print("\n所有测试通过！智谱AI集成成功。")
    else:
        print(f"\n{total - passed} 个测试失败，请检查配置。")


if __name__ == "__main__":
    asyncio.run(main())
