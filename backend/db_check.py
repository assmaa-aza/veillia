from app.database.supabase_client import get_supabase_admin
admin = get_supabase_admin()

print('Checking category distribution...')
res = admin.table('articles').select('category').execute()
categories = {}
for row in res.data:
    cat = row.get('category')
    categories[cat] = categories.get(cat, 0) + 1
print('Categories:', categories)

print('\nChecking startups category specifically...')
startups = admin.table('articles').select('id, title, category, summary, published_at').eq('category', 'startups').execute()
print(f'Total startups articles: {len(startups.data)}')
for a in startups.data[:5]:
    summ_len = len(a.get('summary') or '')
    pub_at = a.get('published_at')
    print(f" - ID: {a.get('id')}, pub_at: {pub_at}, summary_len: {summ_len}")
