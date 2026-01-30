import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { useAuthStore } from '@/app/stores';
import { authAPI } from '@/app/services/api';
import { toastUtils } from '@/app/lib/toast';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const formatErrorMessage = (detail: any): string => {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map(d => d.msg || JSON.stringify(d)).join(', ');
    }
    if (typeof detail === 'object' && detail !== null) {
      return detail.msg || String(detail);
    }
    return '登录失败，请检查网络或联系管理员';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(username, password);
      const { access_token, user } = response;

      setAuth(user, access_token);
      toastUtils.success(`欢迎回来，${user.username}！`);

      // 根据角色跳转
      const userRole = user.role.toLowerCase();
      switch (userRole) {
        case 'student':
          navigate('/student');
          break;
        case 'teacher':
          navigate('/teacher');
          break;
        case 'admin':
          navigate('/admin');
          break;
        default:
          navigate('/student');
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const errorMsg = formatErrorMessage(detail) || err.message || '登录失败，请检查用户名和密码';
      setError(errorMsg);
      toastUtils.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'student' | 'teacher' | 'admin') => {
    const credentials = {
      student: { username: 'student1', password: 'password123' },
      teacher: { username: 'teacher1', password: 'password123' },
      admin: { username: 'admin', password: 'admin123' },
    };

    const { username: u, password: p } = credentials[role];
    setUsername(u);
    setPassword(p);

    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(u, p);
      const { access_token, user } = response;

      setAuth(user, access_token);
      toastUtils.success(`欢迎回来，${user.username}！`);

      const userRole = user.role.toLowerCase();
      switch (userRole) {
        case 'student':
          navigate('/student');
          break;
        case 'teacher':
          navigate('/teacher');
          break;
        case 'admin':
          navigate('/admin');
          break;
        default:
          navigate('/student');
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const errorMsg = formatErrorMessage(detail) || err.message || '快速登录失败，请先创建测试用户';
      setError(errorMsg);
      toastUtils.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-center">AISP 教学系统</CardTitle>
          <CardDescription className="text-center">
            AI 标准化病人智能教学平台
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium mb-2">快速登录：</p>
            <div className="space-y-1 text-gray-600">
              <p>学生: student1 / password123</p>
              <p>教师: teacher1 / password123</p>
              <p>超管: admin / admin123</p>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('student')}
                disabled={loading}
                className="flex-1"
              >
                学生登录
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('teacher')}
                disabled={loading}
                className="flex-1"
              >
                教师登录
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('admin')}
                disabled={loading}
                className="flex-1"
              >
                超管登录
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
