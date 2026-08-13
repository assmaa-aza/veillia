"""
Diagnostic script -- run this to isolate why get_unclassified_articles()
returns 0 rows even though the `articles` table has NULL categories.

Usage:
    python debug_category_query.py
"""
from dotenv import load_dotenv

load_dotenv()

import os

from supabase import create_client

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_KEY"]
table = os.getenv("SUPABASE_TABLE", "articles")

print(f"SUPABASE_URL   = {url}")
print(f"SUPABASE_TABLE = {table}")
print(f"SUPABASE_KEY   = {key[:8]}...{key[-4:]} (len={len(key)})")
print()

client = create_client(url, key)

# 1) Simple, direct filter: category IS NULL only (no OR, no empty-string check).
print("--- Test 1: simple .is_('category', 'null') ---")
resp1 = client.table(table).select("id, title, category").is_("category", "null").limit(5).execute()
print(f"Rows returned: {len(resp1.data)}")
for row in resp1.data:
    print(" -", row)
print()

# 2) The exact OR filter used by the real pipeline.
print("--- Test 2: pipeline's .or_('category.is.null,category.eq.') ---")
resp2 = (
    client.table(table)
    .select("id, title, category")
    .or_("category.is.null,category.eq.")
    .limit(5)
    .execute()
)
print(f"Rows returned: {len(resp2.data)}")
for row in resp2.data:
    print(" -", row)
print()

# 3) No filter at all, just to confirm we can read the table at all,
#    and see what a few real category values actually look like.
print("--- Test 3: no filter, first 5 rows (any category) ---")
resp3 = client.table(table).select("id, title, category").limit(5).execute()
print(f"Rows returned: {len(resp3.data)}")
for row in resp3.data:
    print(" -", row["id"], repr(row["category"]))
print()

# 4) Exact count of NULL categories, via Supabase's count option.
print("--- Test 4: exact count where category IS NULL ---")
resp4 = client.table(table).select("id", count="exact").is_("category", "null").execute()
print(f"count = {resp4.count}")
