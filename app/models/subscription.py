import uuid
import uuid6
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import DateTime, String

if TYPE_CHECKING:
    from .user import User
    from .invoice import Invoice
    from .webhook_event import WebhookEvent


class SubscriptionStatus(str, Enum):
    ACTIVE    = "active"      # paying and in good standing
    ON_HOLD   = "on_hold"     # payment failed / paused, Paddle dunning
    CANCELLED = "cancelled"   # user cancelled, access until current_period_end
    FAILED    = "failed"      # mandate creation failed — subscription never started
    EXPIRED   = "expired"     # period ended, access fully revoked


class Subscription(SQLModel, table=True):
    __tablename__ = "subscription"

    id: uuid.UUID = Field(
        default_factory=uuid6.uuid7,
        primary_key=True,
        index=True,
        nullable=False,
    )

    user_id: uuid.UUID = Field(
        foreign_key="user.id",
        nullable=False,
        index=True,
    )

    # Paddle identifiers
    paddle_subscription_id: str = Field(unique=True, index=True)
    paddle_customer_id: str = Field(index=True)
    paddle_price_id: str = Field()

    # Plan info — denormalized for fast querying without joining product mappings
    plan: str = Field(index=True)           # "basic" / "pro" / "max"
    billing_period: str = Field()           # "monthly" / "yearly"

    # Subscription state
    status: SubscriptionStatus = Field(
        default=SubscriptionStatus.ACTIVE,
        sa_column=Column(String, nullable=False, index=True)
    )
    cancel_at_period_end: bool = Field(default=False)

    # Billing period dates — the most critical dates in the system
    current_period_start: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True))
    )
    current_period_end: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True))
    )

    # Lifetime dates
    started_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True))
    )
    canceled_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True))
    )
    ended_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True))
    )

    # Churn analytics — populated from your cancellation UI, not Dodo
    cancellation_reason: str | None = Field(default=None)

    # Row timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), onupdate=lambda: datetime.now(timezone.utc))
    )

    # Relationships
    user: Optional["User"] = Relationship(back_populates="subscriptions")
    invoices: list["Invoice"] = Relationship(back_populates="subscription")
    webhook_events: list["WebhookEvent"] = Relationship(back_populates="subscription")
