<script lang="ts">
	import { enhance } from "$app/forms";
	import { untrack } from "svelte";
	import { m } from "#lib/paraglide/messages.js";
	import { addDays, daysInRange, SLOT_LENGTHS } from "#lib/slots.js";
	import type { PageProps } from "./$types";

	let { data, form }: PageProps = $props();
	let submitting = $state(false);

	// Defaults: a four-week range starting next week, betting closes when it starts
	const today = new Date().toISOString().slice(0, 10);
	const defaultStart = addDays(today, 7);

	// Read once: after that the inputs own their values (they survive a failed
	// submit because the form isn't reset)
	const initial = untrack(() => form);
	let rangeStart = $state(initial?.rangeStart || defaultStart);
	let rangeEnd = $state(initial?.rangeEnd || addDays(defaultStart, 28));
	let slotMinutes = $state(initial?.slotMinutes || 30);
	let dayStartHour = $state(initial?.dayStartHour ?? 0);
	let dayEndHour = $state(initial?.dayEndHour ?? 24);
	let closesAt = $state(initial?.closesAt || `${defaultStart}T00:00`);

	// The bet's grid uses the creator's time zone; Copenhagen if the browser doesn't say
	let timeZone = $state("Europe/Copenhagen");
	$effect(() => {
		timeZone =
			Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Copenhagen";
	});

	const slotLabels: Record<(typeof SLOT_LENGTHS)[number], () => string> = {
		15: () => m.slot_length_15(),
		30: () => m.slot_length_30(),
		60: () => m.slot_length_60(),
		120: () => m.slot_length_120(),
		1440: () => m.slot_length_1440()
	};

	const hours = Array.from({ length: 25 }, (_, i) => i);

	/** Live summary: "48 slots per day, 1,392 in total" */
	const summary = $derived.by(() => {
		if (!rangeStart || !rangeEnd || rangeEnd < rangeStart) return null;
		const days = daysInRange(rangeStart, rangeEnd).length;
		const span = slotMinutes === 1440 ? 1440 : (dayEndHour - dayStartHour) * 60;
		if (span < slotMinutes || span % slotMinutes !== 0) return null;
		const perDay = span / slotMinutes;
		return { days, perDay, total: days * perDay };
	});
</script>

<svelte:head>
	<title>{m.bet_create()} · {data.group.name} · {m.app_name()}</title>
</svelte:head>

<header class="page-header">
	<div>
		<a href="/groups/{data.group.id}">← {data.group.name}</a>
		<h1>{m.bet_create()}</h1>
	</div>
</header>

<form
	class="card bet-form"
	method="POST"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
		};
	}}
>
	{#if form?.error}
		<p class="error" role="alert">{form.error}</p>
	{/if}

	<label>
		{m.bet_title()}
		<input
			name="title"
			maxlength="120"
			required
			placeholder={m.bet_title_placeholder()}
			value={form?.title ?? ""}
		/>
	</label>

	<label>
		{m.bet_description()}
		<textarea name="description" maxlength="1000" rows="2"
			>{form?.description ?? ""}</textarea
		>
		<small>{m.optional()}</small>
	</label>

	<fieldset>
		<legend>{m.bet_range()}</legend>
		<div class="row">
			<label>
				{m.bet_range_from()}
				<input
					type="date"
					name="range_start"
					required
					bind:value={rangeStart}
				/>
			</label>
			<label>
				{m.bet_range_to()}
				<input
					type="date"
					name="range_end"
					required
					min={rangeStart}
					bind:value={rangeEnd}
				/>
			</label>
		</div>
	</fieldset>

	<fieldset>
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
							<option value={hour}>{String(hour).padStart(2, "0")}:00</option>
						{/each}
					</select>
				</label>
				<label>
					{m.bet_hours_to()}
					<select name="day_end_hour" bind:value={dayEndHour}>
						{#each hours.slice(1) as hour (hour)}
							<option value={hour}>{String(hour).padStart(2, "0")}:00</option>
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
			{m.bet_buy_in()}
			<input
				type="number"
				name="buy_in"
				min="1"
				max="1000000"
				step="1"
				required
				value={form?.buyIn || 10}
			/>
			<small>{m.bet_buy_in_hint()}</small>
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

	<input type="hidden" name="time_zone" value={timeZone} />
	<p class="muted small">{m.bet_time_zone_note({ timeZone })}</p>

	<div class="actions">
		<a href="/groups/{data.group.id}">{m.cancel()}</a>
		<button class="button" disabled={submitting}>{m.bet_create()}</button>
	</div>
</form>
