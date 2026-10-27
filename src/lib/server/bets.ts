import { error } from "@sveltejs/kit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "#lib/database.types.js";
import { m } from "#lib/paraglide/messages.js";
import {
	isValidTimeZone,
	MAX_RANGE_DAYS,
	minutesToClock,
	parseDay,
	SLOT_LENGTHS,
	zonedTime
} from "#lib/slots.js";
import type { BetStatus, TimeslotConfig } from "#lib/types.js";
import { assertUuid } from "./groups.js";

export const MAX_BET_TITLE_LENGTH = 120;
export const MAX_BET_DESCRIPTION_LENGTH = 1000;
export const MAX_BUY_IN = 1_000_000;
export const DEFAULT_TIME_ZONE = "Europe/Copenhagen";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_DATETIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/;

/** "2027-02-07T13:40" in a time zone → the instant, or null if invalid */
export function parseLocalDateTime(value: string, timeZone: string) {
	const match = LOCAL_DATETIME.exec(value);
	if (!match) return null;
	const [, day, hours, minutes] = match;
	return zonedTime(day, Number(hours) * 60 + Number(minutes), timeZone);
}

/** Reads and validates the create-bet form */
export function readBetForm(form: FormData) {
	const get = (name: string) => String(form.get(name) ?? "").trim();

	const values = {
		title: get("title"),
		description: get("description"),
		rangeStart: get("range_start"),
		rangeEnd: get("range_end"),
		slotMinutes: Number(get("slot_minutes")),
		dayStartHour: Number(get("day_start_hour") || 0),
		dayEndHour: Number(get("day_end_hour") || 24),
		buyIn: Number(get("buy_in")),
		closesAt: get("closes_at"),
		timeZone: get("time_zone") || DEFAULT_TIME_ZONE
	};

	const fail = (message: string) => ({ values, error: message, bet: null });

	if (!values.title) return fail(m.bet_error_title_missing());
	if (values.title.length > MAX_BET_TITLE_LENGTH)
		return fail(m.bet_error_title_long({ max: MAX_BET_TITLE_LENGTH }));
	if (values.description.length > MAX_BET_DESCRIPTION_LENGTH)
		return fail(
			m.bet_error_description_long({ max: MAX_BET_DESCRIPTION_LENGTH })
		);

	if (!isValidTimeZone(values.timeZone)) values.timeZone = DEFAULT_TIME_ZONE;

	if (!DAY.test(values.rangeStart) || !DAY.test(values.rangeEnd))
		return fail(m.bet_error_range_missing());
	const rangeDays =
		(parseDay(values.rangeEnd).getTime() -
			parseDay(values.rangeStart).getTime()) /
		86_400_000;
	if (rangeDays < 0) return fail(m.bet_error_range_order());
	if (rangeDays > MAX_RANGE_DAYS)
		return fail(m.bet_error_range_long({ max: MAX_RANGE_DAYS }));

	if (!(SLOT_LENGTHS as readonly number[]).includes(values.slotMinutes))
		return fail(m.error_generic());
	const slotMinutes = values.slotMinutes as TimeslotConfig["slotMinutes"];

	// Whole-day slots always cover the whole day
	const dayStart = slotMinutes === 1440 ? 0 : values.dayStartHour * 60;
	const dayEnd = slotMinutes === 1440 ? 1440 : values.dayEndHour * 60;
	if (
		!Number.isInteger(values.dayStartHour) ||
		!Number.isInteger(values.dayEndHour) ||
		dayStart < 0 ||
		dayEnd > 1440 ||
		dayEnd - dayStart < slotMinutes
	)
		return fail(m.bet_error_hours());
	if ((dayEnd - dayStart) % slotMinutes !== 0)
		return fail(m.bet_error_hours_fit());

	if (
		!Number.isInteger(values.buyIn) ||
		values.buyIn < 1 ||
		values.buyIn > MAX_BUY_IN
	)
		return fail(m.bet_error_buy_in({ max: MAX_BUY_IN }));

	const closesAt = parseLocalDateTime(values.closesAt, values.timeZone);
	if (!closesAt) return fail(m.bet_error_closes_missing());
	if (closesAt.getTime() <= Date.now()) return fail(m.bet_error_closes_past());

	const config: TimeslotConfig = {
		rangeStart: values.rangeStart,
		rangeEnd: values.rangeEnd,
		slotMinutes,
		dayStart: minutesToClock(dayStart),
		dayEnd: minutesToClock(dayEnd),
		timeZone: values.timeZone
	};

	return {
		values,
		error: null,
		bet: {
			title: values.title,
			description: values.description || null,
			answer_config:
				config as unknown as Database["public"]["Tables"]["bets"]["Insert"]["answer_config"],
			buy_in: values.buyIn,
			closes_at: closesAt.toISOString()
		}
	};
}

/** Whether the user may create bets in a group */
export function canCreateBets(
	group: { members_can_create_bets: boolean },
	role: string | undefined
) {
	return (
		role === "owner" ||
		role === "admin" ||
		(role === "member" && group.members_can_create_bets)
	);
}

/** Loads a bet with its wagers and the names to show for each player */
export async function loadBet(
	supabase: SupabaseClient<Database>,
	groupId: string,
	betId: string
) {
	assertUuid(betId);

	const [{ data: bet }, { data: wagers }, { data: members }] =
		await Promise.all([
			supabase
				.from("bets")
				.select(
					"id, group_id, created_by, title, description, answer_config, buy_in, closes_at, status, outcome_at, winner_id, resolved_at, created_at"
				)
				.eq("id", betId)
				.eq("group_id", groupId)
				.maybeSingle(),
			supabase
				.from("wagers")
				.select("user_id, slot_start, created_at")
				.eq("bet_id", betId)
				.order("slot_start"),
			supabase
				.from("group_members")
				.select("user_id, nickname, profiles(display_name)")
				.eq("group_id", groupId)
		]);

	if (!bet) error(404);

	const names = new Map(
		(members ?? []).map((member) => [
			member.user_id,
			member.nickname ?? member.profiles?.display_name ?? null
		])
	);
	const nameOf = (userId: string | null) =>
		(userId && names.get(userId)) || m.former_member();

	return {
		bet: {
			...bet,
			config: bet.answer_config as unknown as TimeslotConfig,
			status: bet.status as BetStatus,
			winnerName: bet.winner_id ? nameOf(bet.winner_id) : null,
			creatorName: nameOf(bet.created_by)
		},
		wagers: (wagers ?? []).map((wager) => ({
			userId: wager.user_id,
			slotStart: wager.slot_start,
			name: nameOf(wager.user_id)
		}))
	};
}

/** Turns database errors from the bet functions into friendly messages */
export function betErrorMessage(message: string | undefined) {
	if (message?.includes("already claimed")) return m.slot_taken();
	if (message?.includes("Betting has closed")) return m.betting_closed();
	if (message?.includes("isn't one of the slots")) return m.slot_invalid();
	if (message?.includes("already finished")) return m.bet_finished();
	return m.error_generic();
}
