import { error, redirect } from "@sveltejs/kit";
import { m } from "#lib/paraglide/messages.js";
import type { Actions, PageServerLoad } from "./$types";

/** Looks up the group behind an invite link. Logged-out visitors are sent to log in first. */
async function findInvite(locals: App.Locals, token: string) {
	if (!/^[0-9a-f]{32}$/.test(token)) return null;
	const { data } = await locals.supabase.rpc("get_invite", {
		p_token: token
	});
	return data?.[0] ?? null;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const invite = await findInvite(locals, params.token);
	if (!invite) return { invite: null };

	// Already a member: go straight to the group
	const { data: membership } = await locals.supabase
		.from("group_members")
		.select("role")
		.eq("group_id", invite.group_id)
		.eq("user_id", locals.user!.id)
		.maybeSingle();
	if (membership) redirect(303, `/groups/${invite.group_id}`);

	return { invite };
};

export const actions: Actions = {
	default: async ({ locals, params }) => {
		const invite = await findInvite(locals, params.token);
		if (!invite) error(404, m.join_invalid());

		const { error: rpcError } = await locals.supabase.rpc("join_group", {
			p_group_id: invite.group_id,
			p_token: params.token
		});
		if (rpcError) error(403, m.join_invalid());

		redirect(303, `/groups/${invite.group_id}`);
	}
};
