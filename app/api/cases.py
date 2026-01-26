# app/api/cases.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.models.database import Case
from app.db.session import get_async_db

router = APIRouter(prefix="/api/cases", tags=["病例管理"])


class CaseCreate(BaseModel):
    """创建病例请求"""
    case_id: str
    title: str
    description: Optional[str] = None
    difficulty: str = "medium"
    category: str = "内科"
    patient_info: Dict[str, Any]
    chief_complaint: Dict[str, Any]
    symptoms: Dict[str, Any]
    standard_diagnosis: str
    differential_diagnosis: Optional[List[str]] = None
    key_questions: Optional[List[str]] = None


class CaseUpdate(BaseModel):
    """更新病例请求"""
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    patient_info: Optional[Dict[str, Any]] = None
    chief_complaint: Optional[Dict[str, Any]] = None
    symptoms: Optional[Dict[str, Any]] = None
    standard_diagnosis: Optional[str] = None
    differential_diagnosis: Optional[List[str]] = None
    key_questions: Optional[List[str]] = None
    is_active: Optional[int] = None


class CaseResponse(BaseModel):
    """病例响应"""
    id: int
    case_id: str
    title: str
    description: Optional[str] = None
    difficulty: str
    category: str
    patient_info: Dict[str, Any]
    chief_complaint: Dict[str, Any]
    symptoms: Dict[str, Any]
    standard_diagnosis: str
    differential_diagnosis: Optional[List[str]] = None
    key_questions: Optional[List[str]] = None
    is_active: int

    # 不返回created_at，避免datetime序列化问题


@router.get("", response_model=List[CaseResponse])
async def list_cases(
    category: Optional[str] = Query(None, description="按科室筛选"),
    difficulty: Optional[str] = Query(None, description="按难度筛选"),
    is_active: Optional[bool] = Query(True, description="是否只显示激活病例"),
    db: AsyncSession = Depends(get_async_db)
):
    """获取病例列表"""
    query = select(Case)

    if is_active is not None:
        query = query.where(Case.is_active == (1 if is_active else 0))

    if category:
        query = query.where(Case.category == category)

    if difficulty:
        query = query.where(Case.difficulty == difficulty)

    query = query.order_by(Case.created_at.desc())

    result = await db.execute(query)
    cases = result.scalars().all()

    return cases


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    db: AsyncSession = Depends(get_async_db)
):
    """获取单个病例详情"""
    result = await db.execute(
        select(Case).where(Case.case_id == case_id)
    )
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="病例不存在"
        )

    return case


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    case_data: CaseCreate,
    db: AsyncSession = Depends(get_async_db)
):
    """创建新病例（仅教师/管理员）"""
    # 检查case_id是否已存在
    existing = await db.execute(
        select(Case).where(Case.case_id == case_data.case_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="病例ID已存在"
        )

    new_case = Case(
        case_id=case_data.case_id,
        title=case_data.title,
        description=case_data.description,
        difficulty=case_data.difficulty,
        category=case_data.category,
        patient_info=case_data.patient_info,
        chief_complaint=case_data.chief_complaint,
        symptoms=case_data.symptoms,
        standard_diagnosis=case_data.standard_diagnosis,
        differential_diagnosis=case_data.differential_diagnosis,
        key_questions=case_data.key_questions,
        is_active=1
    )

    db.add(new_case)
    await db.commit()
    await db.refresh(new_case)

    return new_case


@router.put("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    case_data: CaseUpdate,
    db: AsyncSession = Depends(get_async_db)
):
    """更新病例（仅教师/管理员）"""
    result = await db.execute(
        select(Case).where(Case.case_id == case_id)
    )
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="病例不存在"
        )

    # 更新字段
    update_data = case_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(case, field, value)

    await db.commit()
    await db.refresh(case)

    return case


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(
    case_id: str,
    db: AsyncSession = Depends(get_async_db)
):
    """删除病例（仅管理员）"""
    result = await db.execute(
        select(Case).where(Case.case_id == case_id)
    )
    case = result.scalar_one_or_none()

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="病例不存在"
        )

    await db.delete(case)
    await db.commit()

    return None


@router.get("/categories/list", response_model=List[str])
async def list_categories(
    db: AsyncSession = Depends(get_async_db)
):
    """获取所有科室分类"""
    result = await db.execute(
        select(Case.category).distinct().where(Case.is_active == 1)
    )
    categories = [row[0] for row in result.all()]

    return categories
