import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { User, CourseTask, CaseItem } from '@/app/types';
import { mockCases, mockCourseTasks, mockUsers, mockEvaluations, mockLearningStats } from '@/app/mockData';
import { LogOut, BookOpen, BarChart3, User as UserIcon, Plus, TrendingUp, Clock, Award, FileText, Pencil, Trash2, Send } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
}

export function TeacherDashboard({ user, onLogout }: TeacherDashboardProps) {
  const [tasks, setTasks] = useState<CourseTask[]>(mockCourseTasks);
  const [cases, setCases] = useState<CaseItem[]>(mockCases);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [taskDifficulty, setTaskDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<CourseTask | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteCaseId, setDeleteCaseId] = useState<string | null>(null);

  // 病例管理相关状态
  const [showCaseDialog, setShowCaseDialog] = useState(false);
  const [caseName, setCaseName] = useState('');
  const [caseDepartment, setCaseDepartment] = useState('');
  const [caseDisease, setCaseDisease] = useState('');
  const [casePopulation, setCasePopulation] = useState('');
  const [caseDifficulty, setCaseDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [caseDescription, setCaseDescription] = useState('');
  const [caseSymptoms, setCaseSymptoms] = useState('');
  const [caseDiagnosis, setCaseDiagnosis] = useState('');
  const [caseTreatment, setCaseTreatment] = useState('');
  const [aispName, setAispName] = useState('');
  const [aispAge, setAispAge] = useState('');
  const [aispGender, setAispGender] = useState('');
  const [aispPersonality, setAispPersonality] = useState('');
  const [aispAvatar, setAispAvatar] = useState('👤');

  const students = mockUsers.filter(u => u.role === 'student');
  const avatarOptions = ['👨', '👩', '👴', '👵', '👶', '👧', '👦', '🧑', '🧒'];

  const [showToast, setShowToast] = useState(false);

  // 筛选教师自己的病例
  const myCases = cases.filter(c => c.creatorId === user.id);
  const approvedCases = cases.filter(c => c.status === 'approved');

  const resetTaskForm = () => {
    setTaskName('');
    setTaskDescription('');
    setSelectedCases([]);
    setSelectedStudents([]);
    setTaskDifficulty('medium');
    setEditingTask(null);
  };

  const handleOpenCreateDialog = () => {
    resetTaskForm();
    setShowCreateDialog(true);
  };

  const handleOpenEditDialog = (task: CourseTask) => {
    setTaskName(task.name);
    setTaskDescription(task.description);
    setSelectedCases(task.caseIds);
    setSelectedStudents(task.assignedStudents);
    setTaskDifficulty(task.difficulty);
    setEditingTask(task);
    setShowCreateDialog(true);
  };

  const handleCreateOrUpdateTask = () => {
    if (!taskName || selectedCases.length === 0) return;

    if (editingTask) {
      setTasks(tasks.map(t => t.id === editingTask.id ? {
        ...t,
        name: taskName,
        description: taskDescription,
        caseIds: selectedCases,
        difficulty: taskDifficulty,
        assignedStudents: selectedStudents
      } : t));
    } else {
      const newTask: CourseTask = {
        id: `task${tasks.length + 1}`,
        name: taskName,
        description: taskDescription,
        teacherId: user.id,
        caseIds: selectedCases,
        difficulty: taskDifficulty,
        createdAt: new Date(),
        assignedStudents: selectedStudents,
      };
      setTasks([...tasks, newTask]);
    }

    setShowCreateDialog(false);
    resetTaskForm();
  };

  const handleDeleteTask = (taskId: string) => {
    setDeleteTaskId(taskId);
  };

  const confirmDeleteTask = () => {
    if (deleteTaskId) {
      setTasks(tasks.filter(t => t.id !== deleteTaskId));
      setDeleteTaskId(null);
    }
  };

  const handleCaseToggle = (caseId: string) => {
    setSelectedCases(prev =>
      prev.includes(caseId)
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    );
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleToggleAllCases = () => {
    if (selectedCases.length === approvedCases.length) {
      setSelectedCases([]);
    } else {
      setSelectedCases(approvedCases.map(c => c.id));
    }
  };

  const handleToggleAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  // 病例管理功能
  const handleCreateCase = () => {
    if (!caseName || !caseDepartment || !caseDisease || !aispName) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
      return;
    }

    const newCase: CaseItem = {
      id: `case${cases.length + 1}`,
      name: caseName,
      department: caseDepartment,
      disease: caseDisease,
      population: casePopulation,
      difficulty: caseDifficulty,
      description: caseDescription,
      symptoms: caseSymptoms.split(',').map(s => s.trim()).filter(s => s),
      diagnosis: caseDiagnosis,
      treatment: caseTreatment.split(',').map(t => t.trim()).filter(t => t),
      aisp: {
        avatar: aispAvatar,
        name: aispName,
        age: parseInt(aispAge) || 30,
        gender: aispGender,
        personality: aispPersonality,
      },
      creatorId: user.id,
      creatorName: user.name,
      status: 'pending',
      createdAt: new Date(),
    };

    setCases([...cases, newCase]);
    resetCaseForm();
  };

  const handleDeleteCase = (caseId: string) => {
    setDeleteCaseId(caseId);
  };

  const confirmDeleteCase = () => {
    if (deleteCaseId) {
      setCases(cases.filter(c => c.id !== deleteCaseId));
      setDeleteCaseId(null);
    }
  };

  const handleSubmitToKnowledgeBase = (caseId: string) => {
    setCases(cases.map(c => 
      c.id === caseId ? { ...c, status: 'pending' as const } : c
    ));
  };

  const resetCaseForm = () => {
    setShowCaseDialog(false);
    setCaseName('');
    setCaseDepartment('');
    setCaseDisease('');
    setCasePopulation('');
    setCaseDifficulty('medium');
    setCaseDescription('');
    setCaseSymptoms('');
    setCaseDiagnosis('');
    setCaseTreatment('');
    setAispName('');
    setAispAge('');
    setAispGender('');
    setAispPersonality('');
    setAispAvatar('👤');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800">草稿</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800">待审核</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">已批准</Badge>;
      default:
        return null;
    }
  };

  // 学习数据统计
  const weeklyData = [
    { week: '第1周', 张三: 2.5, 李四: 3 },
    { week: '第2周', 张三: 3, 李四: 3.5 },
    { week: '第3周', 张三: 2, 李四: 4 },
    { week: '第4周', 张三: 4, 李四: 3.8 },
    { week: '第5周', 张三: 3.5, 李四: 4.2 },
    { week: '第6周', 张三: 2.8, 李四: 3.5 },
    { week: '第7周', 张三: 3.2, 李四: 4 },
  ];

  const scoreData = students.map(student => {
    const stats = mockLearningStats[student.id];
    return {
      name: student.name,
      averageScore: stats?.averageScore || 0,
    };
  });

  const scoreDistributionData = [
    { name: '优秀(90+)', value: 11, color: '#22c55e' },
    { name: '良好(80-89)', value: 11, color: '#3b82f6' },
    { name: '中等(70-79)', value: 4, color: '#eab308' },
    { name: '待提高(<70)', value: 1, color: '#ef4444' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">AISP 教学系统 - 教师端</h1>
            <p className="text-sm text-gray-500">欢迎，{user.name}</p>
          </div>
          <Button variant="ghost" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList>
            <TabsTrigger value="courses">
              <BookOpen className="w-4 h-4 mr-2" />
              课程设计
            </TabsTrigger>
            <TabsTrigger value="cases">
              <FileText className="w-4 h-4 mr-2" />
              病例库管理
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              学习看板
            </TabsTrigger>
            <TabsTrigger value="profile">
              <UserIcon className="w-4 h-4 mr-2" />
              个人信息
            </TabsTrigger>
          </TabsList>

          {/* 课程设计 */}
          <TabsContent value="courses" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">课程任务管理</h2>
              </div>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <Button onClick={handleOpenCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  创建任务
                </Button>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingTask ? '编辑学习任务' : '创建学习任务'}</DialogTitle>
                    <DialogDescription>
                      {editingTask ? '修改学习任务内容' : '组合病例库，设定学习任务供学生练习'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>任务名称 *</Label>
                      <Input
                        placeholder="输入任务名称"
                        value={taskName}
                        onChange={(e) => setTaskName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>任务描述 *</Label>
                      <Textarea
                        placeholder="输入任务描述"
                        value={taskDescription}
                        onChange={(e) => setTaskDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>难度等级 *</Label>
                      <Select value={taskDifficulty} onValueChange={(v: any) => setTaskDifficulty(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">简单</SelectItem>
                          <SelectItem value="medium">中等</SelectItem>
                          <SelectItem value="hard">困难</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>选择病例 * （已选 {selectedCases.length} 个）</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs text-blue-600 hover:text-blue-700 p-0"
                          onClick={handleToggleAllCases}
                        >
                          {selectedCases.length === approvedCases.length ? '取消全选' : '全选'}
                        </Button>
                      </div>
                      <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                        {approvedCases.map(caseItem => (
                          <div key={caseItem.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={caseItem.id}
                              checked={selectedCases.includes(caseItem.id)}
                              onCheckedChange={() => handleCaseToggle(caseItem.id)}
                            />
                            <label
                              htmlFor={caseItem.id}
                              className="flex-1 text-sm cursor-pointer"
                            >
                              {caseItem.name} - {caseItem.department}
                            </label>
                            <Badge className={
                              caseItem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                              caseItem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {caseItem.difficulty === 'easy' ? '简单' : 
                               caseItem.difficulty === 'medium' ? '中等' : '困难'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>分配学生 * （已选 {selectedStudents.length} 人）</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs text-blue-600 hover:text-blue-700 p-0"
                          onClick={handleToggleAllStudents}
                        >
                          {selectedStudents.length === students.length ? '取消全选' : '全选'}
                        </Button>
                      </div>
                      <div className="border rounded-lg p-4 max-h-40 overflow-y-auto space-y-2">
                        {students.map(student => (
                          <div key={student.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={student.id}
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={() => handleStudentToggle(student.id)}
                            />
                            <label
                              htmlFor={student.id}
                              className="flex-1 text-sm cursor-pointer"
                            >
                              {student.name} ({student.studentId})
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={handleCreateOrUpdateTask}
                      className="w-full"
                      disabled={!taskName || !taskDescription || selectedCases.length === 0 || selectedStudents.length === 0}
                    >
                      {editingTask ? '保存修改' : '创建任务'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>确认删除</AlertDialogTitle>
                    <AlertDialogDescription>
                      您确定要删除这个学习任务吗？此操作无法撤销。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDeleteTask} className="bg-red-500 hover:bg-red-600">
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* 任务列表 */}
            <div className="grid grid-cols-1 gap-4">
              {[...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(task => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{task.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">{task.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          task.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          task.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {task.difficulty === 'easy' ? '简单' : 
                           task.difficulty === 'medium' ? '中等' : '困难'}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditDialog(task)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteTask(task.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-8 text-sm">
                      <div>
                        <span className="text-gray-500">包含病例：</span>
                        <span className="font-medium ml-2">{task.caseIds.length} 个</span>
                      </div>
                      <div>
                        <span className="text-gray-500">分配学生：</span>
                        <span className="font-medium ml-2">{task.assignedStudents.length} 人</span>
                      </div>
                      <div>
                        <span className="text-gray-500">创建时间：</span>
                        <span className="font-medium ml-2">
                          {task.createdAt.toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">病例列表：</p>
                      <div className="flex flex-wrap gap-2">
                        {task.caseIds.map(caseId => {
                          const caseItem = approvedCases.find(c => c.id === caseId);
                          return caseItem ? (
                            <Badge key={caseId} variant="outline">
                              {caseItem.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">分配学生：</p>
                      <div className="flex flex-wrap gap-2">
                        {task.assignedStudents.map(studentId => {
                          const student = students.find(s => s.id === studentId);
                          return student ? (
                            <Badge key={studentId} variant="secondary">
                              {student.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {tasks.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  暂无课程任务，点击"创建任务"开始设计课程
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 病例库管理 */}
          <TabsContent value="cases" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">病例库管理</h2>
              </div>
              <Dialog open={showCaseDialog} onOpenChange={setShowCaseDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    创建病例
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>创建新病例</DialogTitle>
                    <DialogDescription>创建病例并配置AISP数字人</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>病例名称 *</Label>
                        <Input
                          placeholder="输入病例名称"
                          value={caseName}
                          onChange={(e) => setCaseName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>科室 *</Label>
                        <Input
                          placeholder="输入科室名称"
                          value={caseDepartment}
                          onChange={(e) => setCaseDepartment(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>疾病 *</Label>
                        <Input
                          placeholder="输入疾病名称"
                          value={caseDisease}
                          onChange={(e) => setCaseDisease(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>人群分类</Label>
                        <Select value={casePopulation} onValueChange={setCasePopulation}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择人群" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="儿童">儿童</SelectItem>
                            <SelectItem value="成人">成人</SelectItem>
                            <SelectItem value="老年">老年</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>难度</Label>
                        <Select value={caseDifficulty} onValueChange={(v: any) => setCaseDifficulty(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">简单</SelectItem>
                            <SelectItem value="medium">中等</SelectItem>
                            <SelectItem value="hard">困难</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>病例描述</Label>
                      <Textarea
                        placeholder="输入病例描述"
                        value={caseDescription}
                        onChange={(e) => setCaseDescription(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>症状（用逗号分隔）</Label>
                      <Input
                        placeholder="发热, 咳嗽, 头痛"
                        value={caseSymptoms}
                        onChange={(e) => setCaseSymptoms(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>诊断</Label>
                      <Input
                        placeholder="输入诊断结果"
                        value={caseDiagnosis}
                        onChange={(e) => setCaseDiagnosis(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>治疗方案（用逗号分隔）</Label>
                      <Input
                        placeholder="休息, 服药, 观察"
                        value={caseTreatment}
                        onChange={(e) => setCaseTreatment(e.target.value)}
                      />
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-4">AISP 数字人配置</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>患者姓名 *</Label>
                          <Input
                            placeholder="输入患者姓名"
                            value={aispName}
                            onChange={(e) => setAispName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>年龄</Label>
                          <Input
                            type="number"
                            placeholder="输入年龄"
                            value={aispAge}
                            onChange={(e) => setAispAge(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>性别</Label>
                          <Select value={aispGender} onValueChange={setAispGender}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择性别" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="男">男</SelectItem>
                              <SelectItem value="女">女</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>形象</Label>
                          <Select value={aispAvatar} onValueChange={setAispAvatar}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {avatarOptions.map((emoji) => (
                                <SelectItem key={emoji} value={emoji}>
                                  <span className="text-2xl">{emoji}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2 mt-4">
                        <Label>患者特征</Label>
                        <Textarea
                          placeholder="描述患者性格特征、沟通特点等"
                          value={aispPersonality}
                          onChange={(e) => setAispPersonality(e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleCreateCase}
                      className="w-full"
                    >
                      创建病例
                    </Button>
                    {showToast && (
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
                        <div className="bg-red-500 text-white px-4 py-2 rounded shadow-lg text-sm animate-in fade-in slide-in-from-top-2">
                          必填项为空
                        </div>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* 病例列表 */}
            <div className="grid grid-cols-1 gap-4">
              {myCases.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    暂无病例，点击"创建病例"开始添加
                  </CardContent>
                </Card>
              ) : (
                [...myCases].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((caseItem) => (
                  <Card key={caseItem.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>{caseItem.name}</CardTitle>
                            {getStatusBadge(caseItem.status)}
                          </div>
                          <CardDescription>{caseItem.department} · {caseItem.disease}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={
                            caseItem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                            caseItem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {caseItem.difficulty === 'easy' ? '简单' :
                             caseItem.difficulty === 'medium' ? '中等' : '困难'}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCase(caseItem.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">人群分类</p>
                          <p className="font-medium">{caseItem.population}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">创建时间</p>
                          <p className="font-medium">{caseItem.createdAt.toLocaleDateString('zh-CN')}</p>
                        </div>
                      </div>
                      <div className="text-sm">
                        <p className="text-gray-500 mb-1">症状</p>
                        <div className="flex flex-wrap gap-1">
                          {caseItem.symptoms.map((symptom, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {symptom}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{caseItem.aisp.avatar}</span>
                          <div className="text-sm">
                            <p className="font-medium">{caseItem.aisp.name}</p>
                            <p className="text-gray-500 text-xs">
                              {caseItem.aisp.age}岁 · {caseItem.aisp.gender}
                            </p>
                          </div>
                        </div>
                        {caseItem.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => handleSubmitToKnowledgeBase(caseItem.id)}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            提交到知识库
                          </Button>
                        )}
                        {caseItem.status === 'pending' && (
                          <Badge className="bg-orange-100 text-orange-800">
                            等待超管审核
                          </Badge>
                        )}
                        {caseItem.status === 'approved' && (
                          <Badge className="bg-green-100 text-green-800">
                            已加入知识库
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            
            <AlertDialog open={!!deleteCaseId} onOpenChange={(open) => !open && setDeleteCaseId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                  <AlertDialogDescription>
                    您确定要删除这个病例吗？此操作无法撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDeleteCase} className="bg-red-500 hover:bg-red-600">
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          {/* 学习看板 */}
          <TabsContent value="analytics" className="space-y-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">学生总数</CardTitle>
                  <UserIcon className="w-4 h-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{students.length}</div>
                  <p className="text-xs text-gray-500 mt-1">当前班级学生</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">总练习次数</CardTitle>
                  <TrendingUp className="w-4 h-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockEvaluations.length}</div>
                  <p className="text-xs text-gray-500 mt-1">本学期累计</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">平均练习时长</CardTitle>
                  <Clock className="w-4 h-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(mockEvaluations.reduce((sum, e) => sum + e.duration, 0) / mockEvaluations.length)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">分钟/次</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">平均得分</CardTitle>
                  <Award className="w-4 h-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(mockEvaluations.reduce((sum, e) => sum + e.score, 0) / mockEvaluations.length)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">全班平均分</p>
                </CardContent>
              </Card>
            </div>

            {/* 图表 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>每周练习时长统计</CardTitle>
                  <CardDescription>学生每周练习时长对比</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis label={{ value: '小时', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="张三" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="李四" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>学生平均分数对比</CardTitle>
                  <CardDescription>各学生平均得分情况</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={scoreData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="averageScore" name="平均分" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>评分分布</CardTitle>
                  <CardDescription>全班评分等级分布</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={scoreDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {scoreDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>学期练习时长统计</CardTitle>
                  <CardDescription>学生本学期总练习时长</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={students.map(s => ({
                        name: s.name,
                        hours: mockLearningStats[s.id]?.semesterHours || 0,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: '小时', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="hours" name="练习时长" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* 学生详细列表 */}
            <Card>
              <CardHeader>
                <CardTitle>学生学习情况详情</CardTitle>
                <CardDescription>查看每位学生的详细学习数据</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {students.map(student => {
                    const stats = mockLearningStats[student.id];
                    const studentEvals = mockEvaluations.filter(e => e.studentId === student.id);
                    return (
                      <Card key={student.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-semibold">{student.name}</h4>
                              <p className="text-sm text-gray-500">{student.studentId}</p>
                            </div>
                            <Badge className={
                              (stats?.averageScore || 0) >= 90 ? 'bg-green-100 text-green-800' :
                              (stats?.averageScore || 0) >= 80 ? 'bg-blue-100 text-blue-800' :
                              (stats?.averageScore || 0) >= 70 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              平均分：{stats?.averageScore || 0}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">完成病例</p>
                              <p className="font-medium">{stats?.completedCases || 0} 个</p>
                            </div>
                            <div>
                              <p className="text-gray-500">学期时长</p>
                              <p className="font-medium">{stats?.semesterHours || 0} 小时</p>
                            </div>
                            <div>
                              <p className="text-gray-500">练习次数</p>
                              <p className="font-medium">{studentEvals.length} 次</p>
                            </div>
                            <div>
                              <p className="text-gray-500">最近练习</p>
                              <p className="font-medium">
                                {studentEvals.length > 0
                                  ? studentEvals[studentEvals.length - 1].timestamp.toLocaleDateString('zh-CN')
                                  : '暂无'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 个人信息 */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>个人信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>姓名</Label>
                    <Input value={user.name} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>工号</Label>
                    <Input value={user.teacherId || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>院系</Label>
                    <Input value={user.department || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>邮箱</Label>
                    <Input value={user.email} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>用户名</Label>
                    <Input value={user.username} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>角色</Label>
                    <Input value="教师" disabled />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}