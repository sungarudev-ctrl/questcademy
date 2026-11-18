import os
from logging.config import fileConfig
from sqlalchemy import create_engine, pool
from alembic import context

from backend.app.db.base import Base
import backend.app.db.models.framework  # ensure all models registered

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    x_args = context.get_x_argument(as_dictionary=True)
    if "sqlalchemy.url" in x_args:
        return x_args["sqlalchemy.url"]
    main_url = config.get_main_option("sqlalchemy.url")
    if main_url:
        return main_url
    return os.getenv("DATABASE_URL", "sqlite:///backend/test_alembic.db")


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    url = get_url()
    connectable = create_engine(url, poolclass=pool.NullPool)

    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
