-- A name per group, e.g. "Jacob" with friends and "Onkel J" with family.
-- Empty means the account's display name is used.

alter table public.group_members
	add column nickname text
		check (nickname is null or char_length(trim(nickname)) between 1 and 40);

-- Set or clear your own nickname in a group. A function rather than an
-- update policy, so members can't touch their role at the same time.
create function public.set_group_nickname(p_group_id uuid, p_nickname text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
	update public.group_members
	set nickname = nullif(trim(p_nickname), '')
	where group_id = p_group_id and user_id = auth.uid();

	if not found then
		raise exception 'You''re not a member of this group';
	end if;
end;
$$;

revoke execute on function public.set_group_nickname(uuid, text)
from public, anon;
grant execute on function public.set_group_nickname(uuid, text)
to authenticated;

-- The name to show for a member in a group
create function public.member_name(p_group_id uuid, p_user_id uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
	select coalesce(m.nickname, p.display_name)
	from public.group_members m
	join public.profiles p on p.id = m.user_id
	where m.group_id = p_group_id and m.user_id = p_user_id;
$$;

-- The leaderboard shows each member's name in that group
create or replace view public.group_leaderboard
with (security_invoker = true)
as
select
	m.group_id,
	m.user_id,
	coalesce(m.nickname, p.display_name) as display_name,
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
