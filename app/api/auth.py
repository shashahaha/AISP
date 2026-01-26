# app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict
from datetime import timedelta

from app.models.database import User
from app.models.schemas import UserResponse
from app.db.session import get_async_db
from app.utils.auth import (
    verify_password,
    create_access_token,
    get_password_hash,
    decode_token
)
from app.config import settings

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


@router.post("/login")
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
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.id},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    token: str,
    db: AsyncSession = Depends(get_async_db)
):
    """获取当前用户信息"""
    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证凭据"
        )

    result = await db.execute(
        select(User).where(User.id == payload["user_id"])
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    return user
