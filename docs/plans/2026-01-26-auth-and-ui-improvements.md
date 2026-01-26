# AISP 系统完善实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 实现完整的用户认证系统，升级前端路由和状态管理，移除所有硬编码，实现真实数据流

**架构:** 后端采用JWT认证+权限中间件，前端采用React Router v6+Zustand状态管理，实现前后端完整数据流

**技术栈:**
- 后端: FastAPI + JWT + passlib
- 前端: React Router v6 + Zustand + Axios
- 数据库: PostgreSQL (已有)

---

## 阶段一：核心认证系统

### Task 1: 安装后端认证依赖

**Files:**
- Modify: `requirements.txt`

**Step 1: 添加JWT和密码加密依赖**

在 `requirements.txt` 末尾添加：
```
# JWT认证
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
```

**Step 2: 安装依赖**

```bash
pip install python-jose[cryptography] passlib[bcrypt]
```

**Step 3: 验证安装**

```bash
python -c "from jose import JWTError, jwt; print('JWT OK')"
python -c "from passlib.context import CryptContext; print('Passlib OK')"
```

预期输出：JWT OK 和 Passlib OK

**Step 4: 提交**

```bash
git add requirements.txt
git commit -m "feat: 添加JWT认证依赖"
```

---

### Task 2: 创建认证工具模块

**Files:**
- Create: `app/utils/auth.py`

**Step 1: 创建认证工具**

```python
# app/utils/auth.py
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.config import settings

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 token 获取方式
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """加密密码"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    """解码令牌"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except JWTError:
        return None

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """获取当前用户（依赖注入）"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    return payload
```

**Step 2: 更新配置文件**

在 `app/config.py` 的 `Settings` 类中添加：
```python
# JWT配置
ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24小时
```

**Step 3: 提交**

```bash
git add app/utils/auth.py app/config.py
git commit -m "feat: 创建JWT认证工具模块"
```

---

### Task 3: 创建认证API接口

**Files:**
- Create: `app/api/auth.py`

**Step 1: 创建认证路由**

```python
# app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.database import User
from app.models.schemas import UserLogin, Token, UserResponse
from app.db.session import get_async_db
from app.utils.auth import (
    verify_password,
    create_access_token,
    get_password_hash
)

router = APIRouter(prefix="/api/auth", tags=["认证"])

@router.post("/register", response_model=UserResponse)
async def register(
    username: str,
    password: str,
    email: str,
    role: str = "student",
    db: AsyncSession = Depends(get_async_db)
):
    """用户注册"""
    # 检查用户是否存在
    result = await db.execute(
        select(User).where(User.username == username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )
    
    # 创建新用户
    hashed_password = get_password_hash(password)
    new_user = User(
        username=username,
        hashed_password=hashed_password,
        email=email,
        role=role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return new_user

@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_async_db)
):
    """用户登录"""
    # 验证用户
    result = await db.execute(
        select(User).where(User.username == form_data.username)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 创建token
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.id}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user_from_token),
    db: AsyncSession = Depends(get_async_db)
):
    """获取当前用户信息"""
    result = await db.execute(
        select(User).where(User.id == current_user["user_id"])
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user

async def get_current_user_from_token(token: str = Depends(oauth2_scheme)) -> dict:
    """从token获取用户信息"""
    from app.utils.auth import decode_token
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据"
        )
    return payload
```

**Step 2: 更新 schemas 添加 Token 模型**

在 `app/models/schemas.py` 添加：
```python
class Token(BaseModel):
    access_token: str
    token_type: str
```

**Step 3: 注册路由**

在 `app/main.py` 中添加：
```python
from app.api import auth

app.include_router(auth.router)
```

**Step 4: 提交**

```bash
git add app/api/auth.py app/models/schemas.py app/main.py
git commit -m "feat: 添加用户认证API接口"
```

---

### Task 4: 安装前端依赖

**Files:**
- Modify: `package.json`

**Step 1: 安装 React Router 和 Zustand**

```bash
npm install react-router-dom zustand axios
```

**Step 2: 验证安装**

检查 `package.json` 确认依赖已添加。

**Step 3: 提交**

```bash
git add package.json package-lock.json
git commit -m "feat: 添加前端路由和状态管理依赖"
```

---

### Task 5: 创建前端状态管理 Store

