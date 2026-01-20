import { useState, useRef, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { CaseItem, ChatMessage, EvaluationResult } from '@/app/types';
import { Send, ArrowLeft, Mic, MessageSquare, Volume2, Heart, Activity, Thermometer, User } from 'lucide-react';
import { Progress } from '@/app/components/ui/progress';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';

interface AISPDialogProps {
  caseItem: CaseItem;
  studentId: string;
  onComplete: (evaluation: EvaluationResult) => void;
  onBack: () => void;
}

export function AISPDialog({ caseItem, studentId, onComplete, onBack }: AISPDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'aisp',
      content: `您好，医生。我是${caseItem.aisp.name}，今年${caseItem.aisp.age}岁。我感觉不太舒服...`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [startTime] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [aispEmotion, setAispEmotion] = useState<'neutral' | 'pain' | 'worried' | 'relieved'>('neutral');
  const [vitalSigns, setVitalSigns] = useState({
    heartRate: 78,
    bloodPressure: '120/80',
    temperature: 36.5,
    breathing: 18,
  });
  const [isAispSpeaking, setIsAispSpeaking] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // 根据问题更新情绪和体征
    if (lowerMessage.includes('疼') || lowerMessage.includes('痛')) {
      setAispEmotion('pain');
      setVitalSigns(prev => ({
        ...prev,
        heartRate: prev.heartRate + Math.floor(Math.random() * 10),
      }));
    } else if (lowerMessage.includes('放心') || lowerMessage.includes('不严重')) {
      setAispEmotion('relieved');
    } else if (lowerMessage.includes('严重') || lowerMessage.includes('需要')) {
      setAispEmotion('worried');
    } else {
      setAispEmotion('neutral');
    }
    
    // 模拟基于关键词的回答
    if (lowerMessage.includes('哪里不舒服') || lowerMessage.includes('症状') || lowerMessage.includes('什么感觉')) {
      return `我主要是${caseItem.symptoms.slice(0, 2).join('和')}，已经${Math.floor(Math.random() * 5 + 1)}天了。`;
    } else if (lowerMessage.includes('什么时候开始') || lowerMessage.includes('多久了')) {
      return `大概是${Math.floor(Math.random() * 7 + 1)}天前开始的。`;
    } else if (lowerMessage.includes('既往病史') || lowerMessage.includes('以前得过')) {
      return caseItem.difficulty === 'hard' 
        ? '我有高血压病史，平时在吃降压药。' 
        : '我身体一直挺好的，没什么大病。';
    } else if (lowerMessage.includes('过敏') || lowerMessage.includes('药物过敏')) {
      return '我对青霉素过敏，其他药物好像没有问题。';
    } else if (lowerMessage.includes('家族史') || lowerMessage.includes('家里人')) {
      return caseItem.difficulty === 'hard'
        ? '我父亲有糖尿病，母亲有高血压。'
        : '家里人都挺健康的。';
    } else if (lowerMessage.includes('生活习惯') || lowerMessage.includes('抽烟') || lowerMessage.includes('喝酒')) {
      return '我不抽烟，偶尔喝点酒。饮食比较规律。';
    } else if (lowerMessage.includes('诊断') || lowerMessage.includes('建议')) {
      return '医生，我这个严重吗？需要住院治疗吗？';
    } else {
      return '嗯，我明白了。还有什么需要了解的吗？';
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // 模拟AI响应延迟
    setTimeout(() => {
      setIsAispSpeaking(true);
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'aisp',
        content: generateAIResponse(input),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
      
      // 模拟说话动画持续时间
      setTimeout(() => {
        setIsAispSpeaking(false);
        setAispEmotion('neutral');
      }, 2000);
    }, 1000 + Math.random() * 1000);
  };

  const handleVoiceInput = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // 模拟语音识别
      setTimeout(() => {
        setInput('请描述一下您的症状');
        setIsRecording(false);
      }, 2000);
    }
  };

  const handleComplete = () => {
    const duration = Math.floor((new Date().getTime() - startTime.getTime()) / 1000 / 60);
    
    // 模拟评分算法
    const messageCount = messages.filter(m => m.role === 'user').length;
    const communicationScore = Math.min(95, 70 + messageCount * 3);
    const diagnosisScore = Math.min(95, 65 + messageCount * 4);
    const treatmentScore = Math.min(90, 60 + messageCount * 3);
    const totalScore = Math.floor(
      communicationScore * 0.3 + diagnosisScore * 0.4 + treatmentScore * 0.3
    );

    const newEvaluation: EvaluationResult = {
      id: Date.now().toString(),
      studentId,
      caseId: caseItem.id,
      score: totalScore,
      communicationScore,
      diagnosisScore,
      treatmentScore,
      feedback: generateFeedback(totalScore, messageCount),
      timestamp: new Date(),
      duration: Math.max(1, duration),
    };

    setEvaluation(newEvaluation);
    setShowEvaluation(true);
  };

  const generateFeedback = (score: number, messageCount: number): string => {
    let feedback = '';
    
    if (score >= 90) {
      feedback = '表现优秀！问诊全面深入，沟通技巧娴熟，诊疗方案合理。';
    } else if (score >= 80) {
      feedback = '表现良好。问诊较为全面，沟通顺畅。';
    } else if (score >= 70) {
      feedback = '表现一般。问诊有遗漏，建议加强病史采集的系统性。';
    } else {
      feedback = '需要改进。问诊不够全面，建议多练习病史采集技巧。';
    }

    if (messageCount < 5) {
      feedback += ' 建议增加提问数量，更全面地了解患者情况。';
    } else if (messageCount > 15) {
      feedback += ' 提问数量较多，可以更有针对性地问诊。';
    }

    return feedback;
  };

  const handleFinish = () => {
    if (evaluation) {
      onComplete(evaluation);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* 顶部栏 */}
      <div className="bg-white/90 backdrop-blur-sm border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <div>
            <h2 className="font-semibold text-lg">{caseItem.name}</h2>
            <p className="text-sm text-gray-500">
              {caseItem.department} · {caseItem.difficulty === 'easy' ? '简单' : caseItem.difficulty === 'medium' ? '中等' : '困难'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">
            <MessageSquare className="w-3 h-3" />
            {messages.filter(m => m.role === 'user').length} 次对话
          </Badge>
          <Button onClick={handleComplete} className="bg-gradient-to-r from-blue-600 to-indigo-600">
            结束对话
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* 左侧：3D数字人展示区 */}
        <Card className="w-96 flex-shrink-0 overflow-hidden bg-gradient-to-br from-white to-blue-50/30">
          <div className="p-6 space-y-6">
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                {caseItem.aisp.digitalHumanUrl ? (
                  <iframe
                    src={caseItem.aisp.digitalHumanUrl}
                    title="数字人"
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; microphone; camera"
                  />
                ) : (
                  <motion.div
                    animate={{
                      scale: isAispSpeaking ? [1, 1.05, 1] : 1,
                      rotate: aispEmotion === 'pain' ? [-2, 2, -2] : 0,
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: isAispSpeaking ? Infinity : 0,
                    }}
                    className="relative"
                  >
                    <div className="text-9xl filter drop-shadow-2xl">
                      {caseItem.aisp.avatar}
                    </div>
                    <AnimatePresence>
                      {aispEmotion === 'pain' && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl"
                        >
                          😣
                        </motion.div>
                      )}
                      {aispEmotion === 'worried' && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl"
                        >
                          😰
                        </motion.div>
                      )}
                      {aispEmotion === 'relieved' && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl"
                        >
                          😌
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <AnimatePresence>
                      {isAispSpeaking && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute -right-6 top-1/2 -translate-y-1/2"
                        >
                          <motion.div
                            animate={{
                              scale: [1, 1.2, 1],
                            }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                            }}
                          >
                            <Volume2 className="w-8 h-8 text-blue-600" />
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
              <motion.div
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-xl -z-10"
              />
            </div>

            {/* 患者信息卡片 */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-lg">{caseItem.aisp.name}</h3>
                  <p className="text-sm text-gray-500">
                    {caseItem.aisp.age}岁 · {caseItem.aisp.gender}
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <p className="font-medium mb-1 text-blue-900">患者特征：</p>
                <p>{caseItem.aisp.personality}</p>
              </div>
            </div>

            {/* 实时体征监测 */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-4 shadow-sm border border-gray-100">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-600" />
                实时体征
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <motion.div
                  animate={{
                    scale: vitalSigns.heartRate > 85 ? [1, 1.05, 1] : 1,
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: vitalSigns.heartRate > 85 ? Infinity : 0,
                  }}
                  className="bg-red-50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-4 h-4 text-red-600" />
                    <span className="text-xs text-gray-600">心率</span>
                  </div>
                  <p className="text-lg font-bold text-red-700">
                    {vitalSigns.heartRate} bpm
                  </p>
                </motion.div>
                
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span className="text-xs text-gray-600">血压</span>
                  </div>
                  <p className="text-lg font-bold text-blue-700">
                    {vitalSigns.bloodPressure}
                  </p>
                </div>
                
                <div className="bg-orange-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Thermometer className="w-4 h-4 text-orange-600" />
                    <span className="text-xs text-gray-600">体温</span>
                  </div>
                  <p className="text-lg font-bold text-orange-700">
                    {vitalSigns.temperature}°C
                  </p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-gray-600">呼吸</span>
                  </div>
                  <p className="text-lg font-bold text-green-700">
                    {vitalSigns.breathing}/min
                  </p>
                </div>
              </div>
            </div>

            {/* 主诉信息 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="font-medium mb-2 text-amber-900">主诉：</p>
              <p className="text-sm text-amber-800">{caseItem.description}</p>
            </div>
          </div>
        </Card>

        {/* 右侧：对话区域 */}
        <Card className="flex-1 flex flex-col bg-white/90 backdrop-blur-sm">
          {/* 对话历史 */}
          <div className="flex-1 p-6 overflow-y-auto" ref={scrollRef}>
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="leading-relaxed">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {message.timestamp.toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* 输入区域 */}
          <div className="border-t bg-white/50 backdrop-blur-sm p-4 space-y-3">
            {/* 输入模式切换 */}
            <div className="flex items-center justify-between">
              <Tabs value={inputMode} onValueChange={(v: any) => setInputMode(v)} className="w-auto">
                <TabsList className="grid w-[240px] grid-cols-2">
                  <TabsTrigger value="text" className="gap-2">
                    <MessageSquare className="w-4 h-4" />
                    文字输入
                  </TabsTrigger>
                  <TabsTrigger value="voice" className="gap-2">
                    <Mic className="w-4 h-4" />
                    语音输入
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <p className="text-xs text-gray-500">
                {inputMode === 'text' ? '按 Enter 发送' : '点击麦克风开始录音'}
              </p>
            </div>

            {/* 输入框 */}
            {inputMode === 'text' ? (
              <div className="flex gap-2">
                <Input
                  placeholder="输入您的问题..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  className="flex-1 bg-white"
                />
                <Button 
                  onClick={handleSend} 
                  disabled={isTyping || !input.trim()}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleVoiceInput}
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                  } text-white shadow-lg transition-all`}
                >
                  <motion.div
                    animate={{
                      scale: isRecording ? [1, 1.2, 1] : 1,
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: isRecording ? Infinity : 0,
                    }}
                  >
                    <Mic className="w-6 h-6" />
                  </motion.div>
                </motion.button>
                <p className="text-sm text-gray-600">
                  {isRecording ? '正在录音...' : '点击麦克风开始'}
                </p>
                {input && (
                  <div className="w-full flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      className="flex-1 bg-white"
                      placeholder="语音识别结果..."
                    />
                    <Button 
                      onClick={handleSend} 
                      disabled={isTyping}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500 text-center">
              💡 提示：尝试询问症状、病史、家族史、生活习惯等问题
            </p>
          </div>
        </Card>
      </div>

      {/* 评分对话框 */}
      <Dialog open={showEvaluation} onOpenChange={setShowEvaluation}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>学习评估报告</DialogTitle>
            <DialogDescription>
              本次练习已完成，以下是您的评估结果
            </DialogDescription>
          </DialogHeader>
          {evaluation && (
            <div className="space-y-6">
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.6 }}
                  className="text-5xl font-bold text-blue-600 mb-2"
                >
                  {evaluation.score}
                </motion.div>
                <p className="text-gray-500">综合得分</p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">沟通技巧</span>
                    <span className="text-sm font-medium">{evaluation.communicationScore}分</span>
                  </div>
                  <Progress value={evaluation.communicationScore} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">问诊情况</span>
                    <span className="text-sm font-medium">{evaluation.diagnosisScore}分</span>
                  </div>
                  <Progress value={evaluation.diagnosisScore} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">诊疗方法</span>
                    <span className="text-sm font-medium">{evaluation.treatmentScore}分</span>
                  </div>
                  <Progress value={evaluation.treatmentScore} className="h-2" />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-medium mb-2">学习建议：</p>
                <p className="text-sm text-gray-700">{evaluation.feedback}</p>
              </div>

              <div className="flex justify-between text-sm text-gray-500">
                <span>练习时长：{evaluation.duration} 分钟</span>
                <span>提问次数：{messages.filter(m => m.role === 'user').length} 次</span>
              </div>

              <Button onClick={handleFinish} className="w-full">
                完成
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
