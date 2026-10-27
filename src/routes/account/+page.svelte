<script lang="ts">
	import { enhance } from "$app/forms";
	import { m } from "#lib/paraglide/messages.js";
	import type { PageProps } from "./$types";

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.account_title()} · {m.app_name()}</title>
</svelte:head>

<header class="page-header">
	<div>
		<h1>{m.account_title()}</h1>
		<p class="muted">{m.account_signed_in_as({ email: data.email })}</p>
	</div>
</header>

<div class="settings">
	<section class="card">
		<h2>{m.form_display_name()}</h2>
		<form
			method="POST"
			action="?/name"
			use:enhance={() =>
				async ({ update }) =>
					update({ reset: false })}
		>
			{#if form?.nameError}
				<p class="error" role="alert">{form.nameError}</p>
			{/if}
			<label>
				<span class="visually-hidden">{m.form_display_name()}</span>
				<input
					name="display_name"
					maxlength="40"
					required
					value={form?.displayName ?? data.displayName ?? ""}
				/>
				<small>{m.account_display_name_hint()}</small>
			</label>
			<div class="actions">
				{#if form?.nameSaved}
					<span class="saved" role="status">{m.saved()}</span>
				{/if}
				<button class="button small">{m.save()}</button>
			</div>
		</form>
	</section>

	<section class="card">
		<h2>{m.account_change_password()}</h2>
		<form method="POST" action="?/password" use:enhance>
			{#if form?.passwordError}
				<p class="error" role="alert">{form.passwordError}</p>
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
			<div class="actions">
				{#if form?.passwordSaved}
					<span class="saved" role="status">{m.account_password_saved()}</span>
				{/if}
				<button class="button small">{m.account_change_password()}</button>
			</div>
		</form>
	</section>
</div>
