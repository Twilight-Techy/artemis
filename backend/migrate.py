"""
One-off migration: add missing columns to the devices table.
Safe to re-run — uses ADD COLUMN IF NOT EXISTS.
"""
import asyncio
import asyncpg
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from app.config import get_settings


def get_asyncpg_database_url() -> str:
    database_url = get_settings().database_url
    database_url = database_url.replace("postgresql+asyncpg://", "postgresql://", 1)

    parsed = urlsplit(database_url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise RuntimeError("DATABASE_URL must be a PostgreSQL connection URL for migrations.")

    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    if query.get("ssl") == "require" and "sslmode" not in query:
        query["sslmode"] = query.pop("ssl")
        database_url = urlunsplit(
            (parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment)
        )

    return database_url


async def migrate():
    conn = await asyncpg.connect(get_asyncpg_database_url())
    try:
        await conn.execute("""
            ALTER TABLE devices
                ADD COLUMN IF NOT EXISTS pin INTEGER,
                ADD COLUMN IF NOT EXISTS protocol VARCHAR(30) DEFAULT 'http';
        """)
        print("Migration successful: 'pin' and 'protocol' columns added (or already existed).")
        
        await conn.execute("""
            ALTER TABLE users
                ADD COLUMN IF NOT EXISTS push_token VARCHAR(512);
        """)
        print("Migration successful: 'push_token' column added to users (or already existed).")
        
        await conn.execute("""
            ALTER TABLE functions
                ADD COLUMN IF NOT EXISTS device_actions JSON,
                ADD COLUMN IF NOT EXISTS triggers JSON,
                ADD COLUMN IF NOT EXISTS conditions JSON;
        """)
        print("Migration successful: 'device_actions', 'triggers', 'conditions' columns added to functions (or already existed).")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(migrate())
