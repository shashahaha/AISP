# app/api/tasks.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from app.models.database import CourseTask, User
from app.db.session import get_async_db

router = APIRouter(prefix="/api/tasks", tags=["课程任务管理"])


class TaskCreate(BaseModel):
    """创建任务请求"""
    name: str
    description: Optional[str] = None
    teacher_id: int
    case_ids: List[str]
    difficulty: str = "medium"
    assigned_students: List[str]


class TaskUpdate(BaseModel):
    """更新任务请求"""
    name: Optional[str] = None
    description: Optional[str] = None
    case_ids: Optional[List[str]] = None
    difficulty: Optional[str] = None
    assigned_students: Optional[List[str]] = None


class TaskResponse(BaseModel):
    """任务响应"""
    id: int
    name: str
    description: Optional[str] = None
    teacher_id: int
    case_ids: List[str]
    difficulty: str
    assigned_students: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    teacher_id: Optional[int] = Query(None, description="按教师筛选"),
    student_id: Optional[str] = Query(None, description="按学生筛选"),
    db: AsyncSession = Depends(get_async_db)
):
    """获取任务列表"""
    query = select(CourseTask)

    if teacher_id:
        query = query.where(CourseTask.teacher_id == teacher_id)
    
    # 注意：这里 student_id 是字符串，因为 assigned_students 存储的是字符串列表
    # 如果 student_id 被提供，我们需要在 JSON 数组中查找
    # SQLAlchemy 的 JSON 包含查询可能因数据库而异，这里使用简单的 python 过滤或者 SQL 兼容方式
    
    result = await db.execute(query.order_by(CourseTask.created_at.desc()))
    tasks = result.scalars().all()

    if student_id:
        # 在应用层过滤，因为 sqlite/postgresql 对 JSON 数组包含的语法不同
        tasks = [t for t in tasks if student_id in (t.assigned_students or [])]

    return tasks


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """获取单个任务详情"""
    result = await db.execute(
        select(CourseTask).where(CourseTask.id == task_id)
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    return task


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_async_db)
):
    """创建新任务"""
    new_task = CourseTask(
        name=task_data.name,
        description=task_data.description,
        teacher_id=task_data.teacher_id,
        case_ids=task_data.case_ids,
        difficulty=task_data.difficulty,
        assigned_students=task_data.assigned_students
    )

    db.add(new_task)
    await db.commit()
    await db.refresh(new_task)

    return new_task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: AsyncSession = Depends(get_async_db)
):
    """更新任务"""
    result = await db.execute(
        select(CourseTask).where(CourseTask.id == task_id)
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    # 更新字段
    update_data = task_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    await db.commit()
    await db.refresh(task)

    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_async_db)
):
    """删除任务"""
    result = await db.execute(
        select(CourseTask).where(CourseTask.id == task_id)
    )
    task = result.scalar_one_or_none()

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="任务不存在"
        )

    await db.delete(task)
    await db.commit()

    return None
