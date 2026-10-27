<script lang="ts">
	import { m } from "#lib/paraglide/messages.js";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>{m.join_title()} · {m.app_name()}</title>
</svelte:head>

<section class="card narrow center">
	{#if data.invite}
		<p class="muted">{m.join_invited_to()}</p>
		<h1>{data.invite.name}</h1>
		<p class="muted">
			{m.join_member_count({ count: data.invite.member_count })}
		</p>
		<form method="POST" onsubmit={() => (submitting = true)}>
			<button class="button" disabled={submitting}>{m.join_button()}</button>
		</form>
	{:else}
		<h1>{m.join_title()}</h1>
		<p>{m.join_invalid()}</p>
		<a href="/">{m.back_home()}</a>
	{/if}
</section>
