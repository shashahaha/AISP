import { useState, useRef, useEffect } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { CaseItem, ChatMessage, EvaluationResult } from "@/app/types";
import {
  Send,
  ArrowLeft,
  Mic,
  MessageSquare,
  Volume2,
  Heart,
  Activity,
  Thermometer,
  User,
  Keyboard,
  AudioWaveform,
  Clock,
} from "lucide-react";
import { Progress } from "@/app/components/ui/progress";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/app/components/ui/badge";
import { Switch } from "@/app/components/ui/switch";
import { Label } from "@/app/components/ui/label";
import { toast } from "sonner";
import { apiClientInstance as apiClient, SessionScoreResponse } from "@/app/services/api";

interface AISPDialogProps {
  caseItem: CaseItem;
  studentId: string;
  onComplete: (evaluation: EvaluationResult) => void;
  onBack: () => void;
}

export function AISPDialog({
  caseItem,
  studentId,
  onComplete,
  onBack,
}: AISPDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "aisp",
      content: `您好，医生。我是${caseItem.aisp.name}，今年${caseItem.aisp.age}岁。我感觉不太舒服...`,
      type: "text",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [startTime] = useState(new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [isRecording, setIsRecording] = useState(false);
  const [isVoiceChatMode, setIsVoiceChatMode] = useState(false);
  const [aispEmotion, setAispEmotion] = useState<
    "neutral" | "pain" | "worried" | "relieved"
  >("neutral");
  const [vitalSigns, setVitalSigns] = useState({
    heartRate: 78,
    bloodPressure: "120/80",
    temperature: 36.5,
    breathing: 18,
  });
  const [isAispSpeaking, setIsAispSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 真实后端连接状态
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(
        Math.floor((new Date().getTime() - startTime.getTime()) / 1000),
      );
    }, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 初始化会话 - 连接真实后端
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        setConnectionError(null);

        // 调用后端 API 创建会话
        const response = await apiClient.startChatSession(caseItem.id);

        setSessionId(response.session_id);

        // 添加开场白消息
        setMessages([
          {
            id: "1",
            role: "aisp",
            content: response.message,
            type: "text",
            timestamp: new Date(),
          },
        ]);

        setIsLoading(false);
      } catch (error) {
        console.error("Failed to initialize session:", error);
        setConnectionError(
          error instanceof Error ? error.message : "连接后端失败",
        );
        setIsLoading(false);

        // 降级到模拟模式
        setMessages([
          {
            id: "1",
            role: "aisp",
            content: `您好，医生。我是${caseItem.aisp.name}，今年${caseItem.aisp.age}岁。我感觉不太舒服...`,
            type: "text",
            timestamp: new Date(),
          },
        ]);
      }
    };

    initializeSession();
  }, [caseItem.id, caseItem.aisp.name, caseItem.aisp.age]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    // 根据问题更新情绪和体征
    if (lowerMessage.includes("疼") || lowerMessage.includes("痛")) {
      setAispEmotion("pain");
      setVitalSigns((prev) => ({
        ...prev,
        heartRate: prev.heartRate + Math.floor(Math.random() * 10),
      }));
    } else if (
      lowerMessage.includes("放心") ||
      lowerMessage.includes("不严重")
    ) {
      setAispEmotion("relieved");
    } else if (lowerMessage.includes("严重") || lowerMessage.includes("需要")) {
      setAispEmotion("worried");
    } else {
      setAispEmotion("neutral");
    }

    // 模拟基于关键词的回答
    if (
      lowerMessage.includes("哪里不舒服") ||
      lowerMessage.includes("症状") ||
      lowerMessage.includes("什么感觉")
    ) {
      return `我主要是${caseItem.symptoms.slice(0, 2).join("和")}，已经${Math.floor(Math.random() * 5 + 1)}天了。`;
    } else if (
      lowerMessage.includes("什么时候开始") ||
      lowerMessage.includes("多久了")
    ) {
      return `大概是${Math.floor(Math.random() * 7 + 1)}天前开始的。`;
    } else if (
      lowerMessage.includes("既往病史") ||
      lowerMessage.includes("以前得过")
    ) {
      return caseItem.difficulty === "hard"
        ? "我有高血压病史，平时在吃降压药。"
        : "我身体一直挺好的，没什么大病。";
    } else if (
      lowerMessage.includes("过敏") ||
      lowerMessage.includes("药物过敏")
    ) {
      return "我对青霉素过敏，其他药物好像没有问题。";
    } else if (
      lowerMessage.includes("家族史") ||
      lowerMessage.includes("家里人")
    ) {
      return caseItem.difficulty === "hard"
        ? "我父亲有糖尿病，母亲有高血压。"
        : "家里人都挺健康的。";
    } else if (
      lowerMessage.includes("生活习惯") ||
      lowerMessage.includes("抽烟") ||
      lowerMessage.includes("喝酒")
    ) {
      return "我不抽烟，偶尔喝点酒。饮食比较规律。";
    } else if (lowerMessage.includes("诊断") || lowerMessage.includes("建议")) {
      return "医生，我这个严重吗？需要住院治疗吗？";
    } else {
      return "嗯，我明白了。还有什么需要了解的吗？";
    }
  };

  const handleSend = async (
    overrideType?: "text" | "audio",
    content?: string,
    audioUrl?: string,
    audioDuration?: number,
  ) => {
    const messageContent = content || input;
    if (!messageContent.trim() && !audioUrl) return;

    const messageType =
      overrideType || (inputMode === "voice" ? "audio" : "text");

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      type: messageType,
      audioUrl: audioUrl,
      duration:
        messageType === "audio"
          ? audioDuration || Math.max(1, Math.floor(messageContent.length / 3))
          : undefined, // 如果没有提供时长，则估算
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // 等对方说完停顿半秒再反应
    await new Promise((resolve) => setTimeout(resolve, 500));

    setIsTyping(true);

    // 如果有有效的 sessionId，调用真实后端 API
    if (sessionId && !connectionError) {
      try {
        const response = await apiClient.sendMessage(
          sessionId,
          caseItem.id,
          messageContent,
        );

        // AI 回复类型跟随用户消息类型：用户发语音则回语音，用户发文字则回文字
        const aiResponseType = messageType === "audio" ? "audio" : "text";

        if (aiResponseType === "audio") {
          setIsAispSpeaking(true);
        }

        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "aisp",
          content: response.response,
          type: aiResponseType,
          duration:
            aiResponseType === "audio"
              ? Math.floor(response.response.length / 3) + 2
              : undefined,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiResponse]);
        setIsTyping(false);

        if (aiResponseType === "audio") {
          playAudio(response.response, aiResponse.id);
          
          // 模拟说话动画持续时间
          setTimeout(() => {
            setIsAispSpeaking(false);
            setAispEmotion("neutral");
          }, 2000);
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        // 降级到模拟响应
        fallbackToMockResponse(messageContent, messageType);
      }
    } else {
      // 使用模拟响应
      fallbackToMockResponse(messageContent, messageType);
    }
  };

  // 降级到模拟响应
  const fallbackToMockResponse = (
    messageContent: string,
    triggerMessageType: "text" | "audio",
  ) => {
    setTimeout(
      () => {
        const aiResponseContent = generateAIResponse(messageContent);
        // AI 回复类型跟随用户消息类型
        const aiResponseType = triggerMessageType === "audio" ? "audio" : "text";

        if (aiResponseType === "audio") {
          setIsAispSpeaking(true);
        }

        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "aisp",
          content: aiResponseContent,
          type: aiResponseType,
          duration:
            aiResponseType === "audio"
              ? Math.floor(aiResponseContent.length / 3) + 2
              : undefined,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiResponse]);
        setIsTyping(false);

        if (aiResponseType === "audio") {
          playAudio(aiResponseContent, aiResponse.id);
          
          // 模拟说话动画持续时间
          setTimeout(() => {
            setIsAispSpeaking(false);
            setAispEmotion("neutral");
          }, 2000);
        }
      },
      1000 + Math.random() * 1000,
    );
  };

  const playAudio = (source: string, id: string, isUrl: boolean = false) => {
    if (playingAudioId === id) {
      if (isUrl) {
        const audio = document.getElementById(
          `audio-${id}`,
        ) as HTMLAudioElement;
        if (audio) audio.pause();
      } else {
        window.speechSynthesis.cancel();
      }
      setPlayingAudioId(null);
      return;
    }

    // 停止之前的
    window.speechSynthesis.cancel();
    document.querySelectorAll("audio").forEach((a) => a.pause());

    setPlayingAudioId(id);

    if (isUrl) {
      const audio = document.getElementById(`audio-${id}`) as HTMLAudioElement;
      if (audio) {
        audio.currentTime = 0;
        audio.play();
        audio.onended = () => setPlayingAudioId(null);
      }
    } else {
      const utterance = new SpeechSynthesisUtterance(source);
      utterance.lang = "zh-CN";
      utterance.onend = () => setPlayingAudioId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  const isUserStoppedRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isRecognitionFailedRef = useRef(false);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  const handleVoiceInput = async () => {
    // 停止正在播放的语音
    window.speechSynthesis.cancel();
    document.querySelectorAll("audio").forEach((a) => a.pause());
    setPlayingAudioId(null);

    isUserStoppedRef.current = false;
    isRecordingRef.current = true;
    isRecognitionFailedRef.current = false;
    if (isRecording) return;

    // 1. 启动 MediaRecorder
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
    } catch (e) {
      console.error("Failed to start media recorder", e);
      alert("无法访问麦克风，请检查权限。");
      isRecordingRef.current = false;
      return;
    }

    // 设置最长录音时间 1 分钟
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
    }
    recordingTimeoutRef.current = setTimeout(() => {
      if (isRecordingRef.current) {
        toggleRecording();
      }
    }, 60000);

    // 2. 启动 SpeechRecognition (用于文字转写)
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = "zh-CN";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsRecording(true);
        isRecordingRef.current = true;
        setInput("");
      };

      // 3. 处理语音转写
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join("");
        
        if (event.results[0].isFinal) {
          setInput(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'no-speech') {
          // 如果是未检测到语音，保持录音状态以便重启
          return;
        }
        if (event.error === 'network') {
          // 网络错误，标记失败但不停止录音（降级为仅录音模式）
          isRecognitionFailedRef.current = true;
          toast.error("语音识别服务连接失败，将仅录制音频");
          return;
        }
        // 其他错误（如 not-allowed 等）停止录音
        setIsRecording(false);
        isRecordingRef.current = false;
        setPlayingAudioId(null);
      };

      recognition.onend = () => {
        // 如果识别服务已失败，不再尝试重启，但保持录音状态
        if (isRecognitionFailedRef.current) {
          return;
        }

        // 如果还在录音状态（非用户主动停止且无致命错误），则重新开始识别
        // 使用 ref 来判断状态，避免闭包导致的旧状态
        if (isRecordingRef.current && !isUserStoppedRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart recognition", e);
            setIsRecording(false);
            isRecordingRef.current = false;
          }
        } else {
          setIsRecording(false);
          isRecordingRef.current = false;
        }
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
        isRecordingRef.current = true;
      } catch (e) {
        // 忽略已开始的错误
        if (e instanceof DOMException && e.name === 'InvalidStateError') {
          console.warn('Recognition already started');
          setIsRecording(true);
          isRecordingRef.current = true;
        } else {
          console.error("Failed to start recognition", e);
          setIsRecording(false);
          isRecordingRef.current = false;
        }
      }
    } else {
      // 仅录音模式（不支持转写）
      setIsRecording(true);
      isRecordingRef.current = true;
    }
  };

  const toggleRecording = () => {
    // 清除超时计时器
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }

    // 使用 ref 或 state 都可以，这里主要确保逻辑一致
    if (isRecording || isRecordingRef.current) {
      isUserStoppedRef.current = true;
      isRecordingRef.current = false;
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        // 处理录音文件
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // 计算录音时长（秒）
          const duration = Math.max(1, Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));

          // 如果有转写的文字，直接发送
          if (input.trim()) {
            handleSend("audio", input, audioUrl, duration);
          } else {
            // 如果没有文字（转写失败或不支持），仅发送音频
            // 注意：实际项目中可能需要后端支持语音转文字
            handleSend("audio", "语音消息", audioUrl, duration);
          }
          
          // 清理
          mediaRecorderRef.current = null;
          audioChunksRef.current = [];
        };
      }

      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Failed to stop recognition", e);
        }
        recognitionRef.current = null;
      }
      
      setIsRecording(false);
    } else {
      handleVoiceInput();
    }
  };

  const handleComplete = async () => {
    const duration = Math.floor(
      (new Date().getTime() - startTime.getTime()) / 1000 / 60,
    );

    // 如果有有效的 sessionId，调用真实后端评分 API
    if (sessionId && !connectionError) {
      try {
        setIsLoading(true);

        // 调用后端评分 API（使用默认诊断，实际应该让用户输入）
        const scoreResponse = await apiClient.endSession(
          sessionId,
          caseItem.diagnosis || "初步诊断", // 使用病例的诊断作为默认值
          "基于患者症状和病史的推理分析",
        );

        // 转换后端评分结果为前端格式
        const newEvaluation: EvaluationResult = {
          id: Date.now().toString(),
          studentId,
          caseId: caseItem.id,
          score: scoreResponse.scores.total,
          communicationScore: scoreResponse.scores.communication.total,
          diagnosisScore: scoreResponse.scores.diagnosis.total,
          treatmentScore: 0, // 后端没有治疗评分，设为0
          feedback: scoreResponse.ai_comments,
          timestamp: new Date(),
          duration: Math.max(1, duration),
          messages: messages,
        };

        setEvaluation(newEvaluation);
        setShowEvaluation(true);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to submit session:", error);
        setIsLoading(false);
        // 降级到模拟评分
        fallbackToMockScoring(duration);
      }
    } else {
      // 使用模拟评分
      fallbackToMockScoring(duration);
    }
  };

  // 降级到模拟评分
  const fallbackToMockScoring = (duration: number) => {
    const messageCount = messages.filter((m) => m.role === "user").length;
    const communicationScore = Math.min(95, 70 + messageCount * 3);
    const diagnosisScore = Math.min(95, 65 + messageCount * 4);
    const treatmentScore = Math.min(90, 60 + messageCount * 3);
    const totalScore = Math.floor(
      communicationScore * 0.3 + diagnosisScore * 0.4 + treatmentScore * 0.3,
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
      messages: messages, // 保存对话历史
    };

    setEvaluation(newEvaluation);
    setShowEvaluation(true);
  };

  const generateFeedback = (score: number, messageCount: number): string => {
    let feedback = "";

    if (score >= 90) {
      feedback = "表现优秀！问诊全面深入，沟通技巧娴熟，诊疗方案合理。";
    } else if (score >= 80) {
      feedback = "表现良好。问诊较为全面，沟通顺畅。";
    } else if (score >= 70) {
      feedback = "表现一般。问诊有遗漏，建议加强病史采集的系统性。";
    } else {
      feedback = "需要改进。问诊不够全面，建议多练习病史采集技巧。";
    }

    if (messageCount < 5) {
      feedback += " 建议增加提问数量，更全面地了解患者情况。";
    } else if (messageCount > 15) {
      feedback += " 提问数量较多，可以更有针对性地问诊。";
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
          </div>
        </div>



        <div className="flex items-center gap-3">
          {/* 连接状态指示器 */}
          {connectionError ? (
            <Badge variant="destructive" className="gap-1">
              ❌ 离线模式
            </Badge>
          ) : sessionId ? (
            <Badge
              variant="outline"
              className="gap-1 bg-green-50 border-green-200 text-green-700"
            >
              ✓ 已连接
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              连接中...
            </Badge>
          )}

          <Badge variant="outline" className="gap-1 font-mono">
            <Clock className="w-3 h-3" />
            {formatTime(elapsedTime)}
          </Badge>
          <Button
            onClick={handleComplete}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            {isLoading ? "处理中..." : "结束对话"}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* 左侧：3D数字人展示区 */}
        <Card className="w-96 flex-shrink-0 flex flex-col overflow-hidden bg-gradient-to-br from-white to-blue-50/30">
          <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
            {/* 数字人头像 - 自适应填充剩余空间 */}
            <div className="relative flex-1 min-h-0 flex items-center justify-center">
              <div className="aspect-square w-full h-full max-h-full rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
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
                      rotate: aispEmotion === "pain" ? [-2, 2, -2] : 0,
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: isAispSpeaking ? Infinity : 0,
                    }}
                    className="relative"
                  >
                    <div className="text-8xl filter drop-shadow-2xl">
                      {caseItem.aisp.avatar}
                    </div>
                    {/* 表情动画保持不变 */}
                    <AnimatePresence>
                      {aispEmotion === "pain" && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl"
                        >
                          😣
                        </motion.div>
                      )}
                      {aispEmotion === "worried" && (
                        <motion.div
                          initial={{ opacity: 0, y: -20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute -top-10 left-1/2 -translate-x-1/2 text-4xl"
                        >
                          😰
                        </motion.div>
                      )}
                      {aispEmotion === "relieved" && (
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

            {/* 患者信息卡片 - 调整布局以适应单行显示 */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex-shrink-0 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">
                    {caseItem.aisp.name}
                  </h3>
                  <p className="text-[10px] text-gray-500 truncate">
                    {caseItem.aisp.age}岁 · {caseItem.aisp.gender}
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-gray-600 bg-blue-50 p-1.5 rounded-lg flex-1 text-right max-w-[60%] truncate">
                <span className="font-medium text-blue-900 mr-1">特征:</span>
                <span>{caseItem.aisp.personality}</span>
              </div>
            </div>

            {/* 实时体征监测 */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-3 shadow-sm border border-gray-100 flex-shrink-0">
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <Activity className="w-3 h-3 text-red-600" />
                实时体征
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <motion.div
                  animate={{
                    scale: vitalSigns.heartRate > 85 ? [1, 1.05, 1] : 1,
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: vitalSigns.heartRate > 85 ? Infinity : 0,
                  }}
                  className="bg-red-50 rounded-lg p-2"
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <Heart className="w-3 h-3 text-red-600" />
                    <span className="text-[10px] text-gray-600">心率</span>
                  </div>
                  <p className="text-sm font-bold text-red-700">
                    {vitalSigns.heartRate} bpm
                  </p>
                </motion.div>

                <div className="bg-blue-50 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Activity className="w-3 h-3 text-blue-600" />
                    <span className="text-[10px] text-gray-600">血压</span>
                  </div>
                  <p className="text-sm font-bold text-blue-700">
                    {vitalSigns.bloodPressure}
                  </p>
                </div>

                <div className="bg-orange-50 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Thermometer className="w-3 h-3 text-orange-600" />
                    <span className="text-[10px] text-gray-600">体温</span>
                  </div>
                  <p className="text-sm font-bold text-orange-700">
                    {vitalSigns.temperature}°C
                  </p>
                </div>

                <div className="bg-green-50 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Activity className="w-3 h-3 text-green-600" />
                    <span className="text-[10px] text-gray-600">呼吸</span>
                  </div>
                  <p className="text-sm font-bold text-green-700">
                    {vitalSigns.breathing}/min
                  </p>
                </div>
              </div>
            </div>

            {/* 主诉信息已移除 */}
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
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-sm ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                          : "bg-white border border-gray-200 text-gray-900"
                      }`}
                    >
                      {message.type === "audio" ? (
                        <div
                          className="flex items-center gap-2 cursor-pointer min-w-[80px]"
                          onClick={() =>
                            playAudio(
                              message.audioUrl || message.content,
                              message.id,
                              !!message.audioUrl,
                            )
                          }
                        >
                          {/* 声波图标 */}
                          <div
                            className={`flex items-center justify-center ${
                              message.role === "user"
                                ? "text-white/90"
                                : "text-blue-600"
                            }`}
                          >
                            {playingAudioId === message.id ? (
                              <motion.div
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 0.8, repeat: Infinity }}
                              >
                                <AudioWaveform className="w-5 h-5" />
                              </motion.div>
                            ) : (
                              <AudioWaveform className="w-5 h-5" />
                            )}
                          </div>

                          {/* 时长 */}
                          <span
                            className={`text-sm ${
                              message.role === "user"
                                ? "text-white/90"
                                : "text-gray-600"
                            }`}
                          >
                            {message.duration ||
                              Math.ceil(message.content.length / 3)}
                            ''
                          </span>

                          {/* 隐藏的 audio 元素用于播放真实录音 */}
                          {message.audioUrl && (
                            <audio
                              id={`audio-${message.id}`}
                              src={message.audioUrl}
                              className="hidden"
                            />
                          )}
                        </div>
                      ) : (
                        <p className="leading-relaxed">{message.content}</p>
                      )}
                      {/* 如果是语音消息，可以不显示时间，或者显示在旁边 */}
                      {message.type !== "audio" && (
                        <p className="text-xs mt-1 opacity-70 text-right">
                          {message.timestamp.toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
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
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: 0.2,
                        }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.span
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: 0.4,
                        }}
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
            {/* 微信风格输入栏 */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() =>
                  setInputMode(inputMode === "text" ? "voice" : "text")
                }
              >
                {inputMode === "text" ? (
                  <AudioWaveform className="w-6 h-6 text-gray-600" />
                ) : (
                  <Keyboard className="w-6 h-6 text-gray-600" />
                )}
              </Button>

              <div className="flex-1">
                {inputMode === "text" ? (
                  <Input
                    placeholder="输入您的问题..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend("text");
                      }
                    }}
                    className="w-full bg-white"
                  />
                ) : (
                  <Button
                    className={`w-full font-medium transition-all ${
                      isRecording
                        ? "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                        : "bg-white hover:bg-gray-50 text-gray-900 border-gray-200"
                    }`}
                    variant="outline"
                    onClick={isRecording ? toggleRecording : handleVoiceInput}
                  >
                    {isRecording ? (
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        正在录音... 点击结束
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4" />
                        点击说话
                      </div>
                    )}
                  </Button>
                )}
              </div>

              {inputMode === "text" && (
                <Button
                  onClick={() => handleSend("text")}
                  disabled={isTyping || !input.trim()}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-full w-10 h-10 p-0 flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* 提示文字已移除 */}
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
                    <span className="text-sm font-medium">
                      {evaluation.communicationScore}分
                    </span>
                  </div>
                  <Progress
                    value={evaluation.communicationScore}
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">问诊情况</span>
                    <span className="text-sm font-medium">
                      {evaluation.diagnosisScore}分
                    </span>
                  </div>
                  <Progress value={evaluation.diagnosisScore} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">诊疗方法</span>
                    <span className="text-sm font-medium">
                      {evaluation.treatmentScore}分
                    </span>
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
                <span>
                  提问次数：{messages.filter((m) => m.role === "user").length}{" "}
                  次
                </span>
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
