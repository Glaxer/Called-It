-- From buy-in to a fixed prize: joining a bet costs nothing, the winner gets
-- the prize the creator set, and the leaderboard counts points won (never
-- negative).

alter table public.bets rename column buy_in to prize;
alter table public.bets rename constraint bets_buy_in_check to bets_prize_check;

-- Same rules as before, with the prize locked once someone has picked a slot
create or replace function private.guard_bet_update()
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
		if new.prize <> old.prize then
			raise exception 'The prize is locked once someone has picked a slot';
		end if;
		if new.answer_config - 'rangeStart' - 'rangeEnd'
				<> old.answer_config - 'rangeStart' - 'rangeEnd'
			or (new.answer_config ->> 'rangeStart')::date
				> (old.answer_config ->> 'rangeStart')::date
			or (new.answer_config ->> 'rangeEnd')::date
				< (old.answer_config ->> 'rangeEnd')::date then
			raise exception 'The slots are locked once someone has picked a slot; the range can only be extended';
		end if;
	end if;

	return new;
end;
$$;

-- Points = prizes won in resolved bets
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
		sum(case when b.winner_id = m.user_id then b.prize else 0 end) as points,
		count(*) as bets_played,
		count(*) filter (where b.winner_id = m.user_id) as bets_won
	from public.wagers w
	join public.bets b on b.id = w.bet_id
	where w.user_id = m.user_id
		and b.group_id = m.group_id
		and b.status = 'resolved'
) stats on true;
