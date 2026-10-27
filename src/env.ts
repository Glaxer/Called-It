import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
	PUBLIC_SUPABASE_URL: {
		public: true,
		static: true,
		description: "The Supabase project's API URL"
	},
	PUBLIC_SUPABASE_PUBLISHABLE_KEY: {
		public: true,
		static: true,
		description:
			"Supabase publishable key (sb_publishable_…). Safe to expose; RLS decides what it can do."
	}
});
