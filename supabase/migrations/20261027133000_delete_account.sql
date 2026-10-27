-- Deleting an account shouldn't take other people's data with it.

-- Bets stay when their creator leaves; the page shows "Former member"
alter table public.bets alter column created_by drop not null;
alter table public.bets drop constraint bets_created_by_fkey;
alter table public.bets
	add constraint bets_created_by_fkey
	foreign key (created_by) references public.profiles (id) on delete set null;

-- Deletes the signed-in user's account:
-- - groups they own go to the longest-standing admin, else the longest-standing
--   member; groups with nobody else in them are deleted
-- - their profile, memberships and slots go with the account (cascades)
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_user uuid := auth.uid();
	v_group record;
	v_heir uuid;
begin
	if v_user is null then
		raise exception 'You need to be logged in';
	end if;

	for v_group in
		select id from public.groups where owner_id = v_user
	loop
		select user_id into v_heir
		from public.group_members
		where group_id = v_group.id and user_id <> v_user
		order by (role = 'admin') desc, joined_at
		limit 1;

		if v_heir is null then
			delete from public.groups where id = v_group.id;
		else
			update public.groups set owner_id = v_heir where id = v_group.id;
			update public.group_members set role = 'owner'
			where group_id = v_group.id and user_id = v_heir;
		end if;
	end loop;

	delete from auth.users where id = v_user;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
