import { createServerClient } from "@supabase/ssr";
import { redirect } from "@sveltejs/kit";
import { sequence, type Handle } from "@sveltejs/kit/hooks";
import {
	PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	PUBLIC_SUPABASE_URL
} from "$app/env/public";
import type { Database } from "#lib/database.types.js";
import { getTextDirection } from "#lib/paraglide/runtime.js";
import { paraglideMiddleware } from "#lib/paraglide/server.js";

/** Picks the language (cookie → browser language → English) and sets <html lang>. */
const paraglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) =>
		resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace("%paraglide.lang%", locale)
						.replace("%paraglide.dir%", getTextDirection(locale))
			}
		)
	);

/** Creates a Supabase client per request that reads and writes the auth cookies. */
const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient<Database>(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, { ...options, path: "/" });
					});
				}
			}
		}
	);

	/**
	 * The session from getSession() comes straight from the cookie and isn't verified, so it's only
	 * used to skip the network call for visitors who aren't logged in. The user itself always comes
	 * from getUser(), which checks the token with the Supabase Auth server.
	 */
	event.locals.getVerifiedUser = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return null;

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		return error ? null : user;
	};

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === "content-range" || name === "x-supabase-api-version"
	});
};

/** Pages anyone can open; everything else needs a signed-in user. */
const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth/confirm"];

const authGuard: Handle = async ({ event, resolve }) => {
	const user = await event.locals.getVerifiedUser();
	event.locals.user = user;

	const path = event.url.pathname;
	if (!user && !PUBLIC_PATHS.includes(path)) {
		redirect(
			303,
			`/login?redirectTo=${encodeURIComponent(path + event.url.search)}`
		);
	}

	return resolve(event);
};

export const handle = sequence(paraglide, supabase, authGuard);
