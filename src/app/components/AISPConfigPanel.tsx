import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Slider } from '@/app/components/ui/slider';
import {
  Bot, 
  Database, 
  Settings, 
  Network, 
  Users, 
  User, 
  CheckCircle, 
  XCircle, 
  Activity,
  RefreshCw,
  Heart,
  Thermometer
} from 'lucide-react';

type DigitalHumanExpression = 'neutral' | 'pain' | 'smile';
type DigitalHumanScene = 'clinic' | 'emergency' | 'ward';

function DigitalHumanPreview() {
  const [expression, setExpression] = useState<DigitalHumanExpression>('neutral');
  const [talking, setTalking] = useState(false);
  const [heartRate, setHeartRate] = useState(78);
  const [temperature, setTemperature] = useState(36.8);
  const [scene, setScene] = useState<DigitalHumanScene>('clinic');

  const expressionEmoji =
    expression === 'pain' ? '😣' : expression === 'smile' ? '🙂' : '😐';

  const expressionLabel =
    expression === 'pain' ? '痛苦' : expression === 'smile' ? '微笑' : '平静';

  const sceneLabel =
    scene === 'emergency' ? '急诊场景' : scene === 'ward' ? '查房场景' : '门诊场景';

  const heartRateDisplay =
    scene === 'emergency' ? heartRate + 8 : scene === 'ward' ? heartRate + 2 : heartRate;

  const temperatureDisplay =
    scene === 'emergency'
      ? (temperature + 0.5).toFixed(1)
      : scene === 'ward'
      ? (temperature + 0.2).toFixed(1)
      : temperature.toFixed(1);

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-sky-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          数字人实时预览
        </CardTitle>
        <CardDescription>根据配置预览数字人的形象、表情和体征状态</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2 items-center">
        <div className="flex items-center justify-center">
          <div className="relative w-40 h-40 md:w-56 md:h-56 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
            <span
              className={`text-6xl md:text-7xl text-white drop-shadow ${
                talking ? 'animate-pulse' : ''
              }`}
            >
              {expressionEmoji}
            </span>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/90 text-[11px] font-medium text-blue-900 shadow">
              {sceneLabel} · {expressionLabel}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setExpression('neutral')}
              className={`rounded-lg border px-3 py-2 text-sm ${
                expression === 'neutral'
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              平静
            </button>
            <button
              type="button"
              onClick={() => setExpression('pain')}
              className={`rounded-lg border px-3 py-2 text-sm ${
                expression === 'pain'
                  ? 'border-orange-500 bg-orange-50 text-orange-900'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              疼痛
            </button>
            <button
              type="button"
              onClick={() => setExpression('smile')}
              className={`rounded-lg border px-3 py-2 text-sm ${
                expression === 'smile'
                  ? 'border-green-500 bg-green-50 text-green-900'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              微笑
            </button>
            <button
              type="button"
              onClick={() => setTalking((prev) => !prev)}
              className={`rounded-lg border px-3 py-2 text-sm flex items-center justify-center gap-2 ${
                talking
                  ? 'border-purple-500 bg-purple-50 text-purple-900'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <span>{talking ? '正在说话' : '静默'}</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="flex flex-col gap-1 rounded-lg bg-white p-3 border border-red-100">
              <div className="flex items-center gap-1 text-red-600">
                <Heart className="w-3 h-3" />
                <span className="font-medium">心率</span>
              </div>
              <span className="font-mono text-sm text-red-700">
                {heartRateDisplay} bpm
              </span>
              <input
                type="range"
                min={60}
                max={110}
                value={heartRate}
                onChange={(e) => setHeartRate(Number(e.target.value))}
                className="w-full accent-red-500"
              />
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-white p-3 border border-orange-100">
              <div className="flex items-center gap-1 text-orange-600">
                <Thermometer className="w-3 h-3" />
                <span className="font-medium">体温</span>
              </div>
              <span className="font-mono text-sm text-orange-700">
                {temperatureDisplay} °C
              </span>
              <input
                type="range"
                min={35}
                max={40}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-white p-3 border border-blue-100">
              <div className="flex items-center gap-1 text-blue-600">
                <Activity className="w-3 h-3" />
                <span className="font-medium">场景</span>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setScene('clinic')}
                  className={`rounded px-2 py-1 ${
                    scene === 'clinic'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  门诊
                </button>
                <button
                  type="button"
                  onClick={() => setScene('emergency')}
                  className={`rounded px-2 py-1 ${
                    scene === 'emergency'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  急诊
                </button>
                <button
                  type="button"
                  onClick={() => setScene('ward')}
                  className={`rounded px-2 py-1 ${
                    scene === 'ward'
                      ? 'bg-purple-600 text-white'
                      : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  查房
                </button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AISPConfigPanel() {
  return (
    <div className="space-y-6">
      {/* 三层架构总览 */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Bot className="w-6 h-6 text-blue-600" />
            AISP 数字人模块架构
          </CardTitle>
          <CardDescription className="text-base">
            三层架构设计：基础层（资源库）→ 逻辑层（控制引擎）→ 应用层（交互能力）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border-2 border-blue-300">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">基础层</h4>
              </div>
              <p className="text-sm text-gray-600">数字人资源库</p>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-indigo-300">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <h4 className="font-semibold text-indigo-900">逻辑层</h4>
              </div>
              <p className="text-sm text-gray-600">交互控制引擎</p>
            </div>
            <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
              <div className="flex items-center gap-2 mb-2">
                <Network className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-purple-900">应用层</h4>
              </div>
              <p className="text-sm text-gray-600">场景化交互能力</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DigitalHumanPreview />

      {/* 基础层：数字人资源库 */}
      <Card>
        <CardHeader className="bg-blue-50">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            基础层：数字人资源库
          </CardTitle>
          <CardDescription>配置数字人的形象、动作、表情、语音和体征资源</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* 形象资源库 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <h4 className="font-semibold text-lg">形象资源库</h4>
              <Badge variant="outline">3D/2D 模型</Badge>
            </div>
            <p className="text-sm text-gray-600 ml-4">不同年龄/性别/职业的数字人形象</p>
            <div className="ml-4 grid grid-cols-6 gap-3">
              {['👨‍⚕️', '👩‍⚕️', '👴', '👵', '👶', '👧', '👦', '🧑', '👨‍💼', '👩‍💼', '🧓', '👨‍🦳'].map((emoji, idx) => (
                <div
                  key={idx}
                  className="aspect-square bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center text-4xl border-2 border-transparent hover:border-blue-500 cursor-pointer transition-all hover:scale-105"
                >
                  {emoji}
                </div>
              ))}
            </div>
          </div>

          {/* 动作资源库 */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <h4 className="font-semibold text-lg">动作资源库</h4>
              <Badge variant="outline">基础 + 症状动作</Badge>
            </div>
            <div className="ml-4 grid grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="font-medium text-green-900 mb-2">基础动作</p>
                <div className="space-y-1 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>站立姿态</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>坐姿状态</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>躺卧姿势</span>
                  </div>
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="font-medium text-orange-900 mb-2">症状动作</p>
                <div className="space-y-1 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-orange-600" />
                    <span>捂胸口（心脏不适）</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-orange-600" />
                    <span>咳嗽动作</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-orange-600" />
                    <span>捂腹部（腹痛）</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 表情资源库 */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
              <h4 className="font-semibold text-lg">表情资源库</h4>
              <Badge variant="outline">基础 + 情绪表情</Badge>
            </div>
            <div className="ml-4 flex gap-3 flex-wrap">
              {[
                { emoji: '😐', label: '平静', type: 'basic' },
                { emoji: '😣', label: '痛苦', type: 'basic' },
                { emoji: '😰', label: '焦虑', type: 'emotion' },
                { emoji: '😌', label: '放松', type: 'emotion' },
                { emoji: '😟', label: '担忧', type: 'emotion' },
                { emoji: '🙂', label: '微笑', type: 'basic' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`px-4 py-3 rounded-lg border-2 ${
                    item.type === 'basic'
                      ? 'bg-purple-50 border-purple-200'
                      : 'bg-pink-50 border-pink-200'
                  }`}
                >
                  <div className="text-3xl mb-1 text-center">{item.emoji}</div>
                  <p className="text-xs text-gray-600 text-center">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 语音资源库 */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
              <h4 className="font-semibold text-lg">语音资源库</h4>
              <Badge variant="outline">TTS 语音包</Badge>
            </div>
            <div className="ml-4 space-y-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <Label className="text-sm font-medium text-indigo-900">音色设置</Label>
                  <Select defaultValue="standard">
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">标准音色</SelectItem>
                      <SelectItem value="gentle">温柔音色</SelectItem>
                      <SelectItem value="elderly">老年音色</SelectItem>
                      <SelectItem value="child">儿童音色</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <Label className="text-sm font-medium text-indigo-900">语速调节</Label>
                  <div className="mt-2 space-y-1">
                    <Slider defaultValue={[50]} max={100} min={0} step={10} />
                    <p className="text-xs text-gray-500 text-center">标准速度</p>
                  </div>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                  <Label className="text-sm font-medium text-indigo-900">情绪强度</Label>
                  <div className="mt-2 space-y-1">
                    <Slider defaultValue={[50]} max={100} min={0} step={10} />
                    <p className="text-xs text-gray-500 text-center">中等情绪</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 体征资源库 */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
              <h4 className="font-semibold text-lg">体征资源库</h4>
              <Badge variant="outline">动态数值模板</Badge>
            </div>
            <div className="ml-4 grid grid-cols-2 gap-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                <Label className="text-sm font-medium text-red-900">心率范围 (bpm)</Label>
                <div className="flex gap-2">
                  <Input defaultValue="60" className="flex-1" />
                  <span className="self-center">-</span>
                  <Input defaultValue="100" className="flex-1" />
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <Label className="text-sm font-medium text-blue-900">血压范围 (mmHg)</Label>
                <div className="flex gap-2">
                  <Input defaultValue="90/60" className="flex-1" />
                  <span className="self-center">-</span>
                  <Input defaultValue="140/90" className="flex-1" />
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                <Label className="text-sm font-medium text-orange-900">体温范围 (°C)</Label>
                <div className="flex gap-2">
                  <Input defaultValue="36.0" className="flex-1" />
                  <span className="self-center">-</span>
                  <Input defaultValue="39.0" className="flex-1" />
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                <Label className="text-sm font-medium text-green-900">呼吸频率 (/min)</Label>
                <div className="flex gap-2">
                  <Input defaultValue="12" className="flex-1" />
                  <span className="self-center">-</span>
                  <Input defaultValue="25" className="flex-1" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 逻辑层：交互控制引擎 */}
      <Card>
        <CardHeader className="bg-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            逻辑层：交互控制引擎
          </CardTitle>
          <CardDescription>核心控制模块，管理数字人状态和响应逻辑</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* 状态管理模块 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <h4 className="font-semibold text-lg">状态管理模块</h4>
              <Badge>实时状态维护</Badge>
            </div>
            <div className="ml-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                实时维护数字人当前状态（表情/动作/体征），确保交互连贯性
              </p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-white rounded p-2 border border-blue-300">
                  <p className="font-medium text-blue-900">表情状态</p>
                  <p className="text-gray-600">neutral → pain → worried</p>
                </div>
                <div className="bg-white rounded p-2 border border-blue-300">
                  <p className="font-medium text-blue-900">动作状态</p>
                  <p className="text-gray-600">sitting → covering_chest</p>
                </div>
                <div className="bg-white rounded p-2 border border-blue-300">
                  <p className="font-medium text-blue-900">体征状态</p>
                  <p className="text-gray-600">HR: 78 → 88 bpm</p>
                </div>
              </div>
            </div>
          </div>

          {/* 多模态响应模块 */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
              <h4 className="font-semibold text-lg">多模态响应模块</h4>
              <Badge>同步触发</Badge>
            </div>
            <div className="ml-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                解析系统指令，同步触发语音 + 动作 + 表情 + 体征变化
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3 bg-white rounded p-3 border border-purple-300">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium">指令解析</p>
                    <p className="text-gray-600">学生询问："哪里疼？"</p>
                  </div>
                </div>
                <div className="flex items-center justify-center text-purple-600">
                  <div className="w-0.5 h-6 bg-purple-300"></div>
                </div>
                <div className="flex items-center gap-3 bg-white rounded p-3 border border-purple-300">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium mb-1">同步响应</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-blue-50 p-2 rounded">
                        <span className="font-medium">语音：</span>"我胸口疼..."
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <span className="font-medium">动作：</span>捂胸口
                      </div>
                      <div className="bg-orange-50 p-2 rounded">
                        <span className="font-medium">表情：</span>痛苦 😣
                      </div>
                      <div className="bg-red-50 p-2 rounded">
                        <span className="font-medium">体征：</span>HR↑ 88
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 角色一致性模块 */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <h4 className="font-semibold text-lg">角色一致性模块</h4>
              <Badge>人设约束</Badge>
            </div>
            <div className="ml-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                严格遵循病例人设（年龄/文化/性格）输出语言和行为
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-green-300 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <p className="font-medium text-green-900">年龄适配</p>
                  </div>
                  <div className="space-y-1 text-xs text-gray-700">
                    <p>• 老年患者：语速慢、用词简单、记忆模糊</p>
                    <p>• 儿童患者：表达不清、依赖家长、情绪化</p>
                    <p>• 青年患者：描述清晰、配合度高</p>
                  </div>
                </div>
                <div className="bg-white border border-green-300 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-green-600" />
                    <p className="font-medium text-green-900">性格约束</p>
                  </div>
                  <div className="space-y-1 text-xs text-gray-700">
                    <p>• 焦虑型：频繁询问、担心严重性</p>
                    <p>• 淡定型：描述平静、配合检查</p>
                    <p>• 急躁型：要求快速诊断、不耐烦</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 异常适配模块 */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
              <h4 className="font-semibold text-lg">异常适配模块</h4>
              <Badge variant="destructive">容错处理</Badge>
            </div>
            <div className="ml-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                处理响应超时、违规提问等异常场景，提供角色化引导
              </p>
              <div className="space-y-2 text-sm">
                <div className="bg-white border border-red-300 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <p className="font-medium text-red-900">超时处理</p>
                  </div>
                  <p className="text-gray-600 text-xs">
                    学生长时间无响应 → "医生，您还在吗？我还是很难受..."
                  </p>
                </div>
                <div className="bg-white border border-red-300 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <p className="font-medium text-red-900">违规引导</p>
                  </div>
                  <p className="text-gray-600 text-xs">
                    学生问非医疗问题 → "医生，我们还是聊聊我的病情吧..."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 应用层：场景化交互能力 */}
      <Card>
        <CardHeader className="bg-purple-50">
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5 text-purple-600" />
            应用层：场景化交互能力
          </CardTitle>
          <CardDescription>面向教学场景的具体交互功能实现</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* 问诊交互能力 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <h4 className="font-semibold text-lg">问诊交互能力</h4>
              <Badge>智能对话</Badge>
            </div>
            <div className="ml-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="font-medium text-blue-900 mb-2 text-sm">回答提问</p>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p>• 症状描述：详细程度可配置</p>
                    <p>• 病史回忆：根据难度调整</p>
                    <p>• 生活习惯：情境化回答</p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="font-medium text-blue-900 mb-2 text-sm">主动引导</p>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p>• 补充关键信息</p>
                    <p>• 表达情绪反馈</p>
                    <p>• 提出患者疑虑</p>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="font-medium text-blue-900 mb-2 text-sm">动态反馈</p>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p>• 医生态度评价</p>
                    <p>• 理解确认</p>
                    <p>• 情感共鸣</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 体征同步能力 */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
              <h4 className="font-semibold text-lg">体征同步能力</h4>
              <Badge variant="outline" className="border-red-500 text-red-700">实时更新</Badge>
            </div>
            <div className="ml-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                随问诊进程实时更新生理指标，模拟真实临床场景
              </p>
              <div className="bg-white rounded-lg p-3 border border-red-300">
                <p className="text-xs font-medium text-red-900 mb-2">示例：胸痛患者问诊过程</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">初始状态</span>
                    <span className="font-mono">HR: 78 | BP: 120/80</span>
                  </div>
                  <div className="h-px bg-red-200"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">问及疼痛程度</span>
                    <span className="font-mono text-orange-600">HR: 88 ↑ | BP: 130/85 ↑</span>
                  </div>
                  <div className="h-px bg-red-200"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">安抚后</span>
                    <span className="font-mono text-green-600">HR: 82 ↓ | BP: 125/82 ↓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 场景适配能力 */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <h4 className="font-semibold text-lg">场景适配能力</h4>
              <Badge variant="outline" className="border-green-500 text-green-700">多场景</Badge>
            </div>
            <div className="ml-4 grid grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="font-medium text-green-900 text-sm">门诊场景</p>
                </div>
                <div className="text-xs text-gray-700 space-y-1">
                  <p>• 非紧急情况</p>
                  <p>• 充分沟通时间</p>
                  <p>• 详细病史采集</p>
                </div>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-orange-600" />
                  <p className="font-medium text-orange-900 text-sm">急诊场景</p>
                </div>
                <div className="text-xs text-gray-700 space-y-1">
                  <p>• 症状紧急</p>
                  <p>• 患者焦虑</p>
                  <p>• 快速诊断需求</p>
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <p className="font-medium text-purple-900 text-sm">查房场景</p>
                </div>
                <div className="text-xs text-gray-700 space-y-1">
                  <p>• 住院患者</p>
                  <p>• 病程跟踪</p>
                  <p>• 治疗效果评估</p>
                </div>
              </div>
            </div>
          </div>

          {/* 教学辅助能力 */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
              <h4 className="font-semibold text-lg">教学辅助能力</h4>
              <Badge variant="outline" className="border-purple-500 text-purple-700">教学专用</Badge>
            </div>
            <div className="ml-4 grid grid-cols-2 gap-3">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                <p className="font-medium text-purple-900 text-sm">纠错引导</p>
                <div className="text-xs text-gray-700 space-y-1">
                  <p>• 检测问诊遗漏项</p>
                  <p>• 提示关键信息</p>
                  <p>• 引导正确提问方式</p>
                </div>
                <div className="bg-white rounded p-2 text-xs border border-purple-300">
                  <p className="text-purple-800">
                    示例："医生，您还没问我的过敏史呢..."
                  </p>
                </div>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
                <p className="font-medium text-purple-900 text-sm">衔接话术</p>
                <div className="text-xs text-gray-700 space-y-1">
                  <p>• 自然过渡到新话题</p>
                  <p>• 补充相关信息</p>
                  <p>• 保持对话流畅</p>
                </div>
                <div className="bg-white rounded p-2 text-xs border border-purple-300">
                  <p className="text-purple-800">
                    示例："对了医生，我想起来了，我还有..."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" size="lg">
          <RefreshCw className="w-4 h-4 mr-2" />
          重置为默认配置
        </Button>
        <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600">
          <CheckCircle className="w-4 h-4 mr-2" />
          保存全部配置
        </Button>
      </div>
    </div>
  );
}
