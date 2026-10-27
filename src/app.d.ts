import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "#lib/database.types.js";

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient<Database>;
			/** The signed-in user, verified with the Supabase Auth server (null if not signed in). */
			getVerifiedUser: () => Promise<User | null>;
			user: User | null;
		}
	}
}

export {};
