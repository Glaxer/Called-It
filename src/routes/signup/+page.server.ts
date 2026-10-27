import { fail, redirect } from "@sveltejs/kit";
import {
	MAX_DISPLAY_NAME_LENGTH,
	MIN_PASSWORD_LENGTH,
	safeRedirect
} from "#lib/server/auth.js";
import { m } from "#lib/paraglide/messages.js";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user)
		redirect(303, safeRedirect(url.searchParams.get("redirectTo")));
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();
		const displayName = String(form.get("display_name") ?? "").trim();
		const email = String(form.get("email") ?? "").trim();
		const password = String(form.get("password") ?? "");

		const values = { displayName, email };

		if (!displayName || !email || !password) {
			return fail(400, { ...values, error: m.error_fill_all() });
		}
		if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
			return fail(400, {
				...values,
				error: m.error_display_name_length({ max: MAX_DISPLAY_NAME_LENGTH })
			});
		}
		if (password.length < MIN_PASSWORD_LENGTH) {
			return fail(400, {
				...values,
				error: m.error_password_short({ min: MIN_PASSWORD_LENGTH })
			});
		}

		// After confirming their email, people land back where they were headed
		// (e.g. an invite link they opened before having an account)
		// Always has a ?next=, so the email template can append
		// &token_hash=…&type=email to {{ .RedirectTo }}
		const confirmUrl = new URL("/auth/confirm", url.origin);
		const redirectTo = safeRedirect(url.searchParams.get("redirectTo"), "");
		confirmUrl.searchParams.set("next", redirectTo || "/");

		const { data, error } = await locals.supabase.auth.signUp({
			email,
			password,
			options: {
				// Picked up by the database trigger that creates the profile
				data: { display_name: displayName },
				emailRedirectTo: confirmUrl.toString()
			}
		});

		if (error) {
			return fail(400, { ...values, error: error.message });
		}

		// If email confirmation is turned off in Supabase, the user is signed in right away
		if (data.session) redirect(303, redirectTo || "/");

		return { ...values, checkEmail: true };
	}
};
