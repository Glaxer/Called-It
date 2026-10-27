<script lang="ts" module>
	export interface BetFieldValues {
		title: string;
		description: string;
		rangeStart: string;
		rangeEnd: string;
		slotMinutes: number;
		dayStartHour: number;
		dayEndHour: number;
		prize: number;
		/** "YYYY-MM-DDTHH:MM" in the bet's time zone */
		closesAt: string;
		timeZone: string;
	}
</script>

<script lang="ts">
	import { untrack } from "svelte";
	import { m } from "#lib/paraglide/messages.js";
	import { daysInRange, SLOT_LENGTHS } from "#lib/slots.js";

	interface Props {
		values: BetFieldValues;
		/**
		 * Someone has picked a slot: the prize and slot setup can't change, and
		 * the range can only be extended (earlier start, later end).
		 */
		locked?: boolean;
		/** New bets use the creator's time zone; existing bets keep theirs */
		detectTimeZone?: boolean;
	}

	let { values, locked = false, detectTimeZone = false }: Props = $props();

	// Read once: after that the inputs own their values (they survive a failed
	// submit because the form isn't reset)
	const initial = untrack(() => values);
	let rangeStart = $state(initial.rangeStart);
	let rangeEnd = $state(initial.rangeEnd);
	let slotMinutes = $state(initial.slotMinutes);
	let dayStartHour = $state(initial.dayStartHour);
	let dayEndHour = $state(initial.dayEndHour);
	let closesAt = $state(initial.closesAt);
	let timeZone = $state(initial.timeZone);

	$effect(() => {
		if (detectTimeZone) {
			timeZone =
				Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Copenhagen";
		}
	});

	const slotLabels: Record<(typeof SLOT_LENGTHS)[number], () => string> = {
		15: () => m.slot_length_15(),
		30: () => m.slot_length_30(),
		60: () => m.slot_length_60(),
		120: () => m.slot_length_120(),
		1440: () => m.slot_length_1440()
	};

	const hours = Array.from({ length: 25 }, (_, i) => i);
	const pad = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

	/** Live summary: "1,392 slots to pick from (48 a day over 29 days)" */
	const summary = $derived.by(() => {
		if (!rangeStart || !rangeEnd || rangeEnd < rangeStart) return null;
		const days = daysInRange(rangeStart, rangeEnd).length;
		const span = slotMinutes === 1440 ? 1440 : (dayEndHour - dayStartHour) * 60;
		if (span < slotMinutes || span % slotMinutes !== 0) return null;
		const perDay = span / slotMinutes;
		return { days, perDay, total: days * perDay };
	});
</script>

<label>
	{m.bet_title()}
	<input
		name="title"
		maxlength="120"
		required
		placeholder={m.bet_title_placeholder()}
		value={initial.title}
	/>
</label>

<label>
	{m.bet_description()}
	<textarea name="description" maxlength="1000" rows="2"
		>{initial.description}</textarea
	>
	<small>{m.optional()}</small>
</label>

{#if locked}
	<p class="notice small">{m.bet_edit_locked_note()}</p>
{/if}

<fieldset>
	<legend>{m.bet_range()}</legend>
	<div class="row">
		<label>
			{m.bet_range_from()}
			<input
				type="date"
				name="range_start"
				required
				max={locked ? initial.rangeStart : undefined}
				bind:value={rangeStart}
			/>
		</label>
		<label>
			{m.bet_range_to()}
			<input
				type="date"
				name="range_end"
				required
				min={locked ? initial.rangeEnd : rangeStart}
				bind:value={rangeEnd}
			/>
		</label>
	</div>
</fieldset>

<fieldset disabled={locked}>
	<legend>{m.bet_slots()}</legend>
	<div class="row">
		<label>
			{m.bet_slot_length()}
			<select name="slot_minutes" bind:value={slotMinutes}>
				{#each SLOT_LENGTHS as length (length)}
					<option value={length}>{slotLabels[length]()}</option>
				{/each}
			</select>
		</label>

		{#if slotMinutes !== 1440}
			<label>
				{m.bet_hours_from()}
				<select name="day_start_hour" bind:value={dayStartHour}>
					{#each hours.slice(0, 24) as hour (hour)}
						<option value={hour}>{pad(hour)}</option>
					{/each}
				</select>
			</label>
			<label>
				{m.bet_hours_to()}
				<select name="day_end_hour" bind:value={dayEndHour}>
					{#each hours.slice(1) as hour (hour)}
						<option value={hour}>{pad(hour)}</option>
					{/each}
				</select>
			</label>
		{/if}
	</div>
	{#if summary}
		<small class="muted">
			{m.bet_slot_summary({
				perDay: summary.perDay,
				days: summary.days,
				total: summary.total
			})}
		</small>
	{/if}
</fieldset>

<div class="row">
	<label>
		{m.bet_prize()}
		<input
			type="number"
			name="prize"
			min="1"
			max="1000000"
			step="1"
			required
			disabled={locked}
			value={initial.prize}
		/>
		<small>{m.bet_prize_hint()}</small>
	</label>

	<label>
		{m.bet_closes_at()}
		<input
			type="datetime-local"
			name="closes_at"
			required
			bind:value={closesAt}
		/>
		<small>{m.bet_closes_at_hint()}</small>
	</label>
</div>

{#if locked}
	<!-- Disabled fields aren't submitted, so send the locked values along -->
	<input type="hidden" name="slot_minutes" value={initial.slotMinutes} />
	<input type="hidden" name="day_start_hour" value={initial.dayStartHour} />
	<input type="hidden" name="day_end_hour" value={initial.dayEndHour} />
	<input type="hidden" name="prize" value={initial.prize} />
{/if}

<input type="hidden" name="time_zone" value={timeZone} />
<p class="muted small">{m.bet_time_zone_note({ timeZone })}</p>
