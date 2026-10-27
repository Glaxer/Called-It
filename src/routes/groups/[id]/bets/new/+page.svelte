<script lang="ts">
	import { enhance } from "$app/forms";
	import BetFields from "#lib/components/BetFields.svelte";
	import { m } from "#lib/paraglide/messages.js";
	import { addDays } from "#lib/slots.js";
	import type { PageProps } from "./$types";

	let { data, form }: PageProps = $props();
	let submitting = $state(false);

	// Defaults: a four-week range starting next week, betting closes when it starts
	const today = new Date().toISOString().slice(0, 10);
	const defaultStart = addDays(today, 7);
	const defaults = {
		title: "",
		description: "",
		rangeStart: defaultStart,
		rangeEnd: addDays(defaultStart, 28),
		slotMinutes: 30,
		dayStartHour: 0,
		dayEndHour: 24,
		prize: 10,
		closesAt: `${defaultStart}T00:00`,
		timeZone: "Europe/Copenhagen"
	};
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

	<BetFields values={form ?? defaults} detectTimeZone />

	<div class="actions">
		<a href="/groups/{data.group.id}">{m.cancel()}</a>
		<button class="button" disabled={submitting}>{m.bet_create()}</button>
	</div>
</form>
