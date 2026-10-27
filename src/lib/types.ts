/** Stored in bets.answer_config for timeslot bets. Validated by the database too. */
export interface TimeslotConfig {
	/** First day of the range, "YYYY-MM-DD" in the bet's time zone */
	rangeStart: string;
	/** Last day of the range (inclusive) */
	rangeEnd: string;
	slotMinutes: 15 | 30 | 60 | 120 | 1440;
	/** "HH:MM", defaults to "00:00" */
	dayStart?: string;
	/** "HH:MM", defaults to "24:00" */
	dayEnd?: string;
	/** IANA time zone the grid is laid out in, e.g. "Europe/Copenhagen" */
	timeZone: string;
}

export type BetStatus = "open" | "resolved" | "cancelled";
export type GroupRole = "owner" | "admin" | "member";
export type GroupVisibility = "private" | "public";
