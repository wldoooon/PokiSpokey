import uuid
import uuid6
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import DateTime, String

if TYPE_CHECKING:
    from .user import User
    from .subscription import Subscription


class PaymentStatus(str, Enum):
    SUCCEEDED                = "succeeded"
    FAILED                   = "failed"
    CANCELLED                = "cancelled"
    PROCESSING               = "processing"
    REQUIRES_CUSTOMER_ACTION = "requires_customer_action"
    REQUIRES_PAYMENT_METHOD  = "requires_payment_method"
    REFUNDED                 = "refunded"


class Invoice(SQLModel, table=True):
    __tablename__ = "invoice"

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

    subscription_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="subscription.id",
        nullable=True,
        index=True,
    )

    # Paddle's transaction identifier
    paddle_transaction_id: str = Field(unique=True, index=True)

    # Payment amount — always stored in cents to avoid float precision issues
    # Example: $12.00 → stored as 1200
    amount: int = Field(nullable=False)
    currency: str = Field(default="USD")

    # Payment outcome
    status: PaymentStatus = Field(
        sa_column=Column(String, nullable=False, index=True)
    )

    # Snapshot of plan at payment time — preserved even if user upgrades later
    plan: str = Field()           # "basic" / "pro" / "max"
    billing_period: str = Field() # "monthly" / "yearly"

    # The billing period this invoice covers
    period_start: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True))
    )
    period_end: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True))
    )

    # PDF invoice URL from Dodo (available after payment.succeeded)
    invoice_url: str | None = Field(default=None)

    # When the payment happened — used for sorting billing history in UI
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )

    # Relationships
    user: Optional["User"] = Relationship(back_populates="invoices")
    subscription: Optional["Subscription"] = Relationship(back_populates="invoices")
