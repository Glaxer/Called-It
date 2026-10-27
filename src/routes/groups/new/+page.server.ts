import { fail, redirect } from "@sveltejs/kit";
import { readGroupForm } from "#lib/server/groups.js";
import { m } from "#lib/paraglide/messages.js";
import type { Actions } from "./$types";

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { values, error } = readGroupForm(await request.formData());
		if (error) return fail(400, { ...values, error });

		const { data, error: insertError } = await locals.supabase
			.from("groups")
			.insert({
				name: values.name,
				description: values.description || null,
				visibility: values.visibility,
				members_can_create_bets: values.membersCanCreateBets
			})
			.select("id")
			.single();

		if (insertError || !data) {
			return fail(500, { ...values, error: m.error_generic() });
		}

		redirect(303, `/groups/${data.id}`);
	}
};
