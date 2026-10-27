import { redirect, type RequestHandler } from "@sveltejs/kit";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeRedirect } from "#lib/server/auth.js";

/**
 * Where the link in the confirmation email lands. Two formats:
 *
 * - token_hash (if the Supabase email template links here directly): works on any device.
 * - code (Supabase's default link): only logs in when opened in the same browser that signed up.
 *   On another device the email is still confirmed, so they're sent to log in.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const code = url.searchParams.get("code");
	const tokenHash = url.searchParams.get("token_hash");
	const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;
	const next = safeRedirect(url.searchParams.get("next"));

	// A password reset link that failed (expired, or opened in another browser)
	// can't fall back to logging in, since they don't know their password
	const isReset = type === "recovery" || next === "/reset-password";
	const failed = isReset
		? "/forgot-password?expired=1"
		: "/login?confirmError=1";

	if (tokenHash) {
		const { error } = await locals.supabase.auth.verifyOtp({
			token_hash: tokenHash,
			type
		});
		redirect(303, error ? failed : next);
	}

	if (code) {
		const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
		if (!error) redirect(303, next);
		redirect(
			303,
			isReset ? failed : `/login?redirectTo=${encodeURIComponent(next)}`
		);
	}

	redirect(303, failed);
};
