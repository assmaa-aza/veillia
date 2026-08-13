-- Run this once in the Supabase SQL Editor, after 001_add_category_column.sql.
-- Adds "produit_ia" to the set of allowed category values.

do $$
begin
    if exists (
        select 1 from pg_constraint where conname = 'articles_category_check'
    ) then
        alter table articles drop constraint articles_category_check;
    end if;

    alter table articles
        add constraint articles_category_check
        check (category is null or category in (
            'recherche', 'startup', 'ecosysteme', 'evenement', 'tendance',
            'reglementation', 'produit_ia'
        ));
end $$;
