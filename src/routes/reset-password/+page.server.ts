import { fail, redirect } from "@sveltejs/kit";
import { MIN_PASSWORD_LENGTH } from "#lib/server/auth.js";
import { m } from "#lib/paraglide/messages.js";
import type { Actions } from "./$types";

// Reached from the reset email, which has already logged the user in
// (the auth guard sends anyone else to the login page)
export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const password = String(form.get("password") ?? "");
		const confirm = String(form.get("confirm") ?? "");

		if (password.length < MIN_PASSWORD_LENGTH) {
			return fail(400, {
				error: m.error_password_short({ min: MIN_PASSWORD_LENGTH })
			});
		}
		if (password !== confirm) {
			return fail(400, { error: m.error_passwords_differ() });
		}

		const { error } = await locals.supabase.auth.updateUser({ password });
		if (error) {
			return fail(400, {
				error:
					error.code === "same_password"
						? m.error_same_password()
						: m.error_generic()
			});
		}

		redirect(303, "/?passwordChanged=1");
	}
};
