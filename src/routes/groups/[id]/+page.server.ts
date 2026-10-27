import { error, fail, redirect } from "@sveltejs/kit";
import { loadGroup, MAX_NICKNAME_LENGTH } from "#lib/server/groups.js";
import { m } from "#lib/paraglide/messages.js";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const user = locals.user!;
	const { group, membership } = await loadGroup(
		locals.supabase,
		params.id,
		user.id
	);

	// Non-members only get this far for public groups; they see a join button
	if (!membership) {
		return { group, membership, leaderboard: [], inviteUrl: null };
	}

	const [{ data: leaderboard }, { data: invite }] = await Promise.all([
		locals.supabase
			.from("group_leaderboard")
			.select("user_id, display_name, points, bets_played, bets_won")
			.eq("group_id", group.id)
			.order("points", { ascending: false })
			.order("display_name"),
		locals.supabase
			.from("group_invites")
			.select("token")
			.eq("group_id", group.id)
			.maybeSingle()
	]);

	return {
		group,
		membership,
		leaderboard: leaderboard ?? [],
		inviteUrl: invite ? `${url.origin}/join/${invite.token}` : null
	};
};

export const actions: Actions = {
	nickname: async ({ request, locals, params }) => {
		const form = await request.formData();
		const nickname = String(form.get("nickname") ?? "").trim();

		if (nickname.length > MAX_NICKNAME_LENGTH) {
			return fail(400, {
				nickname,
				nicknameError: m.error_display_name_length({
					max: MAX_NICKNAME_LENGTH
				})
			});
		}

		const { error: rpcError } = await locals.supabase.rpc(
			"set_group_nickname",
			{ p_group_id: params.id, p_nickname: nickname }
		);
		if (rpcError) {
			return fail(400, { nickname, nicknameError: m.error_generic() });
		}

		return { nicknameSaved: true };
	},

	join: async ({ locals, params }) => {
		const { error: rpcError } = await locals.supabase.rpc("join_group", {
			p_group_id: params.id
		});
		if (rpcError) error(403, m.join_not_allowed());
	},

	leave: async ({ locals, params }) => {
		const { error: deleteError } = await locals.supabase
			.from("group_members")
			.delete()
			.eq("group_id", params.id)
			.eq("user_id", locals.user!.id);
		if (deleteError) return fail(400, { leaveError: m.error_generic() });

		redirect(303, "/");
	}
};
