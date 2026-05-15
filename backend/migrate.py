"""
One-off migration: add missing columns to the devices table.
Safe to re-run — uses ADD COLUMN IF NOT EXISTS.
"""
import asyncio
import asyncpg


DATABASE_URL = (
    "postgresql://neondb_owner:npg_udYir7gHlT4v"
    "@ep-aged-meadow-aeaskra7-pooler.c-2.us-east-2.aws.neon.tech"
    "/neondb?sslmode=require"
)


async def migrate():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        await conn.execute("""
            ALTER TABLE devices
                ADD COLUMN IF NOT EXISTS pin INTEGER,
                ADD COLUMN IF NOT EXISTS protocol VARCHAR(30) DEFAULT 'http';
        """)
        print("Migration successful: 'pin' and 'protocol' columns added (or already existed).")
        
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
