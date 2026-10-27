import { fail, redirect } from "@sveltejs/kit";
import { safeRedirect } from "#lib/server/auth.js";
import { m } from "#lib/paraglide/messages.js";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user)
		redirect(303, safeRedirect(url.searchParams.get("redirectTo")));

	return { confirmError: url.searchParams.has("confirmError") };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		const form = await request.formData();
		const email = String(form.get("email") ?? "").trim();
		const password = String(form.get("password") ?? "");

		if (!email || !password) {
			return fail(400, { email, error: m.error_fill_all() });
		}

		const { error } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			return fail(400, {
				email,
				error:
					error.code === "email_not_confirmed"
						? m.error_email_not_confirmed()
						: error.code === "invalid_credentials"
							? m.error_wrong_login()
							: m.error_generic()
			});
		}

		redirect(303, safeRedirect(url.searchParams.get("redirectTo")));
	}
};
