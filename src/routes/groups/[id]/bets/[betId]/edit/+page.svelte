<script lang="ts">
	import { enhance } from "$app/forms";
	import BetFields from "#lib/components/BetFields.svelte";
	import { m } from "#lib/paraglide/messages.js";
	import type { PageProps } from "./$types";

	let { data, form }: PageProps = $props();
	let submitting = $state(false);

	const betUrl = $derived(`/groups/${data.group.id}/bets/${data.betId}`);
</script>

<svelte:head>
	<title>{m.bet_edit()} · {data.betTitle} · {m.app_name()}</title>
</svelte:head>

<header class="page-header">
	<div>
		<a href={betUrl}>← {data.betTitle}</a>
		<h1>{m.bet_edit()}</h1>
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

	<BetFields values={form ?? data.values} locked={data.locked} />

	<div class="actions">
		<a href={betUrl}>{m.cancel()}</a>
		<button class="button" disabled={submitting}>{m.save()}</button>
	</div>
</form>
