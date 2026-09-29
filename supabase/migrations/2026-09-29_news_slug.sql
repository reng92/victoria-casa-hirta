-- Slug leggibili per le singole news: /news/coppa-italia-over-35-si-comincia
-- Generato dal database dal titolo (funzioni slugify/unique_slug di
-- 2026-09-26_slug.sql), così vale anche per quello che si pubblica dall'admin.

alter table public.news add column if not exists slug text;

create or replace function public.news_set_slug()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.slug := public.unique_slug(
    'public.news',
    coalesce(nullif(public.slugify(new.title), ''), 'news'),
    new.id
  );
  return new;
end;
$$;

drop trigger if exists news_set_slug on public.news;
create trigger news_set_slug
  before insert or update of title on public.news
  for each row execute function public.news_set_slug();

update public.news set title = title;
alter table public.news alter column slug set not null;
create unique index if not exists news_slug_key on public.news (slug);
