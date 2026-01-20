import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { User } from '@/app/types';
import { mockUsers } from '@/app/mockData';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = mockUsers.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      onLogin(user);
    } else {
      setError('用户名或密码错误');
    }
  };

  const handleQuickLogin = (role: 'student' | 'teacher' | 'admin') => {
    const credentials = {
      student: { username: 'student1', password: '123456' },
      teacher: { username: 'teacher1', password: '123456' },
      admin: { username: 'admin', password: 'admin123' },
    };

    const { username: u, password: p } = credentials[role];
    setUsername(u);
    setPassword(p);
    
    const user = mockUsers.find(
      (user) => user.username === u && user.password === p
    );

    if (user) {
      onLogin(user);
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
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            <Button type="submit" className="w-full">
              登录
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm">
            <p className="font-medium mb-2">测试账号：</p>
            <div className="space-y-1 text-gray-600">
              <p>学生: student1 / 123456</p>
              <p>教师: teacher1 / 123456</p>
              <p>超管: admin / admin123</p>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('student')}
                className="flex-1"
              >
                学生登录
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('teacher')}
                className="flex-1"
              >
                教师登录
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('admin')}
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