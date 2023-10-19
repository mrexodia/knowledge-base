# HACK: Replace the sqlite3 module with pysqlite3 if it's too old
import sqlite3
if sqlite3.sqlite_version_info[0] < 3 or sqlite3.sqlite_version_info[1] < 24:
    print(f"Incompatible SQLite version: {sqlite3.sqlite_version}, attempting pysqlite3...")
    import sys
    # pip install pysqlite3-binary
    import pysqlite3
    sys.modules["sqlite3"] = pysqlite3

from typing import Optional, List, Union, Any
from typing_extensions import Self
from sqlalchemy import BigInteger, ForeignKey, UniqueConstraint, Column, MetaData
from sqlalchemy.orm import Mapped, mapped_column, MappedAsDataclass, DeclarativeBase, Session
from sqlalchemy.sql import expression
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.types import DateTime
from datetime import datetime
import uuid

# References:
# - https://docs.sqlalchemy.org/en/20/orm/quickstart.html
# - https://docs.sqlalchemy.org/en/20/core/type_basics.html#sqlalchemy.types.UUID
# - https://docs.sqlalchemy.org/en/20/orm/dataclasses.html
# - https://github.com/sqlalchemy/sqlalchemy/issues/2074#issuecomment-441912139
# - https://stackoverflow.com/a/69822361/1806760
# - https://bluecollardev.io/sql-anti-pattern-never-use-boolean-flags
# - https://stackoverflow.com/a/57722396
# - https://docs.sqlalchemy.org/en/14/orm/persistence_techniques.html#using-postgresql-on-conflict-with-returning-to-return-upserted-orm-objects

# HACK: auto increment doesn't work in sqlite for this type
@compiles(BigInteger, "sqlite")
def bi_c(element, compiler, **kw):
    return "INTEGER"

class utcnow(expression.FunctionElement):
    """Current UTC timestamp function."""

    type = DateTime()

@compiles(utcnow, 'postgresql')
def pg_utcnow(element, compiler, **kw):
    """Create current UTC timestamp for PostgreSQL."""
    return "timezone('UTC', current_timestamp)"

@compiles(utcnow, 'sqlite')
def sqlite_utcnow(element, compiler, **kw):
    """Create current UTC timestamp for SQLite."""
    return "(strftime('%Y-%m-%d %H:%M:%f', 'now'))"

def utc_to_local(utc_dt):
    from datetime import timezone
    return utc_dt.replace(tzinfo=timezone.utc).astimezone(tz=None)

class Base(DeclarativeBase, MappedAsDataclass):
    metadata = MetaData(naming_convention={
        "ix": 'ix_%(column_0_label)s',
        "uq": "uq_%(table_name)s_%(column_0_name)s",
        "ck": "ck_%(table_name)s_%(constraint_name)s",
        "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
        "pk": "pk_%(table_name)s"
    })

    def as_dict(self):
        from sqlalchemy import inspect
        result = {}
        for col in inspect(self).mapper.column_attrs:
            value = getattr(self, col.key)
            if value is not None:
                result[col.expression.name] = value
        return result

    @classmethod
    def insert_deduplicated(cls, session: Session, values: List[Union[dict, Self]], conflict_column: Optional[Union[Column[Any], str]] = None):
        if not isinstance(values, list):
            raise TypeError("Expected list")

        if len(values) == 0:
            return

        if isinstance(values[0], cls):
            values = [value.as_dict() for value in values]
        elif not isinstance(values[0], dict):
            raise TypeError("Expected List[dict]")

        index_elements = None
        if conflict_column is not None:
            index_elements = [conflict_column]

        dialect = session.get_bind().dialect.name
        if dialect == "sqlite":
            from sqlalchemy.dialects.sqlite import insert
            statement = insert(cls).values(values).on_conflict_do_nothing(index_elements=index_elements)
        elif dialect == "postgresql":
            from sqlalchemy.dialects.postgresql import insert
            statement = insert(cls).values(values).on_conflict_do_nothing(index_elements=index_elements)
        else:
            raise NotImplementedError(f"on_conflict_do_nothing not implemented in dialect '{unsupported}'")

        result = session.execute(statement)
        if result is None:
            return 0
        if result.rowcount is None:
            return 0
        return result.rowcount

class Link(Base):
    __tablename__ = "links"
    __table_args__ = (
        UniqueConstraint("url"),
        dict(
            comment="Unique links we indexed",
            sqlite_autoincrement=True,
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True, init=False)
    url: Mapped[str] = mapped_column(comment="Full link URL")
    index_time: Mapped[datetime] = mapped_column(comment="When this link got indexed", server_default=utcnow(), init=False)

def check_revision(engine, alembic_cfg):
    from alembic import script
    from alembic.runtime import migration
    import sys

    # Reference: https://stackoverflow.com/a/56085521/1806760
    script_ = script.ScriptDirectory.from_config(alembic_cfg)
    with engine.begin() as conn:
        context = migration.MigrationContext.configure(conn)
        actual_revision = context.get_current_revision()
        expected_revision = script_.get_current_head()

    if actual_revision != expected_revision:
        print(f"[FATAL] Outdated database revision. Expected: {expected_revision}, Actual: {actual_revision}")
        print("Command to run the migration:\n\n  flask db upgrade\n")
        sys.exit(1)
    else:
        print(f"Alembic database revision: {actual_revision}")
        return engine
