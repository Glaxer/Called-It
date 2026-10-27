-- The owner must see a new group straight away (insert ... returning runs
-- before the trigger that adds them as a member)
drop policy "Read public groups and own groups" on public.groups;

create policy "Read public groups and own groups"
	on public.groups for select to authenticated
	using (
		visibility = 'public'
		or owner_id = (select auth.uid())
		or private.is_member(id)
	);
