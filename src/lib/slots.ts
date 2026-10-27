import type { TimeslotConfig } from "./types.js";

/**
 * Slots are never stored: they're calculated from the bet's config, here and
 * in the database (private.is_valid_slot). The two must agree, so the rules
 * are the same: a slot starts at dayStart + n × slotMinutes local time, ends
 * by dayEnd, and its local date is within the range.
 */

export const SLOT_LENGTHS = [15, 30, 60, 120, 1440] as const;
export const MAX_RANGE_DAYS = 366;

/** "HH:MM" → minutes after midnight ("24:00" → 1440) */
export function clockMinutes(clock: string) {
	const [hours, minutes] = clock.split(":").map(Number);
	return hours * 60 + minutes;
}

/** Minutes after midnight → "HH:MM" */
export function minutesToClock(minutes: number) {
	const h = String(Math.floor(minutes / 60)).padStart(2, "0");
	const m = String(minutes % 60).padStart(2, "0");
	return `${h}:${m}`;
}

/** Every day from start to end (inclusive), as "YYYY-MM-DD" */
export function daysInRange(start: string, end: string) {
	const days: string[] = [];
	const cursor = parseDay(start);
	const last = parseDay(end);
	while (cursor <= last && days.length <= MAX_RANGE_DAYS) {
		days.push(cursor.toISOString().slice(0, 10));
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}
	return days;
}

/** "YYYY-MM-DD" → a Date at midnight UTC (used only for calendar maths) */
export function parseDay(day: string) {
	const [y, m, d] = day.split("-").map(Number);
	return new Date(Date.UTC(y, m - 1, d));
}

/** Adds days to a "YYYY-MM-DD" string */
export function addDays(day: string, amount: number) {
	const date = parseDay(day);
	date.setUTCDate(date.getUTCDate() + amount);
	return date.toISOString().slice(0, 10);
}

/** The wall-clock date and time of an instant in a time zone */
export function wallClock(instant: Date, timeZone: string) {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat("en-US", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hourCycle: "h23"
		})
			.formatToParts(instant)
			.map((p) => [p.type, p.value])
	);
	return {
		day: `${parts.year}-${parts.month}-${parts.day}`,
		minutes: Number(parts.hour) * 60 + Number(parts.minute),
		seconds: Number(parts.second)
	};
}

/**
 * The instant at which a time zone's clock shows `day` + `minutes`.
 * Returns null for times that don't exist (skipped when clocks go forward).
 * When clocks go back and a time happens twice, returns the first one.
 */
export function zonedTime(
	day: string,
	minutes: number,
	timeZone: string
): Date | null {
	const [y, m, d] = day.split("-").map(Number);
	const asUtc = Date.UTC(y, m - 1, d, 0, minutes);

	// The zone's UTC offset at a given instant, in ms
	const offsetAt = (t: number) => {
		const wall = wallClock(new Date(t), timeZone);
		const [wy, wm, wd] = wall.day.split("-").map(Number);
		return Date.UTC(wy, wm - 1, wd, 0, wall.minutes) - t;
	};

	// Try both offsets around the wanted time and keep the earliest that matches
	const candidates = [
		asUtc - offsetAt(asUtc - 12 * 3600_000),
		asUtc - offsetAt(asUtc + 12 * 3600_000)
	].sort((a, b) => a - b);

	for (const t of candidates) {
		const wall = wallClock(new Date(t), timeZone);
		if (wall.day === day && wall.minutes === minutes) return new Date(t);
	}
	return null;
}

/** All slot start times on one day of a bet's grid */
export function slotsForDay(config: TimeslotConfig, day: string): Date[] {
	const start = clockMinutes(config.dayStart ?? "00:00");
	const end = clockMinutes(config.dayEnd ?? "24:00");
	const slots: Date[] = [];
	const seen = new Set<number>();

	for (let m = start; m + config.slotMinutes <= end; m += config.slotMinutes) {
		const instant = zonedTime(day, m, config.timeZone);
		if (instant && !seen.has(instant.getTime())) {
			seen.add(instant.getTime());
			slots.push(instant);
		}
	}
	return slots;
}

/** The local day a slot (or any instant) falls on in the bet's time zone */
export function slotDay(instant: Date, config: TimeslotConfig) {
	return wallClock(instant, config.timeZone).day;
}

/** Same rules as the database's private.is_valid_slot */
export function isValidSlot(config: TimeslotConfig, instant: Date) {
	const wall = wallClock(instant, config.timeZone);
	const start = clockMinutes(config.dayStart ?? "00:00");
	const end = clockMinutes(config.dayEnd ?? "24:00");
	return (
		wall.seconds === 0 &&
		instant.getUTCMilliseconds() === 0 &&
		wall.day >= config.rangeStart &&
		wall.day <= config.rangeEnd &&
		wall.minutes >= start &&
		wall.minutes + config.slotMinutes <= end &&
		(wall.minutes - start) % config.slotMinutes === 0
	);
}

/** Whether a string is a time zone this runtime knows */
export function isValidTimeZone(timeZone: string) {
	try {
		new Intl.DateTimeFormat("en-US", { timeZone });
		return true;
	} catch {
		return false;
	}
}
