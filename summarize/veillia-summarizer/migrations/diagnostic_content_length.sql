-- Run in the Supabase SQL Editor to confirm the "insufficient content" hypothesis.

-- 1) How many articles fall under each pipeline's content threshold?
select
    count(*) filter (where length(content) < 50)  as under_50_chars,
    count(*) filter (where length(content) < 200) as under_200_chars,  -- analysis_main.py's current threshold
    count(*) filter (where content is null)       as null_content,
    count(*) as total
from articles;

-- 2) Look at a few examples to see what's actually in `content` right now.
select id, title, length(content) as content_length, left(content, 150) as preview, url
from articles
order by content_length asc nulls first
limit 10;
