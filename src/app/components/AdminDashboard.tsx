import { useState } from 'react';
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
import { mockUsers, mockCases, mockScoringCriteria, mockKnowledgeSources, mockKnowledgeNodes } from '@/app/mockData';
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
  ExternalLink
} from 'lucide-react';
import { Slider } from '@/app/components/ui/slider';
import { AISPConfigPanel } from '@/app/components/AISPConfigPanel';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [cases, setCases] = useState<CaseItem[]>(mockCases);
  const [criteria, setCriteria] = useState<ScoringCriteria[]>(mockScoringCriteria);
  const [knowledgeSources, setKnowledgeSources] = useState<KnowledgeSource[]>(mockKnowledgeSources);
  const [knowledgeNodes, setKnowledgeNodes] = useState<KnowledgeNode[]>(mockKnowledgeNodes);

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

  const handleCreateUser = () => {
    if (!userName || !userUsername || !userPassword || !userEmail) return;

    const newUser: User = {
      id: `user${users.length + 1}`,
      username: userUsername,
      password: userPassword,
      role: userRole,
      name: userName,
      email: userEmail,
      department: userDepartment,
      studentId: userRole === 'student' ? `S${Date.now()}` : undefined,
      teacherId: userRole === 'teacher' ? `T${Date.now()}` : undefined,
    };

    setUsers([...users, newUser]);
    resetUserForm();
  };

  const handleUpdateUser = () => {
    if (!editingUser || !userName || !userUsername || !userPassword || !userEmail) return;

    const updatedUsers = users.map(u => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          name: userName,
          username: userUsername,
          password: userPassword,
          email: userEmail,
          role: userRole,
          department: userDepartment,
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    resetUserForm();
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserUsername(user.username);
    setUserPassword(user.password);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserDepartment(user.department || '');
    setShowUserDialog(true);
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
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

  const handleCreateCase = () => {
    if (!caseName || !caseDepartment || !caseDisease || !aispName) return;

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

  const handleDeleteCase = (caseId: string) => {
    setCases(cases.filter(c => c.id !== caseId));
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

  const avatarOptions = ['👨', '👩', '👴', '👵', '👶', '👧', '👦', '🧑', '🧒'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">AISP 教学系统 - 超级管理员</h1>
            <p className="text-sm text-gray-500">欢迎，{user.name}</p>
          </div>
          <Button variant="ghost" onClick={onLogout}>
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
                <Button onClick={() => {
                  setEditingUser(null);
                  setUserName('');
                  setUserUsername('');
                  setUserPassword('');
                  setUserEmail('');
                  setUserRole('student');
                  setUserDepartment('');
                  setShowUserDialog(true);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  添加用户
                </Button>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingUser ? '编辑用户' : '添加新用户'}</DialogTitle>
                    <DialogDescription>{editingUser ? '修改用户信息和权限' : '创建新的系统用户并分配角色权限'}</DialogDescription>
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
                  <Button onClick={editingUser ? handleUpdateUser : handleCreateUser} className="w-full">
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
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }
                          >
                            {user.role === 'admin' ? '管理员' : user.role === 'teacher' ? '教师' : '学生'}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.department || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={user.id === '4'}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
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
                  <Button onClick={() => {
                    setEditingCase(null);
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
                    setAispDigitalHumanUrl('');
                    setAispVoiceProfile('standard');
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    添加病例
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingCase ? '编辑病例' : '添加新病例'}</DialogTitle>
                    <DialogDescription>{editingCase ? '修改病例信息和AISP数字人配置' : '创建新的病例并配置AISP数字人'}</DialogDescription>
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
                            placeholder="输���患者姓名"
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

                    <Button onClick={editingCase ? handleUpdateCase : handleCreateCase} className="w-full">
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
                        <Button variant="ghost" size="sm" onClick={() => handleEditCase(caseItem)}>
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
            <Tabs defaultValue="sources" className="space-y-6">
              <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
                <TabsTrigger 
                  value="sources"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
                >
                  <Database className="w-4 h-4 mr-2" />
                  数据源管理
                </TabsTrigger>
                <TabsTrigger 
                  value="graph"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
                >
                  <Network className="w-4 h-4 mr-2" />
                  知识图谱
                </TabsTrigger>
              </TabsList>

              {/* 数据源管理 */}
              <TabsContent value="sources" className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">外部数据源</h3>
                    <p className="text-sm text-gray-600">连接和管理医学知识库</p>
                  </div>
                  <Dialog open={showSourceDialog} onOpenChange={setShowSourceDialog}>
                    <Button onClick={() => {
                      resetSourceForm();
                      setShowSourceDialog(true);
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      添加数据源
                    </Button>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingSource ? '编辑数据源' : '添加数据源'}</DialogTitle>
                        <DialogDescription>
                          {editingSource ? '修改数据源信息' : '添加新的医学知识库数据源'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>名称 *</Label>
                          <Input
                            placeholder="输入数据源名称"
                            value={sourceName}
                            onChange={(e) => setSourceName(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>类型</Label>
                            <Select value={sourceType} onValueChange={(v: any) => setSourceType(v)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="internal">内部知识库</SelectItem>
                                <SelectItem value="external">外部接口</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>分类 *</Label>
                            <Input
                              placeholder="例如：指南、文献"
                              value={sourceCategory}
                              onChange={(e) => setSourceCategory(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>描述</Label>
                          <Textarea
                            placeholder="输入数据源描述"
                            value={sourceDescription}
                            onChange={(e) => setSourceDescription(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>URL (可选)</Label>
                          <Input
                            placeholder="输入数据源链接"
                            value={sourceUrl}
                            onChange={(e) => setSourceUrl(e.target.value)}
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
                        <Button onClick={editingSource ? handleUpdateSource : handleCreateSource} className="w-full">
                          {editingSource ? '保存修改' : '创建数据源'}
                        </Button>
                      </div>
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
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <FileText className="w-4 h-4" />
                                  <span>{source.caseCount.toLocaleString()} 个病例</span>
                                </div>
                                {source.url && (
                                  <div className="flex items-center gap-1">
                                    <Link className="w-4 h-4" />
                                    <span className="truncate max-w-xs">{source.url}</span>
                                  </div>
                                )}
                                {source.lastSync && (
                                  <div className="flex items-center gap-1">
                                    <RefreshCw className="w-4 h-4" />
                                    <span>最后同步: {source.lastSync.toLocaleDateString('zh-CN')}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {source.type === 'external' && source.status === 'active' && (
                              <Button size="sm" variant="outline">
                                <RefreshCw className="w-4 h-4 mr-1" />
                                同步
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleEditSource(source)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* 知识图谱 */}
              <TabsContent value="graph" className="space-y-4">
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-2">知识图谱节点</h3>
                  <p className="text-sm text-gray-600">查看和管理医学知识图谱关系</p>
                </div>

                {/* 按类型分组显示 */}
                <div className="space-y-6">
                  {['disease', 'symptom', 'treatment', 'department'].map((type) => {
                    const nodes = knowledgeNodes.filter(n => n.type === type);
                    const typeNames = {
                      disease: '疾病',
                      symptom: '症状',
                      treatment: '治疗',
                      department: '科室'
                    };
                    const typeColors = {
                      disease: 'bg-red-100 text-red-800',
                      symptom: 'bg-yellow-100 text-yellow-800',
                      treatment: 'bg-green-100 text-green-800',
                      department: 'bg-blue-100 text-blue-800'
                    };

                    return (
                      <div key={type}>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Network className="w-5 h-5" />
                          {typeNames[type as keyof typeof typeNames]} ({nodes.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {nodes.map((node) => (
                            <Card key={node.id} className="hover:shadow-md transition-shadow cursor-pointer">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-medium text-sm">{node.name}</h5>
                                  <Badge className={typeColors[type as keyof typeof typeColors]} variant="secondary">
                                    {node.caseCount}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600 mb-2 line-clamp-2">{node.description}</p>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Network className="w-3 h-3" />
                                  <span>{node.relatedNodes.length} 个关联</span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
