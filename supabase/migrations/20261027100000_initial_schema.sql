-- Called It: initial schema
--
-- groups ─┬─ group_members (who's in, and their role)
--         ├─ group_invites (the private invite link token)
--         └─ bets ── wagers (one claimed timeslot per person per bet)
--
-- Points are never stored. Every wager costs the bet's buy-in, and the winner
-- of a resolved bet gets the pot (buy-in × number of wagers). The leaderboard
-- view adds that up per group. Cancelled bets count as refunded.
--
-- Writes that need rules RLS (row-level security) can't express on its own
-- (joining with a token, validating a slot, picking the winner) go through
-- security definer functions. Tables only allow the simple writes directly.

create schema if not exists private;

-- ───────────────────────────── Profiles ─────────────────────────────

create table public.profiles (
	id uuid primary key references auth.users (id) on delete cascade,
	display_name text not null
		check (char_length(trim(display_name)) between 1 and 40),
	created_at timestamptz not null default now()
);

-- A profile is created from the display name given at sign-up
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	insert into public.profiles (id, display_name)
	values (
		new.id,
		coalesce(
			nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
			split_part(new.email, '@', 1)
		)
	);
	return new;
end;
$$;

create trigger on_auth_user_created
	after insert on auth.users
	for each row execute function private.handle_new_user();

-- ───────────────────────────── Groups ─────────────────────────────

create table public.groups (
	id uuid primary key default gen_random_uuid(),
	name text not null check (char_length(trim(name)) between 1 and 60),
	description text check (char_length(description) <= 500),
	visibility text not null default 'private'
		check (visibility in ('private', 'public')),
	-- When false, only the owner and admins can create bets
	members_can_create_bets boolean not null default true,
	owner_id uuid not null default auth.uid()
		references public.profiles (id) on delete cascade,
	created_at timestamptz not null default now()
);

create table public.group_members (
	group_id uuid not null references public.groups (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	role text not null default 'member'
		check (role in ('owner', 'admin', 'member')),
	joined_at timestamptz not null default now(),
	primary key (group_id, user_id)
);

create index group_members_user_id_idx on public.group_members (user_id);

-- Kept apart from groups so people who can see a public group can't read
-- its token (which matters if the group is later made private)
create table public.group_invites (
	group_id uuid primary key references public.groups (id) on delete cascade,
	token text not null unique
		default replace(gen_random_uuid()::text, '-', '')
);

-- ───────────────────────────── Bets ─────────────────────────────

create table public.bets (
	id uuid primary key default gen_random_uuid(),
	group_id uuid not null references public.groups (id) on delete cascade,
	created_by uuid not null default auth.uid()
		references public.profiles (id) on delete cascade,
	title text not null check (char_length(trim(title)) between 1 and 120),
	description text check (char_length(description) <= 1000),
	-- Only timeslots for now; number buckets etc. can be added later
	answer_type text not null default 'timeslot'
		check (answer_type in ('timeslot')),
	-- timeslot: { rangeStart: "2027-01-25", rangeEnd: "2027-02-22",
	--   slotMinutes: 30, dayStart: "00:00", dayEnd: "24:00",
	--   timeZone: "Europe/Copenhagen" }
	answer_config jsonb not null,
	buy_in integer not null check (buy_in between 1 and 1000000),
	closes_at timestamptz not null,
	status text not null default 'open'
		check (status in ('open', 'resolved', 'cancelled')),
	outcome_at timestamptz,
	winner_id uuid references public.profiles (id) on delete set null,
	resolved_at timestamptz,
	created_at timestamptz not null default now(),
	check (status <> 'resolved' or outcome_at is not null)
);

create index bets_group_id_idx on public.bets (group_id);
create index bets_created_by_idx on public.bets (created_by);
create index bets_winner_id_idx on public.bets (winner_id);

create table public.wagers (
	id uuid primary key default gen_random_uuid(),
	bet_id uuid not null references public.bets (id) on delete cascade,
	user_id uuid not null references public.profiles (id) on delete cascade,
	slot_start timestamptz not null,
	-- Set when the wager is placed and kept when the slot is moved, so the
	-- tiebreak ("earliest wager wins") can't be gamed by moving late
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	-- One wager per person per bet, and each slot can only be claimed once
	unique (bet_id, user_id),
	unique (bet_id, slot_start)
);

create index wagers_user_id_idx on public.wagers (user_id);

-- ───────────────────────────── Helpers ─────────────────────────────
-- Security definer so policies can call them without recursing into the
-- group_members policies. They live in the private schema, which the API
-- doesn't expose.

create function private.is_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1 from public.group_members
		where group_id = p_group_id and user_id = (select auth.uid())
	);
$$;

create function private.has_role(p_group_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1 from public.group_members
		where group_id = p_group_id
			and user_id = (select auth.uid())
			and role = any (p_roles)
	);
$$;

create function private.shares_group(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1
		from public.group_members mine
		join public.group_members theirs using (group_id)
		where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
	);
$$;

create function private.can_create_bet(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1
		from public.group_members m
		join public.groups g on g.id = m.group_id
		where m.group_id = p_group_id
			and m.user_id = (select auth.uid())
			and (g.members_can_create_bets or m.role in ('owner', 'admin'))
	);
$$;

-- "HH:MM" to minutes after midnight ("24:00" → 1440)
create function private.clock_minutes(p_clock text)
returns integer
language sql
immutable
set search_path = ''
as $$
	select split_part(p_clock, ':', 1)::integer * 60
		+ split_part(p_clock, ':', 2)::integer;
$$;

-- Checks a timeslot config: valid dates, slot length, hours and time zone
create function private.valid_timeslot_config(p_config jsonb)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
	v_start date;
	v_end date;
	v_minutes integer;
	v_day_start integer;
	v_day_end integer;
begin
	v_start := (p_config ->> 'rangeStart')::date;
	v_end := (p_config ->> 'rangeEnd')::date;
	v_minutes := (p_config ->> 'slotMinutes')::integer;
	v_day_start := private.clock_minutes(coalesce(p_config ->> 'dayStart', '00:00'));
	v_day_end := private.clock_minutes(coalesce(p_config ->> 'dayEnd', '24:00'));

	-- Throws for an unknown time zone, which counts as invalid below
	perform now() at time zone (p_config ->> 'timeZone');

	return v_start is not null
		and v_end is not null
		and v_start <= v_end
		and v_end - v_start <= 366
		and v_minutes in (15, 30, 60, 120, 1440)
		and v_day_start >= 0
		and v_day_end <= 1440
		and v_day_end - v_day_start >= v_minutes
		and (v_day_end - v_day_start) % v_minutes = 0;
exception
	when others then
		return false;
end;
$$;

alter table public.bets
	add constraint bets_answer_config_valid
	check (answer_type <> 'timeslot' or private.valid_timeslot_config(answer_config));

-- Is this an actual slot in the bet's grid (right day, hours and step)?
create function private.is_valid_slot(p_config jsonb, p_slot timestamptz)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
	v_local timestamp := p_slot at time zone (p_config ->> 'timeZone');
	v_minute_of_day integer :=
		extract(hour from v_local)::integer * 60
		+ extract(minute from v_local)::integer;
	v_day_start integer :=
		private.clock_minutes(coalesce(p_config ->> 'dayStart', '00:00'));
	v_day_end integer :=
		private.clock_minutes(coalesce(p_config ->> 'dayEnd', '24:00'));
	v_minutes integer := (p_config ->> 'slotMinutes')::integer;
begin
	return extract(second from v_local) = 0
		and v_local::date between (p_config ->> 'rangeStart')::date
			and (p_config ->> 'rangeEnd')::date
		and v_minute_of_day >= v_day_start
		and v_minute_of_day + v_minutes <= v_day_end
		and (v_minute_of_day - v_day_start) % v_minutes = 0;
end;
$$;

-- ───────────────────────────── Triggers ─────────────────────────────

-- The creator of a group becomes its owner and gets an invite link
create function private.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
	insert into public.group_members (group_id, user_id, role)
	values (new.id, new.owner_id, 'owner');
	insert into public.group_invites (group_id) values (new.id);
	return new;
end;
$$;

create trigger on_group_created
	after insert on public.groups
	for each row execute function private.handle_new_group();

-- Once someone has placed a wager, the buy-in and the slot grid are locked,
-- except that the date range may be extended. Resolution fields can only be
-- set through resolve_bet / cancel_bet.
create function private.guard_bet_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
	if current_setting('called_it.resolving', true) = 'on' then
		return new;
	end if;

	if new.group_id <> old.group_id
		or new.created_by <> old.created_by
		or new.answer_type <> old.answer_type
		or new.status is distinct from old.status
		or new.outcome_at is distinct from old.outcome_at
		or new.winner_id is distinct from old.winner_id
		or new.resolved_at is distinct from old.resolved_at then
		raise exception 'This can''t be changed directly';
	end if;

	if old.status <> 'open' then
		raise exception 'This bet is already finished';
	end if;

	if exists (select 1 from public.wagers where bet_id = old.id) then
		if new.buy_in <> old.buy_in then
			raise exception 'The buy-in is locked once someone has placed a wager';
		end if;
		if new.answer_config - 'rangeStart' - 'rangeEnd'
				<> old.answer_config - 'rangeStart' - 'rangeEnd'
			or (new.answer_config ->> 'rangeStart')::date
				> (old.answer_config ->> 'rangeStart')::date
			or (new.answer_config ->> 'rangeEnd')::date
				< (old.answer_config ->> 'rangeEnd')::date then
			raise exception 'The slots are locked once someone has placed a wager; the range can only be extended';
		end if;
	end if;

	return new;
end;
$$;

create trigger guard_bet_update
	before update on public.bets
	for each row execute function private.guard_bet_update();

-- ───────────────────────────── RPC functions ─────────────────────────────

-- Join a group: public groups by id, private groups with the invite token
create function public.join_group(p_group_id uuid, p_token text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_group_id uuid;
begin
	if auth.uid() is null then
		raise exception 'You need to be logged in';
	end if;

	select g.id into v_group_id
	from public.groups g
	left join public.group_invites i on i.group_id = g.id
	where g.id = p_group_id
		and (g.visibility = 'public' or i.token = p_token);

	if v_group_id is null then
		raise exception 'This invite link isn''t valid';
	end if;

	insert into public.group_members (group_id, user_id)
	values (v_group_id, auth.uid())
	on conflict do nothing;

	return v_group_id;
end;
$$;

-- Look up a private group from its invite token, to show "Join X?" before joining
create function public.get_invite(p_token text)
returns table (group_id uuid, name text, member_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
	select g.id, g.name,
		(select count(*) from public.group_members m where m.group_id = g.id)
	from public.group_invites i
	join public.groups g on g.id = i.group_id
	where i.token = p_token and auth.uid() is not null;
$$;

-- Make a new invite link, so the old one stops working
create function public.regenerate_invite(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_token text := replace(gen_random_uuid()::text, '-', '');
begin
	if not private.has_role(p_group_id, array['owner', 'admin']) then
		raise exception 'Only the owner or an admin can do this';
	end if;
	update public.group_invites set token = v_token where group_id = p_group_id;
	return v_token;
end;
$$;

-- Claim a slot, or move your existing wager to another free slot
create function public.place_wager(p_bet_id uuid, p_slot_start timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_bet public.bets;
	v_wager_id uuid;
begin
	select * into v_bet from public.bets where id = p_bet_id;

	if v_bet.id is null or not private.is_member(v_bet.group_id) then
		raise exception 'Bet not found';
	end if;
	if v_bet.status <> 'open' or v_bet.closes_at <= now() then
		raise exception 'Betting has closed';
	end if;
	if not private.is_valid_slot(v_bet.answer_config, p_slot_start) then
		raise exception 'That isn''t one of the slots in this bet';
	end if;

	insert into public.wagers (bet_id, user_id, slot_start)
	values (p_bet_id, auth.uid(), p_slot_start)
	on conflict (bet_id, user_id) do update
		set slot_start = excluded.slot_start, updated_at = now()
	returning id into v_wager_id;

	return v_wager_id;
exception
	when unique_violation then
		raise exception 'Someone already claimed that slot';
end;
$$;

-- Withdraw your wager while betting is still open
create function public.withdraw_wager(p_bet_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_bet public.bets;
begin
	select * into v_bet from public.bets where id = p_bet_id;

	if v_bet.id is null or not private.is_member(v_bet.group_id) then
		raise exception 'Bet not found';
	end if;
	if v_bet.status <> 'open' or v_bet.closes_at <= now() then
		raise exception 'Betting has closed';
	end if;

	delete from public.wagers where bet_id = p_bet_id and user_id = auth.uid();
end;
$$;

-- Enter the real outcome and pick the winner:
-- 1. whoever holds the slot the outcome falls in
-- 2. otherwise the closest claimed slot (outcomes outside the range count too)
-- 3. on equal distance, the earliest wager
create function public.resolve_bet(p_bet_id uuid, p_outcome_at timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_bet public.bets;
	v_slot interval;
	v_winner uuid;
begin
	select * into v_bet from public.bets where id = p_bet_id for update;

	if v_bet.id is null or not private.is_member(v_bet.group_id) then
		raise exception 'Bet not found';
	end if;
	if v_bet.created_by <> auth.uid()
		and not private.has_role(v_bet.group_id, array['owner', 'admin']) then
		raise exception 'Only the creator of the bet or a group admin can resolve it';
	end if;
	if v_bet.status <> 'open' then
		raise exception 'This bet is already finished';
	end if;

	v_slot := make_interval(mins => (v_bet.answer_config ->> 'slotMinutes')::integer);

	select w.user_id into v_winner
	from public.wagers w
	where w.bet_id = p_bet_id
	order by
		case
			when p_outcome_at >= w.slot_start
				and p_outcome_at < w.slot_start + v_slot then interval '0'
			when p_outcome_at < w.slot_start then w.slot_start - p_outcome_at
			else p_outcome_at - (w.slot_start + v_slot)
		end,
		w.created_at
	limit 1;

	perform set_config('called_it.resolving', 'on', true);
	update public.bets
	set status = 'resolved',
		outcome_at = p_outcome_at,
		winner_id = v_winner,
		resolved_at = now()
	where id = p_bet_id;
	perform set_config('called_it.resolving', 'off', true);

	return v_winner;
end;
$$;

-- Cancel an unresolved bet; everyone gets their buy-in back
create function public.cancel_bet(p_bet_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_bet public.bets;
begin
	select * into v_bet from public.bets where id = p_bet_id for update;

	if v_bet.id is null or not private.is_member(v_bet.group_id) then
		raise exception 'Bet not found';
	end if;
	if v_bet.created_by <> auth.uid()
		and not private.has_role(v_bet.group_id, array['owner', 'admin']) then
		raise exception 'Only the creator of the bet or a group admin can cancel it';
	end if;
	if v_bet.status <> 'open' then
		raise exception 'This bet is already finished';
	end if;

	perform set_config('called_it.resolving', 'on', true);
	update public.bets
	set status = 'cancelled', resolved_at = now()
	where id = p_bet_id;
	perform set_config('called_it.resolving', 'off', true);
end;
$$;

-- Only logged-in users may call these
revoke execute on function
	public.join_group(uuid, text),
	public.get_invite(text),
	public.regenerate_invite(uuid),
	public.place_wager(uuid, timestamptz),
	public.withdraw_wager(uuid),
	public.resolve_bet(uuid, timestamptz),
	public.cancel_bet(uuid)
from public, anon;

grant execute on function
	public.join_group(uuid, text),
	public.get_invite(text),
	public.regenerate_invite(uuid),
	public.place_wager(uuid, timestamptz),
	public.withdraw_wager(uuid),
	public.resolve_bet(uuid, timestamptz),
	public.cancel_bet(uuid)
to authenticated;

grant usage on schema private to authenticated;

-- ───────────────────────────── Leaderboard ─────────────────────────────

-- Net points per member per group, over resolved bets only
create view public.group_leaderboard
with (security_invoker = true)
as
select
	m.group_id,
	m.user_id,
	p.display_name,
	coalesce(stats.points, 0)::bigint as points,
	coalesce(stats.bets_played, 0)::bigint as bets_played,
	coalesce(stats.bets_won, 0)::bigint as bets_won
from public.group_members m
join public.profiles p on p.id = m.user_id
left join lateral (
	select
		sum(
			case when b.winner_id = m.user_id then pot.total else 0 end
			- b.buy_in
		) as points,
		count(*) as bets_played,
		count(*) filter (where b.winner_id = m.user_id) as bets_won
	from public.wagers w
	join public.bets b on b.id = w.bet_id
	cross join lateral (
		select b.buy_in * count(*) as total
		from public.wagers w2
		where w2.bet_id = b.id
	) pot
	where w.user_id = m.user_id
		and b.group_id = m.group_id
		and b.status = 'resolved'
) stats on true;

-- ───────────────────────────── RLS policies ─────────────────────────────

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.bets enable row level security;
alter table public.wagers enable row level security;

-- Profiles: you see yourself and people you share a group with
create policy "Read own and fellow members' profiles"
	on public.profiles for select to authenticated
	using (id = (select auth.uid()) or private.shares_group(id));

create policy "Update own profile"
	on public.profiles for update to authenticated
	using (id = (select auth.uid()))
	with check (id = (select auth.uid()));

-- Groups: public groups are visible to anyone logged in, private ones to members
create policy "Read public groups and own groups"
	on public.groups for select to authenticated
	using (visibility = 'public' or private.is_member(id));

create policy "Create groups as yourself"
	on public.groups for insert to authenticated
	with check (owner_id = (select auth.uid()));

create policy "Owner updates the group"
	on public.groups for update to authenticated
	using (owner_id = (select auth.uid()))
	with check (owner_id = (select auth.uid()));

create policy "Owner deletes the group"
	on public.groups for delete to authenticated
	using (owner_id = (select auth.uid()));

-- Members: visible to fellow members; joining goes through join_group()
create policy "Read members of own groups"
	on public.group_members for select to authenticated
	using (private.is_member(group_id));

create policy "Leave a group, or remove members as owner/admin"
	on public.group_members for delete to authenticated
	using (
		role <> 'owner'
		and (
			user_id = (select auth.uid())
			or private.has_role(group_id, array['owner', 'admin'])
		)
	);

create policy "Owner changes member roles"
	on public.group_members for update to authenticated
	using (private.has_role(group_id, array['owner']) and role <> 'owner')
	with check (role in ('admin', 'member'));

-- Invite links: any member can see and share it
create policy "Members read the invite link"
	on public.group_invites for select to authenticated
	using (private.is_member(group_id));

-- Bets
create policy "Members read bets"
	on public.bets for select to authenticated
	using (private.is_member(group_id));

create policy "Members create bets"
	on public.bets for insert to authenticated
	with check (
		created_by = (select auth.uid())
		and status = 'open'
		and outcome_at is null
		and winner_id is null
		and private.can_create_bet(group_id)
	);

create policy "Creator or admins edit open bets"
	on public.bets for update to authenticated
	using (
		created_by = (select auth.uid())
		or private.has_role(group_id, array['owner', 'admin'])
	);

-- Wagers: everyone in the group can see who claimed which slot;
-- placing, moving and withdrawing go through the functions above
create policy "Members read wagers"
	on public.wagers for select to authenticated
	using (
		exists (
			select 1 from public.bets b
			where b.id = bet_id and private.is_member(b.group_id)
		)
	);
