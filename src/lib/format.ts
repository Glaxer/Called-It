/**
 * Formats a slot like "Feb 7, 13:30" (en) or "7. feb., 13:30" (da).
 * The date part follows the language; the time is always 24-hour with a colon,
 * so it reads the same in both (Danish formatting would otherwise give 13.30).
 */
export function formatSlot(date: Date, locale: string, timeZone: string) {
	return `${formatDay(date, locale, timeZone)}, ${formatTime(date, timeZone)}`;
}

/** "Feb 7" (en) or "7. feb." (da) */
export function formatDay(date: Date, locale: string, timeZone: string) {
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
		timeZone
	}).format(date);
}

/** Always "13:30" style, whatever the language */
export function formatTime(date: Date, timeZone: string) {
	const parts = new Intl.DateTimeFormat("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
		timeZone
	}).formatToParts(date);
	const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
	const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
	return `${hour}:${minute}`;
}