**Files:**
- Create: `src/app/stores/authStore.ts`
- Create: `src/app/stores/index.ts`

**Step 1: 创建认证 Store**

```typescript
// src/app/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),
      clearAuth: () =>
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
);
```

**Step 2: 创建 Store 导出文件**

```typescript
// src/app/stores/index.ts
export { useAuthStore } from './authStore';
```

**Step 3: 提交**

```bash
git add src/app/stores/
git commit -m "feat: 创建认证状态管理Store"
```

---

### Task 6: 创建 API 客户端（带 token）

**Files:**
- Modify: `src/app/services/api.ts`

**Step 1: 更新 API 客户端**

```typescript
// src/app/services/api.ts
import axios, { AxiosInstance } from 'axios';
import { useAuthStore } from '../stores/authStore';

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://10.21.1.5:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 认证接口
export const authAPI = {
  login: async (username: string, password: string) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    const response = await apiClient.post('/api/auth/login', formData);
    return response.data;
  },
  
  register: async (username: string, password: string, email: string, role: string) => {
    const response = await apiClient.post('/api/auth/register', null, {
      params: { username, password, email, role }
    });
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },
};

// 导出原有的 chat API（使用新的 apiClient）
export { apiClient };

// 保持原有的 AISPApiClient 类，但内部使用 apiClient
// ... (保留原有代码，但将 fetch 调用替换为 apiClient 调用)
```

**Step 2: 提交**

```bash
git add src/app/services/api.ts
git commit -m "feat: 更新API客户端支持JWT认证"
```

---

### Task 7: 创建前端路由结构

**Files:**
- Create: `src/app/pages/LoginPage.tsx`
- Create: `src/app/pages/StudentDashboard.tsx`
- Create: `src/app/pages/TeacherDashboard.tsx`
- Create: `src/app/pages/AdminDashboard.tsx`
- Create: `src/app/router.tsx`

**Step 1: 移动现有页面组件**

```bash
# 移动现有的页面组件到 pages 目录
mv src/app/components/LoginPage.tsx src/app/pages/
mv src/app/components/StudentDashboard.tsx src/app/pages/
mv src/app/components/TeacherDashboard.tsx src/app/pages/
mv src/app/components/AdminDashboard.tsx src/app/pages/
```

**Step 2: 创建路由配置**

```typescript
// src/app/router.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { AdminDashboard } from './pages/AdminDashboard';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route 
          path="/student" 
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/teacher" 
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Step 3: 更新 App.tsx**

```typescript
// src/app/App.tsx
import { AppRouter } from './router';

function App() {
  return <AppRouter />;
}

export default App;
```

**Step 4: 更新导入路径**

更新所有 Dashboard 组件中的导入：
```typescript
// 从
import { AISPDialog } from '@/app/components/AISPDialog';
// 改为
import { AISPDialog } from '@/app/components/AISPDialog';
```

**Step 5: 提交**

```bash
git add src/app/pages/ src/app/router.tsx src/app/App.tsx
git commit -m "feat: 实现React Router路由系统"
```

---

### Task 8: 更新登录页面使用真实 API

**Files:**
- Modify: `src/app/pages/LoginPage.tsx`

**Step 1: 重写登录逻辑**

```typescript
// src/app/pages/LoginPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';
import { authAPI } from '../services/api';
// ... 保持现有 UI 组件导入

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(username, password);
      const { access_token, user_id } = response;
      
      // 获取用户信息
      const user = await authAPI.getCurrentUser();
      
      // 保存到 store
      setAuth(user, access_token);
      
      // 根据角色跳转
      switch (user.role) {
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
      setError(err.response?.data?.detail || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  // ... 保持现有 UI 渲染代码，但添加 loading 和 error 显示
}
```

**Step 2: 提交**

```bash
git add src/app/pages/LoginPage.tsx
git commit -m "feat: 登录页面连接真实认证API"
```

---

### Task 9: 创建病例管理 API

**Files:**
- Create: `app/api/cases.py`

**Step 1: 创建病例 CRUD 接口**

```python
# app/api/cases.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.models.database import Case
from app.models.schemas import CaseCreate, CaseResponse
from app.db.session import get_async_db
from app.utils.auth import get_current_user_from_token

router = APIRouter(prefix="/api/cases", tags=["病例管理"])

@router.get("/", response_model=List[CaseResponse])
async def list_cases(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user_from_token)
):
    """获取病例列表"""
    result = await db.execute(
        select(Case).offset(skip).limit(limit)
    )
    cases = result.scalars().all()
    return cases

