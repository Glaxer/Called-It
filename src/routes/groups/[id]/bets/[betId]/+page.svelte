<script lang="ts">
	import { enhance } from "$app/forms";
	import {
		formatDayLabel,
		formatLongDay,
		formatNumber,
		formatSlot,
		formatTime
	} from "#lib/format.js";
	import { m } from "#lib/paraglide/messages.js";
	import { getLocale } from "#lib/paraglide/runtime.js";
	import { daysInRange, slotDay, slotsForDay } from "#lib/slots.js";
	import type { PageProps } from "./$types";

	let { data, form }: PageProps = $props();

	const locale = getLocale();
	const config = $derived(data.bet.config);
	const timeZone = $derived(config.timeZone);
	const youId = $derived(data.user?.id);

	const prize = $derived(formatNumber(data.bet.prize, locale));
	const isOpen = $derived(
		data.bet.status === "open" && new Date(data.bet.closes_at) > new Date()
	);
	const yourWager = $derived(data.wagers.find((w) => w.userId === youId));

	/** Claimed slots by start time (ms), for quick lookup in the grid */
	const claimed = $derived(
		new Map(data.wagers.map((w) => [new Date(w.slotStart).getTime(), w]))
	);

	/** How many slots are taken on each day, for the "heat" on the day picker */
	const takenPerDay = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const wager of data.wagers) {
			const day = slotDay(new Date(wager.slotStart), config);
			counts.set(day, (counts.get(day) ?? 0) + 1);
		}
		return counts;
	});
	const maxPerDay = $derived(Math.max(1, ...takenPerDay.values()));

	const days = $derived(daysInRange(config.rangeStart, config.rangeEnd));

	const winningSlot = $derived(
		data.wagers.find((w) => w.userId === data.bet.winner_id)?.slotStart
	);

	/** Start on the day of your slot, the winning slot, today, or the first day */
	function initialDay() {
		const today = new Date().toISOString().slice(0, 10);
		const anchor = yourWager?.slotStart ?? winningSlot;
		if (anchor) return slotDay(new Date(anchor), config);
		if (today >= config.rangeStart && today <= config.rangeEnd) return today;
		return config.rangeStart;
	}
	let selectedDay = $state(initialDay());

	const slots = $derived(slotsForDay(config, selectedDay));

	// Keep the selected day in view in the day strip
	let dayStrip: HTMLElement | undefined = $state();
	$effect(() => {
		dayStrip
			?.querySelector(`[data-day="${selectedDay}"]`)
			?.scrollIntoView({ block: "nearest", inline: "center" });
	});

	let pendingSlot: string | null = $state(null);
</script>

<svelte:head>
	<title>{data.bet.title} · {data.group.name} · {m.app_name()}</title>
</svelte:head>

