<script lang="ts">
	import { enhance } from "$app/forms";
	import { page } from "$app/state";
	import { m } from "#lib/paraglide/messages.js";
	import type { PageProps } from "./$types";

	let { form }: PageProps = $props();
	let submitting = $state(false);

	const loginHref = $derived(
		page.url.searchParams.has("redirectTo")
			? `/login?redirectTo=${encodeURIComponent(page.url.searchParams.get("redirectTo") ?? "")}`
			: "/login"
	);
</script>

<svelte:head>
	<title>{m.signup_title()} · {m.app_name()}</title>
</svelte:head>

<section class="card auth">
	<h1>{m.signup_title()}</h1>

	{#if form?.checkEmail}
		<p class="notice" role="status">
			{m.signup_check_email({ email: form.email })}
		</p>
	{:else}
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
				{m.form_display_name()}
				<input
					name="display_name"
					autocomplete="nickname"
					maxlength="40"
					required
					value={form?.displayName ?? ""}
				/>
				<small>{m.form_display_name_hint()}</small>
			</label>

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

			<label>
				{m.form_password()}
				<input
					name="password"
					type="password"
					autocomplete="new-password"
					minlength="8"
					required
				/>
				<small>{m.form_password_hint({ min: 8 })}</small>
			</label>

			<button class="button" disabled={submitting}>{m.signup_submit()}</button>
		</form>

		<p class="switch">
			{m.signup_have_account()} <a href={loginHref}>{m.nav_login()}</a>
		</p>
	{/if}
</section>
