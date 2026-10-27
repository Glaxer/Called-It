import { fail } from "@sveltejs/kit";
import { m } from "#lib/paraglide/messages.js";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
	return { expired: url.searchParams.has("expired") };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const email = String((await request.formData()).get("email") ?? "").trim();
		if (!email) return fail(400, { email, error: m.error_fill_all() });

		// The link logs them in and sends them on to choose a new password
		const redirectTo = new URL("/auth/confirm", url.origin);
		redirectTo.searchParams.set("next", "/reset-password");

		const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
			redirectTo: redirectTo.toString()
		});

		// Rate limits are worth telling about; anything else gets the same answer
		// whether or not the account exists, so the form can't be used to check emails
		if (error?.status === 429) {
			return fail(429, { email, error: m.forgot_password_rate_limited() });
		}

		return { email, sent: true };
	}
};
