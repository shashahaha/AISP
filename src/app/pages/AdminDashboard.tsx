import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/app/stores';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Badge } from '@/app/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { User, CaseItem, ScoringCriteria, KnowledgeSource, KnowledgeNode } from '@/app/types';
import { mockCases, mockScoringCriteria, mockKnowledgeSources, mockKnowledgeNodes } from '@/app/mockData';
import { authAPI } from '@/app/services/api';
import { toastUtils } from '@/app/lib/toast';
import { 
  LogOut, 
  Users, 
  FileText, 
  Settings, 
  Bot, 
  Plus, 
  Pencil, 
  Trash2,
  Database,
  Network,
  RefreshCw,
  Link,
  CheckCircle,
  XCircle,
  ExternalLink,
  Eye
} from 'lucide-react';
import { Slider } from '@/app/components/ui/slider';
import { AISPConfigPanel } from '@/app/components/AISPConfigPanel';
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

export function AdminDashboard() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await authAPI.listUsers();
      setUsers(data);
    } catch (err) {
      toastUtils.error('获取用户列表失败');
    } finally {
      setLoadingUsers(false);
    }
  };

  if (!user) return null;
  const [cases, setCases] = useState<CaseItem[]>(mockCases);
  const [criteria, setCriteria] = useState<ScoringCriteria[]>(mockScoringCriteria);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>(mockKnowledgeSources);

  // 用户管理相关
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userName, setUserName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [userDepartment, setUserDepartment] = useState('');

  // 病例管理相关
  const [showCaseDialog, setShowCaseDialog] = useState(false);
  const [editingCase, setEditingCase] = useState<CaseItem | null>(null);
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
  const [aispDigitalHumanUrl, setAispDigitalHumanUrl] = useState('');
  const [aispVoiceProfile, setAispVoiceProfile] = useState('standard');

  // 评分标准相关
  const [communicationWeight, setCommunicationWeight] = useState(30);
  const [diagnosisWeight, setDiagnosisWeight] = useState(40);
  const [treatmentWeight, setTreatmentWeight] = useState(30);

  // 知识库数据源管理相关
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [editingSource, setEditingSource] = useState<KnowledgeSource | null>(null);
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState<'internal' | 'external'>('internal');
  const [sourceCategory, setSourceCategory] = useState('');
  const [sourceDescription, setSourceDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceStatus, setSourceStatus] = useState<'active' | 'inactive'>('active');
  const [viewingSource, setViewingSource] = useState<KnowledgeSource | null>(null);
  
  // 删除确认弹窗相关
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'user' | 'case' | 'source', id: string } | null>(null);
  
  // 提示信息相关
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSaveUser = async () => {
    if (!userUsername || (!editingUser && !userPassword) || !userEmail) {
      showToastMessage('必填项没填');
      return;
    }

    try {
      if (editingUser) {
        await authAPI.updateUser(Number(editingUser.id), {
          username: userUsername,
          full_name: userName,
          email: userEmail,
          role: userRole,
          password: userPassword || undefined,
        });
        toastUtils.success('用户更新成功');
      } else {
        await authAPI.createUser({
          username: userUsername,
          password: userPassword,
          email: userEmail,
          role: userRole,
        });
        toastUtils.success('用户创建成功');
      }
      fetchUsers();
      resetUserForm();
    } catch (err: any) {
      const msg = err.response?.data?.detail || '保存失败';
      toastUtils.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserName(user.full_name || '');
    setUserUsername(user.username);
    setUserPassword(''); // 不回显密码
    setUserEmail(user.email || '');
    setUserRole(user.role);
    setUserDepartment(''); // 后端暂未存储 department
    setShowUserDialog(true);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setUserName('');
    setUserUsername('');
    setUserPassword('');
    setUserEmail('');
    setUserRole('student');
    setUserDepartment('');
    setShowUserDialog(true);
  };

  const handleDeleteUser = (userId: string) => {
    setDeleteTarget({ type: 'user', id: userId });
    setShowDeleteDialog(true);
  };

  const resetUserForm = () => {
    setShowUserDialog(false);
    setEditingUser(null);
    setUserName('');
    setUserUsername('');
    setUserPassword('');
    setUserEmail('');
    setUserRole('student');
    setUserDepartment('');
  };

  const handleSaveCase = () => {
    if (!caseName || !caseDepartment || !caseDisease || !aispName || !aispAvatar) {
      showToastMessage('必填项没填');
      return;
    }

    if (editingCase) {
      setCases(cases.map(c => c.id === editingCase.id ? {
        ...c,
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
          ...c.aisp,
          avatar: aispAvatar,
          name: aispName,
          age: parseInt(aispAge) || 30,
          gender: aispGender,
          personality: aispPersonality,
          digitalHumanUrl: aispDigitalHumanUrl || undefined,
          voiceProfile: aispVoiceProfile || undefined,
        }
      } : c));
    } else {
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
          digitalHumanUrl: aispDigitalHumanUrl || undefined,
          voiceProfile: aispVoiceProfile || undefined,
        },
        status: 'approved',
        createdAt: new Date(),
        approvedAt: new Date(),
      };
      setCases([...cases, newCase]);
    }

    resetCaseForm();
  };

  const handleUpdateCase = () => {
    if (!editingCase || !caseName || !caseDepartment || !caseDisease || !aispName) return;

    const updatedCases = cases.map(c => {
      if (c.id === editingCase.id) {
        return {
          ...c,
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
            ...c.aisp,
            avatar: aispAvatar,
            name: aispName,
            age: parseInt(aispAge) || 30,
            gender: aispGender,
            personality: aispPersonality,
            digitalHumanUrl: aispDigitalHumanUrl || undefined,
            voiceProfile: aispVoiceProfile || undefined,
          },
        };
      }
      return c;
    });

    setCases(updatedCases);
    resetCaseForm();
  };

  const handleEditCase = (caseItem: CaseItem) => {
    setEditingCase(caseItem);
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
    setAispDigitalHumanUrl(caseItem.aisp.digitalHumanUrl || '');
    setAispVoiceProfile(caseItem.aisp.voiceProfile || 'standard');
    setShowCaseDialog(true);
  };
  
  const handleAddCase = () => {
    setEditingCase(null);
    resetCaseForm();
    setShowCaseDialog(true);
  };

  const handleDeleteCase = (caseId: string) => {
    setDeleteTarget({ type: 'case', id: caseId });
    setShowDeleteDialog(true);
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
    setAispAvatar('');
    setAispDigitalHumanUrl('');
    setAispVoiceProfile('standard');
  };

  const handleUpdateCriteria = () => {
    const updatedCriteria: ScoringCriteria = {
      ...criteria[0],
      communicationWeight: communicationWeight / 100,
      diagnosisWeight: diagnosisWeight / 100,
      treatmentWeight: treatmentWeight / 100,
    };
    setCriteria([updatedCriteria]);
  };

  const handleCreateSource = () => {
    if (!sourceName || !sourceCategory) return;

    const newSource: KnowledgeSource = {
      id: `source${knowledgeSources.length + 1}`,
      name: sourceName,
      type: sourceType,
      category: sourceCategory,
      description: sourceDescription,
      caseCount: 0,
      status: sourceStatus,
      url: sourceUrl || undefined,
      lastSync: sourceType === 'external' ? new Date() : undefined,
    };

    setKnowledgeSources([...knowledgeSources, newSource]);
    resetSourceForm();
  };

  const handleUpdateSource = () => {
    if (!editingSource || !sourceName || !sourceCategory) return;

    const updatedSources = knowledgeSources.map(s => {
      if (s.id === editingSource.id) {
        return {
          ...s,
          name: sourceName,
          type: sourceType,
          category: sourceCategory,
          description: sourceDescription,
          status: sourceStatus,
          url: sourceUrl || undefined,
        };
      }
      return s;
    });

    setKnowledgeSources(updatedSources);
    resetSourceForm();
  };

  const handleEditSource = (source: KnowledgeSource) => {
    setEditingSource(source);
    setSourceName(source.name);
    setSourceType(source.type);
    setSourceCategory(source.category);
    setSourceDescription(source.description);
    setSourceUrl(source.url || '');
    setSourceStatus(source.status);
    setShowSourceDialog(true);
  };

  const resetSourceForm = () => {
    setShowSourceDialog(false);
    setEditingSource(null);
    setSourceName('');
    setSourceType('internal');
    setSourceCategory('');
    setSourceDescription('');
    setSourceUrl('');
    setSourceStatus('active');
  };

  const handleAddSource = () => {
    setEditingSource(null);
    setSourceName('');
    setSourceType('external');
    setSourceUrl('');
    setSourceDescription('');
    setSourceCategory('');
    setSourceStatus('active');
    setShowSourceDialog(true);
  };


  const handleDeleteSource = (sourceId: string) => {
    setDeleteTarget({ type: 'source', id: sourceId });
    setShowDeleteDialog(true);
  };

  const confirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!deleteTarget) return;

    try {
      switch (deleteTarget.type) {
        case 'user':
          await authAPI.deleteUser(Number(deleteTarget.id));
          toastUtils.success('用户已删除');
          fetchUsers();
          break;
        case 'case':
          setCases(cases.filter(c => c.id !== deleteTarget.id));
          break;
        case 'source':
          setKnowledgeSources(knowledgeSources.filter(s => s.id !== deleteTarget.id));
          break;
      }
    } catch (err) {
      toastUtils.error('删除失败');
    }
    
    setDeleteTarget(null);
    setShowDeleteDialog(false);
  };

  const handleSaveSource = () => {
    if (!sourceName || !sourceDescription) {
      showToastMessage('必填项没填');
      return;
    }

    if (editingSource) {
      setKnowledgeSources(knowledgeSources.map(s => s.id === editingSource.id ? {
        ...s,
        name: sourceName,
        type: sourceType,
        url: sourceUrl || undefined,
        description: sourceDescription,
        category: sourceCategory,
        status: sourceStatus,
      } : s));
    } else {
      const newSource: KnowledgeSource = {
        id: `ks${knowledgeSources.length + 1}`,
        name: sourceName,
        type: sourceType,
        url: sourceUrl || undefined,
        description: sourceDescription,
        category: sourceCategory,
        status: sourceStatus,
        caseCount: 0,
        lastSync: new Date(),
      };
      setKnowledgeSources([...knowledgeSources, newSource]);
    }
    setShowSourceDialog(false);
  };

  const avatarOptions = ['👨', '👩', '👴', '👵', '👶', '👧', '👦', '🧑', '🧒'];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">AISP 教学系统 - 超级管理员</h1>
            <p className="text-sm text-gray-500">欢迎，{user.name}</p>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            退出登录
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-6 py-6">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              用户管理
            </TabsTrigger>
            <TabsTrigger value="cases">
              <FileText className="w-4 h-4 mr-2" />
              病例库管理
            </TabsTrigger>
            <TabsTrigger value="aisp">
              <Bot className="w-4 h-4 mr-2" />
              AISP配置
            </TabsTrigger>
            <TabsTrigger value="scoring">
              <Settings className="w-4 h-4 mr-2" />
              评分标准
            </TabsTrigger>
            <TabsTrigger value="knowledge">
              <Database className="w-4 h-4 mr-2" />
              知识库管理
            </TabsTrigger>
          </TabsList>

          {/* 用户管理 */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">用户管理</h2>
                <p className="text-gray-500">管理系统用户和权限</p>
              </div>
              <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                <Button onClick={handleAddUser}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加用户
                </Button>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingUser ? '编辑用户' : '添加新用户'}</DialogTitle>
                    <DialogDescription>创建新的系统用户并分配角色权限</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>姓名 *</Label>
                      <Input
                        placeholder="输入姓名"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>用户名 *</Label>
                      <Input
                        placeholder="输入用户名"
                        value={userUsername}
                        onChange={(e) => setUserUsername(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>密码 *</Label>
                      <Input
                        type="password"
                        placeholder="输入密码"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>邮箱 *</Label>
                      <Input
                        type="email"
                        placeholder="输入邮箱"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>角色 *</Label>
                      <Select value={userRole} onValueChange={(v: any) => setUserRole(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">学生</SelectItem>
                          <SelectItem value="teacher">教师</SelectItem>
                          <SelectItem value="admin">管理员</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>院系/部门</Label>
                      <Input
                        placeholder="输入院系或部门"
                        value={userDepartment}
                        onChange={(e) => setUserDepartment(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSaveUser} className="w-full relative">
                    {editingUser ? '保存修改' : '创建用户'}
                  </Button>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>用户名</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>院系/部门</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingUsers ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10">
                          加载中...
                        </TableCell>
                      </TableRow>
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10">
                          暂无用户数据
                        </TableCell>
                      </TableRow>
                    ) : users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.full_name || '-'}</TableCell>
                        <TableCell>{u.username}</TableCell>
                        <TableCell>{u.email || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              u.role.toLowerCase() === 'admin' ? 'bg-purple-100 text-purple-800' :
                              u.role.toLowerCase() === 'teacher' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }
                          >
                            {u.role.toLowerCase() === 'admin' ? '管理员' : u.role.toLowerCase() === 'teacher' ? '教师' : '学生'}
                          </Badge>
                        </TableCell>
                        <TableCell>{u.department || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditUser(u)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {u.username !== user.username && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(u.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 病例库管理 */}
          <TabsContent value="cases" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-semibold">病例库管理</h2>
                <p className="text-gray-500">管理和配置病例库</p>
              </div>
              <Dialog open={showCaseDialog} onOpenChange={setShowCaseDialog}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddCase}>
                    <Plus className="w-4 h-4 mr-2" />
                    添加病例
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingCase ? '编辑病例' : '添加新病例'}</DialogTitle>
                    <DialogDescription>创建新的病例并配置AISP数字人</DialogDescription>
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
                          <Label>形象 *</Label>
                          <Select value={aispAvatar} onValueChange={setAispAvatar}>
                            <SelectTrigger>
                              <SelectValue placeholder="选择形象" />
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
                        <div className="space-y-2">
                          <Label>数字人地址（URL）</Label>
                          <Input
                            placeholder="例如 https://your-digital-human.com/embed/case1"
                            value={aispDigitalHumanUrl}
                            onChange={(e) => setAispDigitalHumanUrl(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>语音风格</Label>
                          <Select value={aispVoiceProfile} onValueChange={setAispVoiceProfile}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="standard">标准</SelectItem>
                              <SelectItem value="gentle">温柔</SelectItem>
                              <SelectItem value="elderly">老年</SelectItem>
                              <SelectItem value="child">儿童</SelectItem>
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

                    <Button onClick={handleSaveCase} className="w-full relative">
                      {editingCase ? '保存修改' : '创建病例'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {cases.map((caseItem) => (
                <Card key={caseItem.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{caseItem.name}</CardTitle>
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
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditCase(caseItem)}
                        >
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
                        <p className="text-gray-500">诊断</p>
                        <p className="font-medium">{caseItem.diagnosis}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pt-2 border-t">
                      <span className="text-3xl">{caseItem.aisp.avatar}</span>
                      <div className="flex-1">
                        <p className="font-medium">{caseItem.aisp.name}</p>
                        <p className="text-sm text-gray-500">
                          {caseItem.aisp.age}岁 · {caseItem.aisp.gender} · {caseItem.aisp.personality}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* AISP配置 */}
          <TabsContent value="aisp" className="space-y-6">
            <AISPConfigPanel />
          </TabsContent>

          {/* 评分标准 */}
          <TabsContent value="scoring" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>评分标准配置</CardTitle>
                <CardDescription>设置学生评分的权重和标准</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>沟通技巧权重</Label>
                      <span className="text-sm font-medium">{communicationWeight}%</span>
                    </div>
                    <Slider
                      value={[communicationWeight]}
                      onValueChange={(v) => setCommunicationWeight(v[0])}
                      max={100}
                      min={0}
                      step={5}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>问诊情况权重</Label>
                      <span className="text-sm font-medium">{diagnosisWeight}%</span>
                    </div>
                    <Slider
                      value={[diagnosisWeight]}
                      onValueChange={(v) => setDiagnosisWeight(v[0])}
                      max={100}
                      min={0}
                      step={5}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>诊疗法权重</Label>
                      <span className="text-sm font-medium">{treatmentWeight}%</span>
                    </div>
                    <Slider
                      value={[treatmentWeight]}
                      onValueChange={(v) => setTreatmentWeight(v[0])}
                      max={100}
                      min={0}
                      step={5}
                    />
                  </div>

                  {communicationWeight + diagnosisWeight + treatmentWeight !== 100 && (
                    <div className="text-red-500 text-sm">
                      注意：权重总和应为 100%，当前为 {communicationWeight + diagnosisWeight + treatmentWeight}%
                    </div>
                  )}

                  <div className="border-t pt-6 space-y-4">
                    <h4 className="font-medium">评分等级标准</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="font-medium text-green-800">优秀（90-100分）</p>
                        <p className="text-sm text-green-700 mt-1">
                          沟通流畅自然，问诊全面系统，诊断准确，治疗方案完整合理
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="font-medium text-blue-800">良好（80-89分）</p>
                        <p className="text-sm text-blue-700 mt-1">
                          沟通良好，问诊较为全面，诊断基本正确，治疗方案较合理
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg">
                        <p className="font-medium text-yellow-800">中等（70-79分）</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          沟通一般，问诊有遗漏，诊断���本正确但不够完整，治疗方案不够完善
                        </p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="font-medium text-red-800">待提高（70分以下）</p>
                        <p className="text-sm text-red-700 mt-1">
                          沟通存在问题，问诊不够全面，诊断错误或遗漏重要信息，治疗方案不合理
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleUpdateCriteria}
                    disabled={communicationWeight + diagnosisWeight + treatmentWeight !== 100}
                  >
                    保存评分标准
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 知识库管理 */}
          <TabsContent value="knowledge" className="space-y-6">
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">知识库</h3>
                    <p className="text-sm text-gray-600">链接和管理内部病例库与外部数据源，为AISP提供更加优质的模拟问答参考。</p>
                  </div>
                  <Dialog open={showSourceDialog} onOpenChange={setShowSourceDialog}>
                    <Button onClick={handleAddSource}>
                      <Plus className="w-4 h-4 mr-2" />
                      添加数据源
                    </Button>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{editingSource ? '编辑数据源' : '添加数据源'}</DialogTitle>
                        <DialogDescription>配置知识库数据来源</DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>名称 *</Label>
                          <Input
                            placeholder="输入数据源名称"
                            value={sourceName}
                            onChange={(e) => setSourceName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>类型 *</Label>
                          <Select 
                            value={sourceType} 
                            onValueChange={(v: any) => setSourceType(v)}
                            disabled={!!editingSource && editingSource.type === 'internal'}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(!editingSource || editingSource.type === 'external') && (
                                <SelectItem value="external">外部数据库</SelectItem>
                              )}
                              {editingSource?.type === 'internal' && (
                                <SelectItem value="internal">内部知识库</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>分类</Label>
                          <Input
                            placeholder="例如：综合医学、儿科"
                            value={sourceCategory}
                            onChange={(e) => setSourceCategory(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>状态</Label>
                          <Select value={sourceStatus} onValueChange={(v: any) => setSourceStatus(v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">激活</SelectItem>
                              <SelectItem value="inactive">未激活</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>URL (外部数据源)</Label>
                          <Input
                            placeholder="https://..."
                            value={sourceUrl}
                            onChange={(e) => setSourceUrl(e.target.value)}
                            disabled={sourceType === 'internal'}
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>描述 *</Label>
                          <Textarea
                            placeholder="输入数据源描述"
                            value={sourceDescription}
                            onChange={(e) => setSourceDescription(e.target.value)}
                            rows={3}
                          />
                        </div>
                      </div>
                      <Button onClick={handleSaveSource} className="w-full">
                        {editingSource ? '保存修改' : '添加数据源'}
                      </Button>
                    </DialogContent>
                  </Dialog>
                  
                  {/* 查看数据源详情 Dialog */}
                  <Dialog open={!!viewingSource} onOpenChange={(open) => !open && setViewingSource(null)}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{viewingSource?.name} - 详情</DialogTitle>
                        <DialogDescription>{viewingSource?.description}</DialogDescription>
                      </DialogHeader>
                      
                      {viewingSource?.type === 'internal' && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              内部病例库
                            </Badge>
                            <span className="text-sm text-gray-500">共 {cases.length} 个病例</span>
                          </div>
                          
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>病例名称</TableHead>
                                <TableHead>科室</TableHead>
                                <TableHead>疾病</TableHead>
                                <TableHead>人群</TableHead>
                                <TableHead>难度</TableHead>
                                <TableHead>状态</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cases.map((caseItem) => (
                                <TableRow key={caseItem.id}>
                                  <TableCell className="font-medium">{caseItem.name}</TableCell>
                                  <TableCell>{caseItem.department}</TableCell>
                                  <TableCell>{caseItem.disease}</TableCell>
                                  <TableCell>{caseItem.population}</TableCell>
                                  <TableCell>
                                    <Badge className={
                                      caseItem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                      caseItem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                    }>
                                      {caseItem.difficulty === 'easy' ? '简单' :
                                       caseItem.difficulty === 'medium' ? '中等' : '困难'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      已批准
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {viewingSource?.type === 'external' && (
                        <div className="space-y-4">
                          <div className="p-4 bg-gray-50 rounded-lg border">
                            <h4 className="font-medium mb-2">连接信息</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">URL:</span>
                                <a href={viewingSource.url} target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-600 hover:underline">
                                  {viewingSource.url}
                                </a>
                              </div>
                              <div>
                                <span className="text-gray-500">状态:</span>
                                <span className="ml-2">{viewingSource.status === 'active' ? '活跃' : '未激活'}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">最后同步:</span>
                                <span className="ml-2">{viewingSource.lastSync?.toLocaleDateString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">包含病例数:</span>
                                <span className="ml-2">{viewingSource.caseCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {knowledgeSources.map((source) => (
                    <Card key={source.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                              source.type === 'internal' ? 'bg-blue-100' : 'bg-green-100'
                            }`}>
                              {source.type === 'internal' ? (
                                <Database className="w-6 h-6 text-blue-600" />
                              ) : (
                                <ExternalLink className="w-6 h-6 text-green-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-gray-900">{source.name}</h4>
                                <Badge className={
                                  source.status === 'active' 
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }>
                                  {source.status === 'active' ? (
                                    <><CheckCircle className="w-3 h-3 mr-1 inline" />激活</>
                                  ) : (
                                    <><XCircle className="w-3 h-3 mr-1 inline" />未激活</>
                                  )}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {source.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{source.description}</p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  <span>{source.caseCount.toLocaleString()} 个病例</span>
                                </div>
                                {source.url && (
                                  <div className="flex items-center gap-1 min-w-0">
                                    <Link className="w-3 h-3 shrink-0" />
                                    <span className="truncate max-w-[200px]">{source.url}</span>
                                  </div>
                                )}
                                {source.lastSync && (
                                  <div className="flex items-center gap-1">
                                    <RefreshCw className="w-3 h-3" />
                                    <span>最后同步: {source.lastSync.toLocaleDateString('zh-CN')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {source.type === 'internal' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setViewingSource(source)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            )}
                            {source.type === 'external' && source.status === 'active' && (
                              <Button size="sm" variant="outline">
                                <RefreshCw className="w-4 h-4 mr-1" />
                                同步
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditSource(source)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {source.type === 'external' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSource(source.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
          </TabsContent>
        </Tabs>

        {/* 删除确认弹窗 - 放在最外层以确保所有Tab都能访问 */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除？</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget?.type === 'user' && '此操作将永久删除该用户及其相关数据。'}
                {deleteTarget?.type === 'case' && '此操作将永久删除该病例及其相关数据。'}
                {deleteTarget?.type === 'source' && '此操作将永久删除该数据源及其相关配置。'}
                此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteTarget(null)}>取消</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 全局 Toast 提示 - 放在最外层以确保显示在所有层级之上 */}
        {showToast && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-xl text-base font-medium animate-in fade-in zoom-in-95 flex items-center justify-center pointer-events-auto">
              <XCircle className="w-5 h-5 mr-2" />
              {toastMessage || '必填项没填'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
