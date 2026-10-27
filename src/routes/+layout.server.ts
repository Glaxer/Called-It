import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user } = locals;
	let displayName: string | null = null;

	if (user) {
		const { data } = await locals.supabase
			.from("profiles")
			.select("display_name")
			.eq("id", user.id)
			.single();
		displayName = data?.display_name ?? null;
	}

	// Only the verified user is sent to the browser (not the raw session from the cookie)
	return { user, displayName };
};
