import { error } from "@sveltejs/kit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "#lib/database.types.js";
import { m } from "#lib/paraglide/messages.js";
import type { GroupRole, GroupVisibility } from "#lib/types.js";

export const MAX_GROUP_NAME_LENGTH = 60;
export const MAX_GROUP_DESCRIPTION_LENGTH = 500;
export const MAX_NICKNAME_LENGTH = 40;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Rejects ids that aren't UUIDs before they reach the database. */
export function assertUuid(id: string) {
	if (!UUID.test(id)) error(404);
}

/**
 * Loads a group and the current user's membership.
 * Private groups the user isn't in come back as a 404 (RLS hides them).
 */
export async function loadGroup(
	supabase: SupabaseClient<Database>,
	groupId: string,
	userId: string
) {
	assertUuid(groupId);

	const [{ data: group }, { data: membership }] = await Promise.all([
		supabase
			.from("groups")
			.select(
				"id, name, description, visibility, members_can_create_bets, owner_id"
			)
			.eq("id", groupId)
			.maybeSingle(),
		supabase
			.from("group_members")
			.select("role, nickname")
			.eq("group_id", groupId)
			.eq("user_id", userId)
			.maybeSingle()
	]);

	if (!group) error(404);

	return {
		group: { ...group, visibility: group.visibility as GroupVisibility },
		membership: membership
			? { ...membership, role: membership.role as GroupRole }
			: null
	};
}

/** Reads and validates the shared group fields from a form. */
export function readGroupForm(form: FormData) {
	const name = String(form.get("name") ?? "").trim();
	const description = String(form.get("description") ?? "").trim();
	const visibility: GroupVisibility =
		form.get("visibility") === "public" ? "public" : "private";
	const membersCanCreateBets = form.get("members_can_create_bets") === "on";

	let problem: "name_missing" | "name_long" | "description_long" | null = null;
	if (!name) problem = "name_missing";
	else if (name.length > MAX_GROUP_NAME_LENGTH) problem = "name_long";
	else if (description.length > MAX_GROUP_DESCRIPTION_LENGTH)
		problem = "description_long";

	return {
		values: { name, description, visibility, membersCanCreateBets },
		error: problem ? groupFormErrors[problem]() : null
	};
}

const groupFormErrors = {
	name_missing: () => m.group_error_name_missing(),
	name_long: () => m.group_error_name_long({ max: MAX_GROUP_NAME_LENGTH }),
	description_long: () =>
		m.group_error_description_long({ max: MAX_GROUP_DESCRIPTION_LENGTH })
};
