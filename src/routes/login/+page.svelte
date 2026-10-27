<script lang="ts">
	import { enhance } from "$app/forms";
	import { page } from "$app/state";
	import { m } from "#lib/paraglide/messages.js";
	import type { PageProps } from "./$types";

	let { data, form }: PageProps = $props();
	let submitting = $state(false);

	const signupHref = $derived(
		page.url.searchParams.has("redirectTo")
			? `/signup?redirectTo=${encodeURIComponent(page.url.searchParams.get("redirectTo") ?? "")}`
			: "/signup"
	);
</script>

<svelte:head>
	<title>{m.login_title()} · {m.app_name()}</title>
</svelte:head>

<section class="card auth">
	<h1>{m.login_title()}</h1>

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
		{:else if data.confirmError}
			<p class="error" role="alert">{m.error_confirm_failed()}</p>
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

		<label>
			{m.form_password()}
			<input
				name="password"
				type="password"
				autocomplete="current-password"
				required
			/>
		</label>

		<button class="button" disabled={submitting}>{m.login_submit()}</button>
	</form>

	<p class="switch">
		{m.login_no_account()} <a href={signupHref}>{m.nav_signup()}</a>
	</p>
</section>
