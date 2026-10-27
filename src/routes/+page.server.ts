import type { GroupRole, GroupVisibility } from "#lib/types.js";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) return { groups: [] };

	const { data } = await locals.supabase
		.from("group_members")
		.select("role, joined_at, groups(id, name, description, visibility)")
		.eq("user_id", locals.user.id)
		.order("joined_at", { ascending: false });

	const groups = (data ?? []).flatMap(({ role, groups: group }) =>
		group
			? [
					{
						...group,
						visibility: group.visibility as GroupVisibility,
						role: role as GroupRole
					}
				]
			: []
	);

	return { groups };
};
