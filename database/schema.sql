-- Diploma Project Developers production schema. Run once in Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.admin_users (email text primary key check (email = lower(email)), created_at timestamptz not null default now());
create table if not exists public.project_requests (
 id uuid primary key default gen_random_uuid(), name text not null, email text not null, phone text not null,
 category text not null, title text not null, description text not null, budget_inr integer not null check (budget_inr between 500 and 10000000),
 quoted_amount_inr integer check (quoted_amount_inr is null or quoted_amount_inr between 500 and 10000000),
 payment_preference text not null check(payment_preference in ('online','later')),
 status text not null default 'pending' check(status in ('pending','accepted','rejected','in_progress','completed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists project_requests_created_idx on public.project_requests(created_at desc);
create table if not exists public.announcements (
 id uuid primary key default gen_random_uuid(), title text not null, content text not null, category text not null,
 image_url text, published boolean not null default true, author_email text, created_at timestamptz not null default now()
);
create table if not exists public.ideas (
 id uuid primary key default gen_random_uuid(), name text not null, category text not null, content text not null,
 vote_count integer not null default 0 check(vote_count >= 0), status text not null default 'published' check(status in ('published','hidden')),
 created_at timestamptz not null default now()
);
create table if not exists public.idea_votes (
 id uuid primary key default gen_random_uuid(), idea_id uuid not null references public.ideas(id) on delete cascade,
 voter_key text not null, created_at timestamptz not null default now(), unique(idea_id,voter_key)
);
create table if not exists public.payment_orders (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.project_requests(id) on delete restrict,
 razorpay_order_id text not null unique, razorpay_payment_id text unique, amount_paise integer not null,
 status text not null default 'created' check(status in ('created','paid','failed')), verified_at timestamptz,
 created_at timestamptz not null default now()
);
-- All access is mediated by server routes using the service role after validation/authorization.
alter table public.admin_users enable row level security;
alter table public.project_requests enable row level security;
alter table public.announcements enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_votes enable row level security;
alter table public.payment_orders enable row level security;
revoke all on public.admin_users,public.project_requests,public.announcements,public.ideas,public.idea_votes,public.payment_orders from anon,authenticated;
-- Public portal content is readable, but writes remain server-only via service role.
grant select on public.announcements,public.ideas to anon,authenticated;
drop policy if exists announcements_public_read on public.announcements;
create policy announcements_public_read on public.announcements for select to anon,authenticated using (published = true);
drop policy if exists ideas_public_read on public.ideas;
create policy ideas_public_read on public.ideas for select to anon,authenticated using (status = 'published');
-- Admin-only read policy allows authenticated admins to receive request change events.
create or replace function public.is_admin_user() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.admin_users where email=lower(coalesce(auth.jwt()->>'email','')));
$$;
revoke all on function public.is_admin_user() from public,anon;
grant execute on function public.is_admin_user() to authenticated;
grant select on public.project_requests to authenticated;
drop policy if exists project_requests_admin_read on public.project_requests;
create policy project_requests_admin_read on public.project_requests for select to authenticated using (public.is_admin_user());
-- Enable Postgres change events for live feed refreshes.
do $$ begin
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='announcements') then alter publication supabase_realtime add table public.announcements; end if;
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ideas') then alter publication supabase_realtime add table public.ideas; end if;
 if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='project_requests') then alter publication supabase_realtime add table public.project_requests; end if;
end $$;
-- Prevent duplicate votes and increment atomically. The voter key is a browser-generated pseudonymous id;
-- for stronger anti-abuse protection, add CAPTCHA/rate-limiting or require authenticated community accounts.
create or replace function public.cast_idea_vote(p_idea_id uuid,p_voter_key text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if length(p_voter_key)<10 or length(p_voter_key)>100 then raise exception 'Invalid voter key'; end if;
 insert into public.idea_votes(idea_id,voter_key) values(p_idea_id,p_voter_key);
 update public.ideas set vote_count=vote_count+1 where id=p_idea_id and status='published';
 if not found then raise exception 'Idea not found'; end if;
exception when unique_violation then raise exception 'Already voted';
end; $$;
revoke all on function public.cast_idea_vote(uuid,text) from public,anon,authenticated;
grant execute on function public.cast_idea_vote(uuid,text) to service_role;
-- Add your actual administrator address after confirming access to it:
-- insert into public.admin_users(email) values ('your-admin-email@example.com') on conflict do nothing;
