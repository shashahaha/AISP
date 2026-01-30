import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/app/stores";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import {
  User,
  CaseItem,
  EvaluationResult,
  CourseTask,
} from "@/app/types";
import {
  mockCases,
  mockEvaluations,
  mockCourseTasks,
} from "@/app/mockData";
import { AISPDialog } from "@/app/components/AISPDialog";
import { tasksAPI, casesAPI, apiClientInstance } from "@/app/services/api";
import {
  LogOut,
  Award,
  User as UserIcon,
  PlayCircle,
  BookOpen,
  TrendingUp,
  Target,
  Stethoscope,
  Users,
  Baby,
  Activity,
  MessageSquare,
  AudioWaveform,
} from "lucide-react";

export function StudentDashboard() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };
  const [selectedCase, setSelectedCase] =
    useState<CaseItem | null>(null);
  
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);

  // 筛选条件
  const [selectedDepartment, setSelectedDepartment] =
    useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<string>("all");
  const [selectedPopulation, setSelectedPopulation] =
    useState<string>("all");
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [selectedHistoryEvaluation, setSelectedHistoryEvaluation] = useState<EvaluationResult | null>(null);

  // 获取学生的课程任务
  const [myCourseTasks, setMyCourseTasks] = useState<CourseTask[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [tasks, allCases, sessions] = await Promise.all([
          tasksAPI.list({ student_id: user.id.toString() }),
          casesAPI.list({ status: 'approved' }),
          apiClientInstance.listSessions('completed')
        ]);
        
        // 适配任务数据
        const adaptedTasks = tasks.map(t => ({
          ...t,
          id: t.id.toString(),
          createdAt: new Date(t.created_at),
          caseIds: t.case_ids,
          assignedStudents: t.assigned_students
        }));
        setMyCourseTasks(adaptedTasks);

        // 适配病例数据
        if (allCases && allCases.length > 0) {
          const adaptedCases: CaseItem[] = allCases.map(c => ({
            id: c.case_id,
            name: c.title,
            department: c.category || '综合',
            disease: c.title,
            population: '成人',
            difficulty: (c.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
            description: c.description || '',
            symptoms: c.symptoms ? Object.values(c.symptoms).flat() as string[] : [],
            diagnosis: c.standard_diagnosis,
            treatment: [],
            aisp: {
              avatar: '👤',
              name: c.patient_info?.name || '未命名',
              age: c.patient_info?.age || 0,
              gender: c.patient_info?.gender || '未知',
              personality: '',
              background: c.description || ''
            },
            status: (c as any).status || 'approved',
            createdAt: new Date(c.created_at || new Date()),
          }));
          setCases(adaptedCases);
        }

        // 适配评分数据
        if (sessions && sessions.length > 0) {
          const adaptedEvaluations: EvaluationResult[] = sessions.map((s: any) => ({
            id: s.session_id,
            studentId: user.id.toString(),
            caseId: s.case_id,
            score: s.scores?.total || 0,
            communicationScore: s.scores?.communication?.total || 0,
            diagnosisScore: s.scores?.diagnosis?.total || 0,
            treatmentScore: s.scores?.inquiry?.total || 0,
            duration: Math.ceil((new Date(s.completed_at).getTime() - new Date(s.created_at).getTime()) / 60000) || 5,
            timestamp: new Date(s.completed_at),
            feedback: s.ai_comments || '',
            messages: s.messages?.map((m: any) => ({
              role: m.role,
              content: m.content,
              type: 'text'
            })) || []
          }));
          setEvaluations(adaptedEvaluations);
        }
      } catch (error) {
        console.error("Failed to fetch data", error);
      }
    };
    fetchData();
  }, [user]);

  if (!user) return null;

  const handleCaseComplete = (evaluation: EvaluationResult) => {
    setEvaluations([...evaluations, evaluation]);
    setSelectedCase(null);
  };

  const handleStartPractice = () => {
    // 根据筛选条件随机选择一个病例
    let availableCases = cases.filter(
      (c) => c.status === "approved",
    );

    if (selectedDepartment !== "all") {
      availableCases = availableCases.filter(
        (c) => c.department === selectedDepartment,
      );
    }
    if (selectedDifficulty !== "all") {
      availableCases = availableCases.filter(
        (c) => c.difficulty === selectedDifficulty,
      );
    }
    if (selectedPopulation !== "all") {
      availableCases = availableCases.filter(
        (c) => c.population === selectedPopulation,
      );
    }

    if (availableCases.length > 0) {
      const randomCase =
        availableCases[
          Math.floor(Math.random() * availableCases.length)
        ];
      setSelectedCase(randomCase);
    }
  };

  const handleCloseHistory = () => {
    // 停止所有音频播放
    window.speechSynthesis.cancel();
    document.querySelectorAll('audio').forEach(a => {
        (a as HTMLAudioElement).pause();
        (a as HTMLAudioElement).currentTime = 0;
    });
    setPlayingAudioId(null);
    setSelectedHistoryEvaluation(null);
  };

  const handleStartCourseTask = (task: CourseTask) => {
    // 从课程任务中随机选择一个病例
    const taskCases = cases.filter((c) =>
      task.caseIds.includes(c.id),
    );
    if (taskCases.length > 0) {
      const randomCase =
        taskCases[Math.floor(Math.random() * taskCases.length)];
      setSelectedCase(randomCase);
    }
  };

  const averageScore =
    evaluations.length > 0
      ? Math.round(
          evaluations.reduce((sum, e) => sum + e.score, 0) /
            evaluations.length,
        )
      : 0;

  const totalDuration = evaluations.reduce(
    (sum, e) => sum + e.duration,
    0,
  );

  const departments = [
    "内科",
    "外科",
    "妇产科",
    "儿科",
    "急诊科",
    "精神科",
    "皮肤科",
    "眼科",
    "耳鼻喉科",
    "口腔科",
    "康复医学科",
    "中医科",
  ];
  const populations = [
    ...new Set(cases.map((c) => c.population)),
  ];

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "⭐";
      case "medium":
        return "⭐⭐";
      case "hard":
        return "⭐⭐⭐";
      default:
        return "";
    }
  };

  const stopAudio = () => {
    window.speechSynthesis.cancel();
    document.querySelectorAll('audio').forEach(a => {
        (a as HTMLAudioElement).pause();
        (a as HTMLAudioElement).currentTime = 0;
    });
    setPlayingAudioId(null);
  };

  const playAudio = (content: string, id: string, hasUrl: boolean = false) => {
    if (playingAudioId === id) {
      stopAudio();
      return;
    }

    // 停止其他播放
    stopAudio();

    setPlayingAudioId(id);

    if (hasUrl) {
      const audio = document.getElementById(`history-audio-${id}`) as HTMLAudioElement;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => {
            console.error("Audio play failed, falling back to TTS", e);
            // 回退到 TTS
            const utterance = new SpeechSynthesisUtterance(content);
            utterance.lang = 'zh-CN';
            utterance.onend = () => setPlayingAudioId(null);
            window.speechSynthesis.speak(utterance);
        });
        audio.onended = () => setPlayingAudioId(null);
      } else {
         // 没有找到 audio 元素，使用 TTS
         const utterance = new SpeechSynthesisUtterance(content);
         utterance.lang = 'zh-CN';
         utterance.onend = () => setPlayingAudioId(null);
         window.speechSynthesis.speak(utterance);
      }
    } else {
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.lang = 'zh-CN';
      utterance.onend = () => setPlayingAudioId(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  if (selectedCase) {
    return (
      <AISPDialog
        caseItem={selectedCase}
        studentId={user.id}
        onComplete={handleCaseComplete}
        onBack={() => setSelectedCase(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* 顶部导航栏 */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                AISP 教学系统
              </h1>
              <p className="text-sm text-gray-600">
                欢迎，{user.name || user.username}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            退出
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    练习次数
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {evaluations.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    平均分数
                  </p>
                  <p
                    className={`text-3xl font-bold ${getScoreColor(averageScore)}`}
                  >
                    {averageScore}分
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    累计时长
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {totalDuration}分钟
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="practice" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger
              value="practice"
              className="gap-2 py-3"
            >
              <PlayCircle className="w-4 h-4" />
              <span>开始练习</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2 py-3">
              <BookOpen className="w-4 h-4" />
              <span>课程任务</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2 py-3">
              <Award className="w-4 h-4" />
              <span>练习记录</span>
            </TabsTrigger>
          </TabsList>

          {/* 自由练习 */}
          <TabsContent value="practice" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Target className="w-6 h-6 text-blue-600" />
                  自由练习模式
                </CardTitle>
                <CardDescription className="text-base">
                  根据你的需求选择病例类型和难度，开始与 AISP
                  数字人进行问诊练习
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 筛选器 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Stethoscope className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        科室
                      </span>
                    </div>
                    <Select
                      value={selectedDepartment}
                      onValueChange={setSelectedDepartment}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择科室" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          全部科室
                        </SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        难度
                      </span>
                    </div>
                    <Select
                      value={selectedDifficulty}
                      onValueChange={setSelectedDifficulty}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择难度" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          全部难度
                        </SelectItem>
                        <SelectItem value="easy">
                          ⭐ 简单
                        </SelectItem>
                        <SelectItem value="medium">
                          ⭐⭐ 中等
                        </SelectItem>
                        <SelectItem value="hard">
                          ⭐⭐⭐ 困难
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        人群
                      </span>
                    </div>
                    <Select
                      value={selectedPopulation}
                      onValueChange={setSelectedPopulation}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择人群" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          全部人群
                        </SelectItem>
                        {populations.map((pop) => (
                          <SelectItem key={pop} value={pop}>
                            {pop}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 开始按钮 */}
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={handleStartPractice}
                    size="lg"
                    className="gap-2 px-8 py-6 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <PlayCircle className="w-5 h-5" />
                    开始练习
                  </Button>
                </div>

                {/* 提示信息 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Baby className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-blue-900 mb-1">
                        练习提示
                      </p>
                      <p className="text-sm text-blue-800">
                        系统将根据你的选择随机匹配一个病例，与
                        AISP 数字人进行真实医患沟通模拟。
                        完成后将获得智能评分和改进建议。
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 课程任务 */}
          <TabsContent value="courses" className="space-y-4">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                我的课程任务
              </h3>
              <p className="text-gray-600">
                完成教师布置的课程，提升专业技能
              </p>
            </div>

            {myCourseTasks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">暂无课程任务</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {myCourseTasks.map((task) => {
                  const taskCases = cases.filter((c) =>
                    task.caseIds.includes(c.id),
                  );
                  const completedCount = evaluations.filter(
                    (e) => task.caseIds.includes(e.caseId),
                  ).length;

                  return (
                    <Card
                      key={task.id}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2">
                              {task.name}
                            </CardTitle>
                            <CardDescription className="text-base">
                              {task.description}
                            </CardDescription>
                          </div>
                          <Badge className="text-sm px-3 py-1">
                            {getDifficultyIcon(task.difficulty)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            <span>
                              {task.caseIds.length} 个病例
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4" />
                            <span>
                              已完成 {completedCount} 次
                            </span>
                          </div>
                        </div>

                        <Button
                          onClick={() =>
                            handleStartCourseTask(task)
                          }
                          className="w-full gap-2"
                        >
                          <PlayCircle className="w-4 h-4" />
                          开始课程练习
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* 练习记录 */}
          <TabsContent value="history" className="space-y-4">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                练习记录
              </h3>
              <p className="text-gray-600">
                查看你的历史练习和评分详情
              </p>
            </div>

            {evaluations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-2">
                    暂无练习记录
                  </p>
                  <p className="text-sm text-gray-400">
                    开始你的第一次练习吧！
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {[...evaluations]
                  .reverse()
                  .map((evaluation) => {
                    const caseItem = cases.find(
                      (c) => c.id === evaluation.caseId,
                    );
                    if (!caseItem) return null;

                    return (
                      <Card
                        key={evaluation.id}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardContent className="py-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-gray-900">
                                  {caseItem.name}
                                </h4>
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {caseItem.department}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>
                                  {evaluation.timestamp.toLocaleDateString(
                                    "zh-CN",
                                  )}
                                </span>
                                <span>
                                  {evaluation.duration} 分钟
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-3xl font-bold ${getScoreColor(evaluation.score)}`}
                              >
                                {evaluation.score}
                              </div>
                              <div className="text-xs text-gray-500">
                                综合得分
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-center text-sm">
                            <div>
                              <div className="text-gray-600 mb-1">
                                沟通技巧
                              </div>
                              <div className="font-semibold text-blue-600">
                                {evaluation.communicationScore}
                                分
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600 mb-1">
                                问诊情况
                              </div>
                              <div className="font-semibold text-green-600">
                                {evaluation.diagnosisScore}分
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600 mb-1">
                                诊疗方法
                              </div>
                              <div className="font-semibold text-purple-600">
                                {evaluation.treatmentScore}分
                              </div>
                            </div>
                          </div>

                          {evaluation.feedback && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-700">
                                {evaluation.feedback}
                              </p>
                            </div>
                          )}

                          {evaluation.messages && evaluation.messages.length > 0 && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full mt-4"
                              onClick={() => setSelectedHistoryEvaluation(evaluation)}
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              查看对话历史
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 历史记录对话详情弹窗 */}
      <Dialog open={!!selectedHistoryEvaluation} onOpenChange={(open) => !open && handleCloseHistory()}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>对话历史记录</DialogTitle>
            <DialogDescription>
              回顾您与 {selectedHistoryEvaluation && cases.find(c => c.id === selectedHistoryEvaluation.caseId)?.aisp.name} 的完整对话过程
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-lg border">
            {selectedHistoryEvaluation?.messages?.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  {msg.type === 'audio' ? (
                    <div 
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => playAudio(msg.content, msg.id, !!msg.audioUrl)}
                    >
                      <div className={playingAudioId === msg.id ? "animate-pulse text-blue-300" : ""}>
                          <AudioWaveform className="w-4 h-4" />
                      </div>
                      <span>{msg.duration}''</span>
                      {msg.audioUrl && (
                          <audio id={`history-audio-${msg.id}`} src={msg.audioUrl} className="hidden" />
                      )}
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}