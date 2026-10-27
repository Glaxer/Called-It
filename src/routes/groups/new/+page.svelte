<script lang="ts">
	import { enhance } from "$app/forms";
	import GroupFields from "#lib/components/GroupFields.svelte";
	import { m } from "#lib/paraglide/messages.js";
	import type { PageProps } from "./$types";

	let { form }: PageProps = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>{m.group_create()} · {m.app_name()}</title>
</svelte:head>

<section class="card narrow">
	<h1>{m.group_create()}</h1>

	<form
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

		<GroupFields
			name={form?.name}
			description={form?.description}
			visibility={form?.visibility}
			membersCanCreateBets={form?.membersCanCreateBets}
		/>

		<div class="actions">
			<a href="/">{m.cancel()}</a>
			<button class="button" disabled={submitting}>{m.group_create()}</button>
		</div>
	</form>
</section>
