"""dodo_to_paddle

Revision ID: b3f1a2c9d8e7
Revises: 180496ed4400
Create Date: 2026-07-14 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op


revision: str = 'b3f1a2c9d8e7'
down_revision: Union[str, Sequence[str], None] = '180496ed4400'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # user
    op.alter_column('user', 'dodo_customer_id', new_column_name='paddle_customer_id')

    # subscription
    op.alter_column('subscription', 'dodo_subscription_id', new_column_name='paddle_subscription_id')
    op.alter_column('subscription', 'dodo_customer_id',     new_column_name='paddle_customer_id')
    op.alter_column('subscription', 'dodo_product_id',      new_column_name='paddle_price_id')

    # invoice
    op.alter_column('invoice', 'dodo_payment_id', new_column_name='paddle_transaction_id')

    # webhook_event
    op.alter_column('webhook_event', 'dodo_event_id',        new_column_name='paddle_event_id')
    op.alter_column('webhook_event', 'dodo_subscription_id', new_column_name='paddle_subscription_id')


def downgrade() -> None:
    op.alter_column('webhook_event', 'paddle_subscription_id', new_column_name='dodo_subscription_id')
    op.alter_column('webhook_event', 'paddle_event_id',        new_column_name='dodo_event_id')
    op.alter_column('invoice', 'paddle_transaction_id', new_column_name='dodo_payment_id')
    op.alter_column('subscription', 'paddle_price_id',          new_column_name='dodo_product_id')
    op.alter_column('subscription', 'paddle_customer_id',       new_column_name='dodo_customer_id')
    op.alter_column('subscription', 'paddle_subscription_id',   new_column_name='dodo_subscription_id')
    op.alter_column('user', 'paddle_customer_id', new_column_name='dodo_customer_id')
