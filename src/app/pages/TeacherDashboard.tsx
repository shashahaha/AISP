import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/app/stores';
import { authAPI, tasksAPI, casesAPI } from '@/app/services/api';
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
import { LogOut, BookOpen, BarChart3, User as UserIcon, Plus, TrendingUp, Clock, Award, FileText, Pencil, Trash2, Send, XCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export function TeacherDashboard() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const adaptCase = (c: any): CaseItem => ({
    id: c.case_id,
    name: c.title,
    department: c.category || '综合',
    disease: c.title,
    population: '成人',
    difficulty: (c.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
    description: c.description || '',
    symptoms: c.symptoms ? (typeof c.symptoms === 'object' ? Object.values(c.symptoms).flat() as string[] : []) : [],
    diagnosis: c.standard_diagnosis,
    treatment: [],
    status: c.status || 'approved',
    creatorId: c.created_by?.toString() || '0',
    aisp: {
      avatar: '👤',
      name: c.patient_info?.name || '未命名',
      age: c.patient_info?.age || 0,
      gender: c.patient_info?.gender || '未知',
      personality: '',
    },
    createdAt: c.created_at ? new Date(c.created_at) : new Date(),
  });

  const [tasks, setTasks] = useState<CourseTask[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
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
  const [editingCase, setEditingCase] = useState<CaseItem | null>(null);

  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const [allUsers, allTasks, allCases] = await Promise.all([
          authAPI.listUsers(),
          tasksAPI.list({ teacher_id: Number(user.id) }),
          casesAPI.list()
        ]);
        
        // Filter for students
        const studentList = allUsers.filter((u: any) => u.role.toLowerCase() === 'student');
        setStudents(studentList);
        
        // 无论后端是否有数据，只要请求成功，就使用后端返回的列表（可能是空的）
        const adaptedTasks = allTasks.map(t => ({
          ...t,
          id: t.id.toString(),
          createdAt: new Date(t.created_at),
          caseIds: t.case_ids,
          assignedStudents: t.assigned_students
        }));
        setTasks(adaptedTasks);

        const adaptedCases: CaseItem[] = allCases.map(adaptCase);
        setCases(adaptedCases);
      } catch (error) {
        console.error("Failed to fetch data", error);
        // Fallback to mock data if API fails
        const mockStudents = mockUsers.filter(u => u.role.toLowerCase() === 'student');
        setStudents(mockStudents);
      }
    };
    fetchData();
  }, [user?.id]);

  const avatarOptions = ['👨', '👩', '👴', '👵', '👶', '👧', '👦', '🧑', '🧒'];

  const [showToast, setShowToast] = useState(false);
  
  if (!user) return null;
  
  // 筛选教师自己的病例
  const myCases = cases.filter(c => user && c.creatorId === user.id.toString());
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

  const handleCreateOrUpdateTask = async () => {
    if (!taskName || selectedCases.length === 0) return;

    try {
      const payload = {
        name: taskName,
        description: taskDescription,
        case_ids: selectedCases.map(id => String(id)),
        difficulty: taskDifficulty,
        assigned_students: selectedStudents.map(id => String(id))
      };

      if (editingTask) {
        const updatedTask = await tasksAPI.update(parseInt(editingTask.id), payload);
        
        setTasks(tasks.map(t => t.id === editingTask.id ? {
          ...updatedTask,
          id: updatedTask.id.toString(),
          createdAt: new Date(updatedTask.created_at),
          caseIds: updatedTask.case_ids,
          assignedStudents: updatedTask.assigned_students
        } : t));
      } else {
        const newTaskData = {
          ...payload,
          teacher_id: Number(user.id),
        };
        const createdTask = await tasksAPI.create(newTaskData);
        
        setTasks([...tasks, {
          ...createdTask,
          id: createdTask.id.toString(),
          createdAt: new Date(createdTask.created_at),
          caseIds: createdTask.case_ids,
          assignedStudents: createdTask.assigned_students
        }]);
      }

      setShowCreateDialog(false);
      resetTaskForm();
    } catch (error: any) {
      console.error("Failed to save task:", error.response?.data || error.message);
      // alert("保存任务失败，请稍后重试");
    }
  };

  const handleDeleteTask = (taskId: string) => {
    setDeleteTaskId(taskId);
  };

  const confirmDeleteTask = async () => {
    if (deleteTaskId) {
      try {
        await tasksAPI.delete(parseInt(deleteTaskId));
        setTasks(tasks.filter(t => t.id !== deleteTaskId));
        setDeleteTaskId(null);
      } catch (error) {
        console.error("Failed to delete task", error);
        alert("删除任务失败，请稍后重试");
      }
    }
  };

  const handleStudentToggle = (studentId: any) => {
    const sId = String(studentId);
    setSelectedStudents(prev =>
      prev.includes(sId)
        ? prev.filter(id => id !== sId)
        : [...prev, sId]
    );
  };

  const handleToggleAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => String(s.id)));
    }
  };

  // 病例管理功能
  const handleCreateOrUpdateCase = async () => {
    if (!caseName || !caseDepartment || !caseDisease || !aispName) {
      return;
    }

    const caseData = {
      case_id: editingCase ? editingCase.id : `case${Date.now()}`,
      title: caseName,
      description: caseDescription,
      difficulty: caseDifficulty,
      category: caseDepartment,
      patient_info: {
        name: aispName,
        age: parseInt(aispAge) || 30,
        gender: aispGender,
      },
      chief_complaint: {
        complaint: caseDescription,
      },
      symptoms: {
        primary: caseSymptoms.split(',').map(s => s.trim()).filter(s => s),
      },
      standard_diagnosis: caseDiagnosis,
      status: 'pending',
    };

    try {
      if (editingCase) {
        await casesAPI.update(editingCase.id, caseData);
      } else {
        await casesAPI.create(caseData);
      }
      
      // 重新获取病例列表
      const allCases = await casesAPI.list();
      const adaptedCases: CaseItem[] = allCases.map(adaptCase);
      setCases(adaptedCases);
      resetCaseForm();
    } catch (error) {
      console.error("Failed to save case", error);
      alert("保存病例失败，请稍后重试");
    }
  };

  const handleOpenEditCaseDialog = (caseItem: CaseItem) => {
    setCaseName(caseItem.name);
    setCaseDepartment(caseItem.department);
    setCaseDisease(caseItem.disease);
    setCasePopulation(caseItem.population);
    setCaseDifficulty(caseItem.difficulty);
    setCaseDescription(caseItem.description);
    setCaseSymptoms(caseItem.symptoms.join(', '));
    setCaseDiagnosis(caseItem.diagnosis);
    setCaseTreatment(caseItem.treatment.join(', '));
    setAispName(caseItem.aisp.name);
    setAispAge(caseItem.aisp.age.toString());
    setAispGender(caseItem.aisp.gender);
    setAispPersonality(caseItem.aisp.personality);
    setAispAvatar(caseItem.aisp.avatar);
    
    setEditingCase(caseItem);
    setShowCaseDialog(true);
  };

  const handleOpenCreateCaseDialog = () => {
    resetCaseForm();
    setShowCaseDialog(true);
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

  const handleSubmitToKnowledgeBase = async (caseId: string) => {
    try {
      await casesAPI.update(caseId, { status: 'pending' });
      // 重新获取病例列表
      const allCases = await casesAPI.list();
      const adaptedCases: CaseItem[] = allCases.map(adaptCase);
      setCases(adaptedCases);
      alert("病例已提交审核");
    } catch (error) {
      console.error("Failed to submit case", error);
      alert("提交审核失败，请稍后重试");
    }
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
    setEditingCase(null);
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

  // 计算真实的学生分数分布
  const scoreDistributionData = [
    { name: '优秀(90+)', value: students.filter(s => (s.avg_score || 0) >= 90).length, color: '#22c55e' },
    { name: '良好(80-89)', value: students.filter(s => (s.avg_score || 0) >= 80 && (s.avg_score || 0) < 90).length, color: '#3b82f6' },
    { name: '中等(70-79)', value: students.filter(s => (s.avg_score || 0) >= 70 && (s.avg_score || 0) < 80).length, color: '#eab308' },
    { name: '待提高(<70)', value: students.filter(s => (s.avg_score || 0) > 0 && (s.avg_score || 0) < 70).length, color: '#ef4444' },
  ];

  // 如果没有数据，显示一些默认值或者空状态
  const hasScoreData = scoreDistributionData.some(d => d.value > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">AISP 教学系统 - 教师端</h1>
            <p className="text-sm text-gray-500">欢迎，{user.name || user.username}</p>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
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
                      <Label>选择病例 *</Label>
                      <Select 
                        value={selectedCases[0] || ""} 
                        onValueChange={(value) => setSelectedCases([value])}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="请选择一个病例" />
                        </SelectTrigger>
                        <SelectContent>
                          {approvedCases.map(caseItem => (
                             <SelectItem key={caseItem.id} value={caseItem.id}>
                               <div className="flex items-center justify-between w-full gap-4">
                                 <span>{caseItem.name} - {caseItem.department}</span>
                                 <Badge className={
                                   caseItem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                   caseItem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                   'bg-red-100 text-red-800'
                                 }>
                                   {caseItem.difficulty === 'easy' ? '简单' : 
                                    caseItem.difficulty === 'medium' ? '中等' : '困难'}
                                 </Badge>
                               </div>
                             </SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
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
                          <div key={String(student.id)} className="flex items-center space-x-2">
                            <Checkbox
                              id={`student-${student.id}`}
                              checked={selectedStudents.includes(String(student.id))}
                              onCheckedChange={() => handleStudentToggle(student.id)}
                            />
                            <label
                              htmlFor={`student-${student.id}`}
                              className="flex-1 text-sm cursor-pointer"
                            >
                              {student.full_name || student.name} ({student.username})
                            </label>
                          </div>
                        ))}
                        {students.length === 0 && (
                          <p className="text-center py-4 text-gray-500 text-sm">暂无学生数据</p>
                        )}
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
                          const student = students.find(s => String(s.id) === String(studentId));
                          return student ? (
                            <Badge key={studentId} variant="secondary">
                              {student.full_name || student.name}
                            </Badge>
                          ) : null;
                        })}
                        {task.assignedStudents.length === 0 && (
                          <span className="text-xs text-gray-400 italic">未分配学生</span>
                        )}
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
                <Button onClick={handleOpenCreateCaseDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  创建病例
                </Button>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingCase ? '编辑病例' : '创建新病例'}</DialogTitle>
                    <DialogDescription>{editingCase ? '修改病例信息及AISP数字人配置' : '创建病例并配置AISP数字人'}</DialogDescription>
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
                        <Select value={caseDepartment} onValueChange={setCaseDepartment}>
                          <SelectTrigger>
                            <SelectValue placeholder="选择科室" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="内科">内科</SelectItem>
                            <SelectItem value="外科">外科</SelectItem>
                            <SelectItem value="妇产科">妇产科</SelectItem>
                            <SelectItem value="儿科">儿科</SelectItem>
                            <SelectItem value="急诊科">急诊科</SelectItem>
                            <SelectItem value="精神科">精神科</SelectItem>
                            <SelectItem value="皮肤科">皮肤科</SelectItem>
                            <SelectItem value="眼科">眼科</SelectItem>
                            <SelectItem value="耳鼻喉科">耳鼻喉科</SelectItem>
                            <SelectItem value="口腔科">口腔科</SelectItem>
                            <SelectItem value="康复医学科">康复医学科</SelectItem>
                            <SelectItem value="中医科">中医科</SelectItem>
                          </SelectContent>
                        </Select>
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
                      onClick={handleCreateOrUpdateCase}
                      className="w-full"
                    >
                      {editingCase ? '保存修改' : '创建病例'}
                    </Button>
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
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEditCaseDialog(caseItem)}>
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
                  <div className="text-2xl font-bold">{students.reduce((sum, s) => sum + (s.total_sessions || 0), 0)}</div>
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
                    {students.length > 0 
                      ? Math.round(students.reduce((sum, s) => sum + (s.total_sessions || 0) * 15, 0) / (students.reduce((sum, s) => sum + (s.total_sessions || 0), 0) || 1)) 
                      : 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">分钟/次 (估算)</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">平均得分</CardTitle>
                  <Award className="w-4 h-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {students.length > 0
                      ? Math.round(students.reduce((sum, s) => sum + (s.avg_score || 0), 0) / students.length)
                      : 0}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">全班平均分</p>
                </CardContent>
              </Card>
            </div>

            {/* 图表 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>学生平均分数对比</CardTitle>
                  <CardDescription>各学生平均得分情况</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={students.map(s => ({ name: s.full_name || s.name, averageScore: s.avg_score || 0 }))}>
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
                  <CardTitle>学生完成病例统计</CardTitle>
                  <CardDescription>各学生累计完成病例数量</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={students.map(s => ({
                        name: s.full_name || s.name,
                        completed: s.completed_cases || 0,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: '个', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completed" name="完成病例数" fill="#10b981" />
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
                    return (
                      <Card key={String(student.id)}>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-semibold">{student.full_name || student.name}</h4>
                              <p className="text-sm text-gray-500">{student.username}</p>
                            </div>
                            <Badge className={
                              (student.avg_score || 0) >= 90 ? 'bg-green-100 text-green-800' :
                              (student.avg_score || 0) >= 80 ? 'bg-blue-100 text-blue-800' :
                              (student.avg_score || 0) >= 70 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              平均分：{student.avg_score || 0}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">完成病例</p>
                              <p className="font-medium">{student.completed_cases || 0} 个</p>
                            </div>
                            <div>
                              <p className="text-gray-500">累计次数</p>
                              <p className="font-medium">{student.total_sessions || 0} 次</p>
                            </div>
                            <div>
                              <p className="text-gray-500">练习状态</p>
                              <p className="font-medium">{student.total_sessions > 0 ? '进行中' : '未开始'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">角色</p>
                              <p className="font-medium">学生</p>
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

        {/* 全局 Toast 提示 */}
        {/* {showToast && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-xl text-base font-medium animate-in fade-in zoom-in-95 flex items-center justify-center pointer-events-auto">
              <XCircle className="w-5 h-5 mr-2" />
              必填项没填
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}