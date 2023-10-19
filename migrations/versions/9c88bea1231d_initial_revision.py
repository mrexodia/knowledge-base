"""Initial revision

Revision ID: 9c88bea1231d
Revises:
Create Date: 2023-10-19 15:28:56.948807

"""
from alembic import op
import sqlalchemy as sa
import model

# revision identifiers, used by Alembic.
revision = '9c88bea1231d'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('links',
    sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('url', sa.String(), nullable=False, comment='Full link URL'),
    sa.Column('index_time', sa.DateTime(), server_default=model.utcnow(), nullable=False, comment='When this link got indexed'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_links')),
    sa.UniqueConstraint('url', name=op.f('uq_links_url')),
    comment='Unique links we indexed',
    sqlite_autoincrement=True
    )


def downgrade():
    op.drop_table('links')
