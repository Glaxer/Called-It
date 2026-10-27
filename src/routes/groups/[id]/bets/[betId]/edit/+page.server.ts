import { error, fail, redirect } from "@sveltejs/kit";
import { loadBet, readBetForm } from "#lib/server/bets.js";
import { loadGroup } from "#lib/server/groups.js";
import { m } from "#lib/paraglide/messages.js";
import { clockMinutes, wallClock } from "#lib/slots.js";
import type { Actions, PageServerLoad } from "./$types";

/** Loads the bet and checks that the user may edit it (creator, owner or admin; still open) */
async function loadEditable(
	locals: App.Locals,
	params: { id: string; betId: string }
) {
	const user = locals.user!;
	const { group, membership } = await loadGroup(
		locals.supabase,
		params.id,
		user.id
	);
	const { bet, wagers } = await loadBet(
		locals.supabase,
		group.id,
		params.betId
	);

	const canEdit =
		bet.created_by === user.id ||
		membership?.role === "owner" ||
		membership?.role === "admin";
	if (!canEdit) error(403);
	if (bet.status !== "open") {
		redirect(303, `/groups/${group.id}/bets/${bet.id}`);
	}

	return { group, bet, locked: wagers.length > 0 };
}

export const load: PageServerLoad = async ({ locals, params }) => {
	const { group, bet, locked } = await loadEditable(locals, params);
	const { config } = bet;
	const closes = wallClock(new Date(bet.closes_at), config.timeZone);

	return {
		group,
		betId: bet.id,
		betTitle: bet.title,
		locked,
		values: {
			title: bet.title,
			description: bet.description ?? "",
			rangeStart: config.rangeStart,
			rangeEnd: config.rangeEnd,
			slotMinutes: config.slotMinutes,
			dayStartHour: clockMinutes(config.dayStart ?? "00:00") / 60,
			dayEndHour: clockMinutes(config.dayEnd ?? "24:00") / 60,
			prize: bet.prize,
			closesAt: `${closes.day}T${String(Math.floor(closes.minutes / 60)).padStart(2, "0")}:${String(closes.minutes % 60).padStart(2, "0")}`,
			timeZone: config.timeZone
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		const { group, bet } = await loadEditable(locals, params);

		// An existing bet keeps its time zone, whatever the editor's browser says
		const form = await request.formData();
		form.set("time_zone", bet.config.timeZone);

		const { values, error: formError, bet: changes } = readBetForm(form);
		if (formError || !changes) {
			return fail(400, { ...values, error: formError });
		}

		const { error: updateError } = await locals.supabase
			.from("bets")
			.update(changes)
			.eq("id", bet.id);

		if (updateError) {
			const message = updateError.message.includes("prize is locked")
				? m.bet_edit_prize_locked()
				: updateError.message.includes("slots are locked")
					? m.bet_edit_slots_locked()
					: m.error_generic();
			return fail(400, { ...values, error: message });
		}

		redirect(303, `/groups/${group.id}/bets/${bet.id}`);
	}
};
