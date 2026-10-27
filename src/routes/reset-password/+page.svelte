<script lang="ts">
	import { enhance } from "$app/forms";
	import { m } from "#lib/paraglide/messages.js";
	import type { PageProps } from "./$types";

	let { form }: PageProps = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>{m.reset_password_title()} · {m.app_name()}</title>
</svelte:head>

<section class="card auth">
	<h1>{m.reset_password_title()}</h1>

	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		{#if form?.error}
			<p class="error" role="alert">{form.error}</p>
		{/if}

		<label>
			{m.form_new_password()}
			<input
				name="password"
				type="password"
				autocomplete="new-password"
				minlength="8"
				required
			/>
			<small>{m.form_password_hint({ min: 8 })}</small>
		</label>

		<label>
			{m.form_confirm_password()}
			<input
				name="confirm"
				type="password"
				autocomplete="new-password"
				minlength="8"
				required
			/>
		</label>

		<button class="button" disabled={submitting}>
			{m.reset_password_submit()}
		</button>
	</form>
</section>