@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user_from_token)
):
    """获取单个病例"""
    result = await db.execute(
        select(Case).where(Case.case_id == case_id)
    )
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="病例不存在")
    return case

@router.post("/", response_model=CaseResponse)
async def create_case(
    case: CaseCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user_from_token)
):
    """创建病例（仅教师/管理员）"""
    if current_user["role"] not in ["teacher", "admin"]:
        raise HTTPException(status_code=403, detail="无权限")
    
    # 创建病例逻辑
    new_case = Case(**case.model_dump())
    db.add(new_case)
    await db.commit()
    await db.refresh(new_case)
    return new_case
```

**Step 2: 注册路由**

在 `app/main.py` 添加：
```python
from app.api import cases
app.include_router(cases.router)
```

**Step 3: 提交**

```bash
git add app/api/cases.py app/main.py
git commit -m "feat: 添加病例管理API接口"
```

---

### Task 10: 前端连接病例 API

**Files:**
- Modify: `src/app/services/api.ts`
- Modify: `src/app/pages/StudentDashboard.tsx`

**Step 1: 添加病例 API 到前端**

```typescript
// src/app/services/api.ts
export const casesAPI = {
  list: async () => {
    const response = await apiClient.get('/api/cases/');
    return response.data;
  },
  
  get: async (caseId: string) => {
    const response = await apiClient.get(`/api/cases/${caseId}`);
    return response.data;
  },
};
```

**Step 2: 更新 StudentDashboard 使用真实数据**

```typescript
// src/app/pages/StudentDashboard.tsx
import { useEffect, useState } from 'react';
import { casesAPI } from '../services/api';

