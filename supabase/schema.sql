create table if not exists public.user_words (
 user_id uuid not null references auth.users(id) on delete cascade,
 word text not null check (length(word) between 1 and 100),
 favorite boolean not null default false,
 viewed_at timestamptz not null default now(),
 primary key (user_id, word)
);
create index if not exists user_words_history on public.user_words(user_id, viewed_at desc);
alter table public.user_words enable row level security;
create policy "Read own words" on public.user_words for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own words" on public.user_words for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own words" on public.user_words for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Delete own words" on public.user_words for delete to authenticated using ((select auth.uid()) = user_id);
