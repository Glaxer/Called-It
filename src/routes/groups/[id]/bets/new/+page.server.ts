import { error, fail, redirect } from "@sveltejs/kit";
import { canCreateBets, readBetForm } from "#lib/server/bets.js";
import { loadGroup } from "#lib/server/groups.js";
import { m } from "#lib/paraglide/messages.js";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
	const { group, membership } = await loadGroup(
		locals.supabase,
		params.id,
		locals.user!.id
	);
	if (!canCreateBets(group, membership?.role)) error(403);

	return { group };
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const { group, membership } = await loadGroup(
			locals.supabase,
			params.id,
			locals.user!.id
		);
		if (!canCreateBets(group, membership?.role)) error(403);

		const {
			values,
			error: formError,
			bet
		} = readBetForm(await request.formData());
		if (formError || !bet) return fail(400, { ...values, error: formError });

		const { data, error: insertError } = await locals.supabase
			.from("bets")
			.insert({ ...bet, group_id: group.id })
			.select("id")
			.single();
		if (insertError || !data) {
			return fail(500, { ...values, error: m.error_generic() });
		}

		redirect(303, `/groups/${group.id}/bets/${data.id}`);
	}
};
