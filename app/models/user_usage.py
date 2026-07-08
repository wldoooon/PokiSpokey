import uuid
from datetime import datetime, date, timezone
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import DateTime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .user import User


class UserUsage(SQLModel, table=True):
    __tablename__ = "user_usage"
    
    user_id: uuid.UUID = Field(
        foreign_key="user.id",
        primary_key=True,
        nullable=False,
        index=True
    )
    
    searches_count: int = Field(default=0)
    
    ai_credit_balance: int = Field(default=15000)
    usage_reset_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    
    total_searches: int = Field(default=50)
    total_ai_chats: int = Field(default=0)
    
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
    )
    
    user: "User" = Relationship(back_populates="usage")


class UserUsageRead(SQLModel):
    searches_count: int = 0
    ai_credit_balance: int = 15000
    total_searches: int = 50
    total_ai_chats: int = 0