<header class="page-header">
	<div>
		<a href="/groups/{data.group.id}">← {data.group.name}</a>
		<h1>{data.bet.title}</h1>
		{#if data.bet.description}
			<p class="muted">{data.bet.description}</p>
		{/if}
		<small class="muted">
			{m.bet_created_by({ name: data.bet.creatorName })}
		</small>
	</div>
	{#if data.canManage && data.bet.status === "open"}
		<a
			class="button small secondary"
			href="/groups/{data.group.id}/bets/{data.bet.id}/edit">{m.bet_edit()}</a
		>
	{/if}
</header>

<dl class="stats">
	<div>
		<dt>{m.bet_prize()}</dt>
		<dd>{prize}</dd>
	</div>
	<div>
		<dt>{m.bet_players()}</dt>
		<dd>{data.wagers.length}</dd>
	</div>
	<div>
		<dt>
			{#if data.bet.status === "resolved"}
				{m.bet_status_resolved()}
			{:else if data.bet.status === "cancelled"}
				{m.bet_status_cancelled()}
			{:else if isOpen}
				{m.bet_closes()}
			{:else}
				{m.bet_status_closed()}
			{/if}
		</dt>
		<dd class="small-value">
			{#if data.bet.status === "open"}
				{formatSlot(new Date(data.bet.closes_at), locale, timeZone)}
			{:else if data.bet.resolved_at}
				{formatSlot(new Date(data.bet.resolved_at), locale, timeZone)}
			{/if}
		</dd>
	</div>
</dl>

{#if data.bet.status === "resolved" && data.bet.outcome_at}
	<section class="card result">
		<h2>{m.bet_result()}</h2>
		<p class="result-time">
			{formatSlot(new Date(data.bet.outcome_at), locale, timeZone)}
		</p>
		{#if data.bet.winnerName}
			<p>
				{data.bet.winner_id === youId
					? m.bet_you_won({ prize })
					: m.bet_winner({ name: data.bet.winnerName, prize })}
			</p>
		{:else}
			<p>{m.bet_no_players()}</p>
		{/if}
	</section>
{:else if data.bet.status === "cancelled"}
	<section class="card">
		<p>{m.bet_cancelled_note()}</p>
	</section>
{/if}

<section class="card your-wager">
	{#if form?.wagerError}
		<p class="error" role="alert">{form.wagerError}</p>
	{/if}
	{#if yourWager}
		<p>
			{m.bet_your_slot()}
			<strong
				>{formatSlot(new Date(yourWager.slotStart), locale, timeZone)}</strong
			>
		</p>
		{#if isOpen}
			<div class="actions start">
				<small class="muted">{m.bet_move_hint()}</small>
				<form
					method="POST"
					action="?/withdraw"
					use:enhance={({ cancel }) => {
						if (!confirm(m.bet_withdraw_confirm())) cancel();
					}}
				>
					<button class="link-button danger">{m.bet_withdraw()}</button>
				</form>
			</div>
		{/if}
	{:else if isOpen}
		<p>
			{m.bet_pick_slot({ prize })}
		</p>
	{:else if data.bet.status === "open"}
		<p class="muted">{m.bet_closed_no_slot()}</p>
	{/if}
</section>

<section class="picker">
	<div class="day-strip" bind:this={dayStrip} role="tablist">
		{#each days as day (day)}
			{@const label = formatDayLabel(day, locale)}
			{@const taken = takenPerDay.get(day) ?? 0}
			<button
				type="button"
				role="tab"
				aria-selected={day === selectedDay}
				class="day"
				class:selected={day === selectedDay}
				data-day={day}
				onclick={() => (selectedDay = day)}
			>
				<span class="weekday">{label.weekday}</span>
				<span class="date">{label.date}</span>
				<span
					class="heat"
					style:--heat={taken / maxPerDay}
					aria-label={m.bet_taken_count({ count: taken })}
				>
					{taken || ""}
				</span>
			</button>
		{/each}
	</div>

	<h2 class="day-heading">{formatLongDay(selectedDay, locale)}</h2>

	<form
		method="POST"
		action="?/place"
		class="slot-grid"
		class:whole-day={config.slotMinutes === 1440}
		use:enhance={({ formData }) => {
			pendingSlot = String(formData.get("slot"));
			return async ({ update }) => {
				await update();
				pendingSlot = null;
			};
		}}
	>
		{#each slots as slot (slot.getTime())}
			{@const wager = claimed.get(slot.getTime())}
			{@const mine = wager?.userId === youId}
			{@const won = !!wager && wager.slotStart === winningSlot}
			<button
				name="slot"
				value={slot.toISOString()}
				class="slot"
				class:taken={!!wager && !mine}
				class:mine
				class:won
				class:pending={pendingSlot === slot.toISOString()}
				disabled={!isOpen || !!wager || pendingSlot !== null}
				title={wager ? wager.name : m.bet_claim_slot()}
			>
				<span class="time">
					{config.slotMinutes === 1440
						? m.slot_length_1440()
						: formatTime(slot, timeZone)}
				</span>
				{#if wager}
					<span class="who">{mine ? m.you() : wager.name}</span>
				{/if}
			</button>
		{/each}
	</form>
	<p class="muted small">{m.bet_time_zone_note({ timeZone })}</p>
</section>

{#if data.canManage && data.bet.status === "open"}
	<section class="card manage">
		<h2>{m.bet_manage()}</h2>
		{#if form?.manageError}
			<p class="error" role="alert">{form.manageError}</p>
		{/if}

		<form
			method="POST"
			action="?/resolve"
			use:enhance={({ cancel, formData }) => {
				const outcome = String(formData.get("outcome"));
				if (
					!confirm(
						m.bet_resolve_confirm({ outcome: outcome.replace("T", " ") })
					)
				)
					cancel();
			}}
		>
			<label>
				{m.bet_outcome()}
				<input type="datetime-local" name="outcome" required />
				<small>{m.bet_outcome_hint()}</small>
			</label>
			<input type="hidden" name="time_zone" value={timeZone} />
			<div class="actions start">
				<button class="button">{m.bet_resolve()}</button>
			</div>
		</form>

		<form
			method="POST"
			action="?/cancel"
			use:enhance={({ cancel }) => {
				if (!confirm(m.bet_cancel_confirm())) cancel();
			}}
		>
			<div class="actions start">
				<button class="link-button danger">{m.bet_cancel()}</button>
				<small class="muted">{m.bet_cancel_hint()}</small>
			</div>
		</form>
	</section>
{/if}
