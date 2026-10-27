import { fail, redirect } from "@sveltejs/kit";
import {
	betErrorMessage,
	loadBet,
	parseLocalDateTime
} from "#lib/server/bets.js";
import { loadGroup } from "#lib/server/groups.js";
import { m } from "#lib/paraglide/messages.js";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = locals.user!;
	const { group, membership } = await loadGroup(
		locals.supabase,
		params.id,
		user.id
	);
	// Non-members of a public group join on the group page first
	if (!membership) redirect(303, `/groups/${group.id}`);

	const { bet, wagers } = await loadBet(
		locals.supabase,
		group.id,
		params.betId
	);

	return {
		group,
		membership,
		bet,
		wagers,
		canManage:
			bet.created_by === user.id ||
			membership.role === "owner" ||
			membership.role === "admin"
	};
};

export const actions: Actions = {
	place: async ({ request, locals, params }) => {
		const slot = String((await request.formData()).get("slot") ?? "");
		if (Number.isNaN(Date.parse(slot))) {
			return fail(400, { wagerError: m.slot_invalid() });
		}

		const { error } = await locals.supabase.rpc("place_wager", {
			p_bet_id: params.betId,
			p_slot_start: slot
		});
		if (error) return fail(400, { wagerError: betErrorMessage(error.message) });

		return { placed: slot };
	},

	withdraw: async ({ locals, params }) => {
		const { error } = await locals.supabase.rpc("withdraw_wager", {
			p_bet_id: params.betId
		});
		if (error) return fail(400, { wagerError: betErrorMessage(error.message) });
	},

	resolve: async ({ request, locals, params }) => {
		const form = await request.formData();
		const outcome = String(form.get("outcome") ?? "");
		const timeZone = String(form.get("time_zone") ?? "");
		const outcomeAt = parseLocalDateTime(outcome, timeZone);
		if (!outcomeAt) {
			return fail(400, { manageError: m.bet_error_outcome_missing() });
		}

		const { error } = await locals.supabase.rpc("resolve_bet", {
			p_bet_id: params.betId,
			p_outcome_at: outcomeAt.toISOString()
		});
		if (error) {
			return fail(400, { manageError: betErrorMessage(error.message) });
		}
	},

	cancel: async ({ locals, params }) => {
		const { error } = await locals.supabase.rpc("cancel_bet", {
			p_bet_id: params.betId
		});
		if (error) {
			return fail(400, { manageError: betErrorMessage(error.message) });
		}
	}
};
