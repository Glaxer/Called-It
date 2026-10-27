import { error, fail, redirect } from "@sveltejs/kit";
import { assertUuid, loadGroup, readGroupForm } from "#lib/server/groups.js";
import { m } from "#lib/paraglide/messages.js";
import type { GroupRole } from "#lib/types.js";
import type { Actions, PageServerLoad } from "./$types";

/** Settings are for the owner and admins; some actions are owner-only. */
async function requireManager(
	locals: App.Locals,
	groupId: string,
	ownerOnly = false
) {
	const loaded = await loadGroup(locals.supabase, groupId, locals.user!.id);
	const role = loaded.membership?.role;
	if (role !== "owner" && (ownerOnly || role !== "admin")) error(403);
	return loaded;
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const { group, membership } = await requireManager(locals, params.id);

	const { data: members } = await locals.supabase
		.from("group_members")
		.select("user_id, role, nickname, joined_at, profiles(display_name)")
		.eq("group_id", group.id)
		.order("joined_at");

	return {
		group,
		membership: membership!,
		members: (members ?? []).map((member) => ({
			userId: member.user_id,
			role: member.role as GroupRole,
			name: member.nickname ?? member.profiles?.display_name ?? "",
			accountName: member.profiles?.display_name ?? ""
		}))
	};
};

export const actions: Actions = {
	update: async ({ request, locals, params }) => {
		await requireManager(locals, params.id, true);
		const { values, error: formError } = readGroupForm(
			await request.formData()
		);
		if (formError) return fail(400, { ...values, updateError: formError });

		const { error: updateError } = await locals.supabase
			.from("groups")
			.update({
				name: values.name,
				description: values.description || null,
				visibility: values.visibility,
				members_can_create_bets: values.membersCanCreateBets
			})
			.eq("id", params.id);
		if (updateError) {
			return fail(500, { ...values, updateError: m.error_generic() });
		}

		return { updated: true };
	},

	regenerateInvite: async ({ locals, params }) => {
		await requireManager(locals, params.id);
		const { error: rpcError } = await locals.supabase.rpc("regenerate_invite", {
			p_group_id: params.id
		});
		if (rpcError) return fail(500, { inviteError: m.error_generic() });
		return { inviteRegenerated: true };
	},

	setRole: async ({ request, locals, params }) => {
		await requireManager(locals, params.id, true);
		const form = await request.formData();
		const userId = String(form.get("user_id") ?? "");
		const role = form.get("role") === "admin" ? "admin" : "member";
		assertUuid(userId);

		const { error: updateError } = await locals.supabase
			.from("group_members")
			.update({ role })
			.eq("group_id", params.id)
			.eq("user_id", userId)
			.neq("role", "owner");
		if (updateError) return fail(500, { memberError: m.error_generic() });
	},

	removeMember: async ({ request, locals, params }) => {
		await requireManager(locals, params.id);
		const form = await request.formData();
		const userId = String(form.get("user_id") ?? "");
		assertUuid(userId);

		const { error: deleteError } = await locals.supabase
			.from("group_members")
			.delete()
			.eq("group_id", params.id)
			.eq("user_id", userId)
			.neq("role", "owner");
		if (deleteError) return fail(500, { memberError: m.error_generic() });
	},

	delete: async ({ locals, params }) => {
		await requireManager(locals, params.id, true);
		const { error: deleteError } = await locals.supabase
			.from("groups")
			.delete()
			.eq("id", params.id);
		if (deleteError) return fail(500, { deleteError: m.error_generic() });

		redirect(303, "/");
	}
};
