<script lang="ts">
	import { enhance } from "$app/forms";
	import { m } from "#lib/paraglide/messages.js";
	import type { PageProps } from "./$types";

	let { data, form }: PageProps = $props();
	let submitting = $state(false);
</script>

<svelte:head>
	<title>{m.forgot_password_title()} · {m.app_name()}</title>
</svelte:head>

<section class="card auth">
	<h1>{m.forgot_password_title()}</h1>

	{#if form?.sent}
		<p class="notice" role="status">
			{m.forgot_password_sent({ email: form.email })}
		</p>
		<p class="switch"><a href="/login">{m.back_to_login()}</a></p>
	{:else}
		{#if data.expired}
			<p class="error" role="alert">{m.forgot_password_expired()}</p>
		{:else}
			<p class="muted">{m.forgot_password_intro()}</p>
		{/if}

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

			<label>
				{m.form_email()}
				<input
					name="email"
					type="email"
					autocomplete="email"
					required
					value={form?.email ?? ""}
				/>
			</label>

			<button class="button" disabled={submitting}>
				{m.forgot_password_submit()}
			</button>
		</form>

		<p class="switch"><a href="/login">{m.back_to_login()}</a></p>
	{/if}
</section>
