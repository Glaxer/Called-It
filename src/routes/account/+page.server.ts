import { fail, redirect } from "@sveltejs/kit";
import {
	MAX_DISPLAY_NAME_LENGTH,
	MIN_PASSWORD_LENGTH
} from "#lib/server/auth.js";
import { m } from "#lib/paraglide/messages.js";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
	return { email: locals.user!.email ?? "" };
};

export const actions: Actions = {
	name: async ({ request, locals }) => {
		const displayName = String(
			(await request.formData()).get("display_name") ?? ""
		).trim();

		if (!displayName) {
			return fail(400, { displayName, nameError: m.error_fill_all() });
		}
		if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
			return fail(400, {
				displayName,
				nameError: m.error_display_name_length({
					max: MAX_DISPLAY_NAME_LENGTH
				})
			});
		}

		const { error } = await locals.supabase
			.from("profiles")
			.update({ display_name: displayName })
			.eq("id", locals.user!.id);
		if (error) return fail(500, { displayName, nameError: m.error_generic() });

		return { nameSaved: true };
	},

	password: async ({ request, locals }) => {
		const form = await request.formData();
		const password = String(form.get("password") ?? "");
		const confirm = String(form.get("confirm") ?? "");

		if (password.length < MIN_PASSWORD_LENGTH) {
			return fail(400, {
				passwordError: m.error_password_short({ min: MIN_PASSWORD_LENGTH })
			});
		}
		if (password !== confirm) {
			return fail(400, { passwordError: m.error_passwords_differ() });
		}

		const { error } = await locals.supabase.auth.updateUser({ password });
		if (error) {
			return fail(400, {
				passwordError:
					error.code === "same_password"
						? m.error_same_password()
						: error.code === "reauthentication_needed"
							? m.error_reauthentication_needed()
							: m.error_generic()
			});
		}

		return { passwordSaved: true };
	},

	delete: async ({ request, locals }) => {
		// Typing the email back makes sure nobody deletes their account by accident
		const typed = String((await request.formData()).get("confirm_email") ?? "")
			.trim()
			.toLowerCase();
		if (typed !== (locals.user!.email ?? "").toLowerCase()) {
			return fail(400, { deleteError: m.account_delete_mismatch() });
		}

		const { error } = await locals.supabase.rpc("delete_my_account");
		if (error) return fail(500, { deleteError: m.error_generic() });

		// The account is gone; clear the now-useless session cookies
		await locals.supabase.auth.signOut();
		redirect(303, "/?accountDeleted=1");
	}
};
