import uuid
import uuid6
from datetime import datetime, timezone
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import DateTime, Text

if TYPE_CHECKING:
    from .user import User
    from .subscription import Subscription


class WebhookEvent(SQLModel, table=True):
    __tablename__ = "webhook_event"

    id: uuid.UUID = Field(
        default_factory=uuid6.uuid7,
        primary_key=True,
        index=True,
        nullable=False,
    )

    # Paddle's own event ID — used to detect and reject duplicate webhooks
    paddle_event_id: str = Field(unique=True, index=True)

    # What happened — e.g. "subscription.active", "subscription.cancelled"
    event_type: str = Field(index=True)

    # Nullable — we might receive events before we can identify the user
    user_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="user.id",
        nullable=True,
        index=True,
    )

    # Nullable — same reasoning as user_id
    subscription_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="subscription.id",
        nullable=True,
        index=True,
    )

    # Raw Paddle subscription ID — stored separately so we have it even if
    # linking to our subscription row fails
    paddle_subscription_id: str | None = Field(default=None)

    # Full raw JSON from Dodo — invaluable for debugging and replaying events
    payload: str = Field(sa_column=Column(Text, nullable=False))

    # Processing state — lets us detect and retry failed events
    processed: bool = Field(default=False, index=True)
    processing_error: str | None = Field(default=None)

    # When the webhook arrived at our server
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), nullable=False)
    )

    # Relationships
    user: Optional["User"] = Relationship(back_populates="webhook_events")
    subscription: Optional["Subscription"] = Relationship(back_populates="webhook_events")
