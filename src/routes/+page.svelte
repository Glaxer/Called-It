<script lang="ts">
	import { m } from "#lib/paraglide/messages.js";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
</script>

{#if data.user}
	<section>
		<h1>{m.home_greeting({ name: data.displayName ?? "" })}</h1>
		<h2>{m.home_groups_title()}</h2>
		<p class="muted">{m.home_groups_empty()}</p>
	</section>
{:else}
	<section class="hero">
		<h1>{m.app_name()}</h1>
		<p>{m.app_tagline()}</p>
		<a class="button" href="/signup">{m.home_get_started()}</a>
	</section>
{/if}
