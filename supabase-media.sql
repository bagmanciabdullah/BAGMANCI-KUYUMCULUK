-- Run once in the existing project's SQL Editor; existing products stay intact.
begin;
alter table public.products add column if not exists media jsonb not null default '[]'::jsonb;

create table if not exists public.media_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.media_admins enable row level security;
revoke all on public.media_admins from anon, authenticated;
insert into public.media_admins(user_id)
select id from auth.users where lower(email) = 'bagmanciabdullah93@gmail.com' and email_confirmed_at is not null
on conflict do nothing;

create or replace function public.can_manage_media()
returns boolean language sql stable security definer set search_path = '' as $$
  select (auth.jwt()->>'aal') = 'aal2'
    and exists(select 1 from public.media_admins where user_id = auth.uid());
$$;
revoke all on function public.can_manage_media() from public;
grant execute on function public.can_manage_media() to authenticated;

create table if not exists public.site_assets (
  key text primary key,
  url text not null check (url like 'https://%'),
  original_url text not null check (original_url like 'https://%'),
  type text not null default 'image' check (type = 'image'),
  crop jsonb not null default '{}'::jsonb
);
alter table public.site_assets enable row level security;
grant select on public.site_assets to anon, authenticated;
grant insert, update, delete on public.site_assets to authenticated;
drop policy if exists "Read site media" on public.site_assets;
create policy "Read site media" on public.site_assets for select to anon, authenticated using (true);
drop policy if exists "Manage site media" on public.site_assets;
create policy "Manage site media" on public.site_assets for all to authenticated
using (public.can_manage_media()) with check (public.can_manage_media());

-- Restrictive policies also constrain older, permissive MFA-only policies.
drop policy if exists "Media product insert owner" on public.products;
create policy "Media product insert owner" on public.products as restrictive for insert to authenticated with check (public.can_manage_media());
drop policy if exists "Media product update owner" on public.products;
create policy "Media product update owner" on public.products as restrictive for update to authenticated using (public.can_manage_media()) with check (public.can_manage_media());
drop policy if exists "Media storage insert owner" on storage.objects;
create policy "Media storage insert owner" on storage.objects as restrictive for insert to authenticated
with check (bucket_id <> 'product-images' or public.can_manage_media());
drop policy if exists "Media storage update owner" on storage.objects;
create policy "Media storage update owner" on storage.objects as restrictive for update to authenticated
using (bucket_id <> 'product-images' or public.can_manage_media()) with check (bucket_id <> 'product-images' or public.can_manage_media());
drop policy if exists "Media storage delete owner" on storage.objects;
create policy "Media storage delete owner" on storage.objects as restrictive for delete to authenticated
using (bucket_id <> 'product-images' or public.can_manage_media());
update storage.buckets set file_size_limit = greatest(coalesce(file_size_limit, 52428800), 52428800),
  allowed_mime_types = case when allowed_mime_types is null then null else
    array(select distinct unnest(allowed_mime_types || array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])) end
where id = 'product-images';
commit;