export function StudentDashboard() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const data = await casesAPI.list();
      setCases(data);
    } catch (error) {
      console.error('加载病例失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>加载中...</div>;

  // ... 渲染病例列表
}
```

**Step 3: 删除 mockData**

```bash
rm src/app/mockData.ts
```

**Step 4: 更新所有引用 mockData 的地方**

搜索并替换所有 `import { mockCases } from '@/app/mockData'` 为 API 调用。

**Step 5: 提交**

```bash
git add src/app/services/api.ts src/app/pages/StudentDashboard.tsx
git commit -m "feat: 连接真实病例API，移除模拟数据"
```

---

## 阶段二：用户体验优化

### Task 11: 添加加载状态组件

**Files:**
- Create: `src/app/components/LoadingSpinner.tsx`

**Step 1: 创建加载组件**

```typescript
// src/app/components/LoadingSpinner.tsx
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 ${sizeClasses[size]}`}
      />
    </div>
  );
}
```

**Step 2: 提交**

```bash
git add src/app/components/LoadingSpinner.tsx
git commit -m "feat: 添加加载状态组件"
```

---

### Task 12: 添加错误边界组件

**Files:**
- Create: `src/app/components/ErrorBoundary.tsx`

**Step 1: 创建错误边界**

```typescript
// src/app/components/ErrorBoundary.tsx
import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('错误边界捕获:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-600 mb-4">出错了</h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || '应用程序遇到错误'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Step 2: 在 App.tsx 中使用**

```typescript
// src/app/App.tsx
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  );
}
```

**Step 3: 提交**

```bash
git add src/app/components/ErrorBoundary.tsx src/app/App.tsx
git commit -m "feat: 添加错误边界组件"
```

---

### Task 13: 添加 Toast 通知系统

**Files:**
- Create: `src/app/stores/toastStore.ts`
- Create: `src/app/components/Toast.tsx`

**Step 1: 创建 Toast Store**

```typescript
// src/app/stores/toastStore.ts
import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type: Toast['type']) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type) => {
    const id = Date.now().toString();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
```

**Step 2: 创建 Toast 组件**

```typescript
// src/app/components/Toast.tsx
import { useToastStore } from '../stores/toastStore';
import { useEffect } from 'react';

export function Toast() {
  const { toasts, removeToast } = useToastStore();

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${getTypeStyles(toast.type)} text-white px-4 py-2 rounded shadow-lg`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
```

**Step 3: 在 App.tsx 中添加**

```typescript
// src/app/App.tsx
import { Toast } from './components/Toast';

function App() {
  return (
    <ErrorBoundary>
      <AppRouter />
      <Toast />
    </ErrorBoundary>
  );
}
```

**Step 4: 提交**

```bash
git add src/app/stores/toastStore.ts src/app/components/Toast.tsx src/app/App.tsx
git commit -m "feat: 添加Toast通知系统"
```

---

### Task 14: 移除所有硬编码用户ID

**Files:**
- Modify: `app/api/chat.py`
- Modify: 所有后端文件中的硬编码 user_id

**Step 1: 更新 chat.py 使用真实用户ID**

```python
# app/api/chat.py
from app.utils.auth import get_current_user_from_token

@router.post("/start")
async def start_chat_session(
    request: ChatRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: dict = Depends(get_current_user_from_token)
):
    # 获取真实用户ID
    user_id = current_user["user_id"]
    
    # ... 其余代码使用真实 user_id
```

**Step 2: 提交**

```bash
git add app/api/chat.py
git commit -m "fix: 移除硬编码用户ID，使用认证用户"
```

---

### Task 15: 添加环境变量配置文件

**Files:**
- Create: `.env.example`
- Create: `.env.production.example`

**Step 1: 创建环境变量模板**

```bash
# .env.example
VITE_API_URL=http://localhost:8000
```

```bash
# .env.production.example
VITE_API_URL=https://your-api-domain.com
```

**Step 2: 提交**

```bash
git add .env.example .env.production.example
git commit -m "docs: 添加环境变量配置模板"
```

---

### Task 16: 更新文档

**Files:**
- Modify: `README.md`

**Step 1: 更新 README**

```markdown
# AISP - AI医学标准化病人系统

## 快速开始

### 后端启动

```bash
# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 初始化数据库
python scripts/init_db.py

# 启动后端
python -m app.main
```

### 前端启动

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 文件

# 启动前端
npm run dev
```

### 默认账号

- 学生: student1 / password123
- 教师: teacher1 / password123
- 管理员: admin / admin123
```

**Step 2: 提交**

```bash
git add README.md
git commit -m "docs: 更新项目启动文档"
```

---

## 测试检查清单

### 后端测试

```bash
# 测试注册
curl -X POST "http://localhost:8000/api/auth/register?username=testuser&password=test123&email=test@example.com&role=student"

# 测试登录
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=test123"

# 测试获取病例（需要 token）
curl -X GET "http://localhost:8000/api/cases/" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 前端测试

1. 访问 http://localhost:5173/login
2. 使用测试账号登录
3. 验证自动跳转到对应角色页面
4. 测试病例列表加载
5. 测试开始对话功能
6. 测试退出登录

---

### Task 17: 实现后端 WebSocket 连接管理

**Files:**
- Modify: `app/api/websocket.py`
- Create: `app/services/connection_manager.py`

**Step 1: 创建连接管理器**

```python
# app/services/connection_manager.py
from fastapi import WebSocket
from typing import Dict
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]

    async def send_message(self, message: dict, session_id: str):
        if session_id in self.active_connections:
            await self.active_connections[session_id].send_json(message)

    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)

manager = ConnectionManager()
```

**Step 2: 更新 WebSocket 路由**

```python
# app/api/websocket.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import json

from app.services.connection_manager import manager
from app.core.chat_engine import get_chat_engine
from app.services.session_service import SessionService
from app.db.session import get_async_db

router = APIRouter()

@router.websocket("/ws/chat/{session_id}")
async def websocket_chat(
    websocket: WebSocket,
    session_id: str,
    db: AsyncSession = Depends(get_async_db)
):
    await manager.connect(websocket, session_id)
    
    try:
        while True:
            # 接收客户端消息
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "message":
                # 处理用户消息
                session_service = SessionService(db)
                engine = get_chat_engine()
                
                # 保存用户消息
                await session_service.add_message(
                    session_id=session_id,
                    role="student",
                    content=data["content"]
                )
                
                # 获取AI回复
                case_data = await _get_case_data(db, data["case_id"])
                conversation_history = await session_service.get_conversation_history(session_id)
                
                response = await engine.chat(
                    session_id=session_id,
                    user_message=data["content"],
                    case_data=case_data,
                    conversation_history=conversation_history
                )
                
                # 保存AI回复
                await session_service.add_message(
                    session_id=session_id,
                    role="patient",
                    content=response.response
                )
                
                await db.commit()
                
                # 发送AI回复到客户端
                await manager.send_message({
                    "type": "response",
                    "content": response.response,
                    "metadata": response.metadata
                }, session_id)
                
            elif message_type == "typing":
                # 转发输入状态
                await manager.send_message({
                    "type": "typing",
                    "is_typing": data["is_typing"]
                }, session_id)
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)
```

**Step 3: 提交**

```bash
git add app/services/connection_manager.py app/api/websocket.py
git commit -m "feat: 实现WebSocket连接管理器"
```

---

### Task 18: 前端 WebSocket 客户端

**Files:**
- Create: `src/app/services/websocket.ts`
- Modify: `src/app/components/AISPDialog.tsx`

**Step 1: 创建 WebSocket 服务**

```typescript
// src/app/services/websocket.ts
export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private sessionId: string;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(sessionId: string, token: string) {
    this.sessionId = sessionId;
    const wsUrl = import.meta.env.VITE_API_URL?.replace('http', 'ws') || 'ws://10.21.1.5:8000';
    this.url = `${wsUrl}/ws/chat/${sessionId}?token=${token}`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
        this.connect();
      }, 2000 * this.reconnectAttempts);
    }
  }

  sendMessage(type: string, content: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...content }));
    }
  }

  onMessage(callback: (data: any) => void) {
    if (this.ws) {
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        callback(data);
      };
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

**Step 2: 更新 AISPDialog 使用 WebSocket**

```typescript
// src/app/components/AISPDialog.tsx
import { ChatWebSocket } from '@/app/services/websocket';
import { useAuthStore } from '@/app/stores';

export function AISPDialog({ caseItem, studentId, onComplete, onBack }: AISPDialogProps) {
  const [wsClient, setWsClient] = useState<ChatWebSocket | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    let client: ChatWebSocket | null = null;

    const initWebSocket = async () => {
      try {
        const response = await apiClient.startChatSession(caseItem.id);
        setSessionId(response.session_id);

        // 创建 WebSocket 连接
        client = new ChatWebSocket(response.session_id, token || '');
        await client.connect();

        // 设置消息处理
        client.onMessage((data) => {
          if (data.type === 'response') {
            // 处理AI回复
            const aiResponse: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'aisp',
              content: data.content,
              type: 'text',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiResponse]);
            setIsTyping(false);
            setIsAispSpeaking(false);
          } else if (data.type === 'typing') {
            setIsTyping(data.is_typing);
          }
        });

        setWsClient(client);
      } catch (error) {
        console.error('WebSocket init failed:', error);
        // 降级到 HTTP 轮询
        fallbackToHttp();
      }
    };

    initWebSocket();

    return () => {
      if (client) {
        client.close();
      }
    };
  }, [caseItem.id, token]);

  const handleSend = async () => {
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

    // 使用 WebSocket 发送消息
    if (wsClient) {
      wsClient.sendMessage('message', {
        content: input,
        case_id: caseItem.id
      });
    } else {
      // 降级到 HTTP
      await sendViaHttp(input);
    }
  };

  // ... 其余代码
}
```

**Step 3: 提交**

```bash
git add src/app/services/websocket.ts src/app/components/AISPDialog.tsx
git commit -m "feat: 实现WebSocket实时通信"
```

---

## 完成标准

- [ ] 用户可以使用真实账号登录
- [ ] 登录后自动跳转到对应角色页面
- [ ] 病例列表从后端API获取
- [ ] 对话功能使用真实AI
- [ ] WebSocket实时通信正常工作
- [ ] 连接断开时自动重连
- [ ] 降级到HTTP轮询作为备选
- [ ] 所有硬编码已移除
- [ ] URL随页面变化
- [ ] 支持浏览器前进/后退
- [ ] 错误有友好的提示
- [ ] 加载状态有明确指示
- [ ] 实时显示AI输入状态

---

**预计完成时间：** 3-4小时
**涉及文件：** 约23个文件
**新增代码行数：** 约1800行
