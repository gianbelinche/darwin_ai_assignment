from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

# pool_size + max_overflow let us handle bursts without spawning unlimited DB connections
engine = create_async_engine(
    settings.database_url,
    pool_size=10,
    max_overflow=20,
    # Required when connecting through PgBouncer in transaction mode (e.g. Supabase pooler).
    # PgBouncer doesn't support asyncpg's prepared statement cache across connections.
    connect_args={"statement_cache_size": 0},
)

# expire_on_commit=False keeps ORM objects usable after session.commit() in async
# context — without it, accessing attributes post-commit triggers lazy loads that
# fail inside an already-closed async session.
AsyncSessionFactory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields one AsyncSession per request."""
    async with AsyncSessionFactory() as session:
        yield session
