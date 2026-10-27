<script lang="ts">
	import "../app.css";
	import favicon from "#lib/assets/favicon.svg";
	import { m } from "#lib/paraglide/messages.js";
	import { getLocale, locales, setLocale } from "#lib/paraglide/runtime.js";
	import type { LayoutProps } from "./$types";

	let { children, data }: LayoutProps = $props();

	const localeNames: Record<(typeof locales)[number], string> = {
		en: "English",
		da: "Dansk"
	};
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{m.app_name()}</title>
</svelte:head>

<header class="site-header">
	<a class="logo" href="/">{m.app_name()}</a>

	<nav>
		<label class="language">
			<span class="visually-hidden">{m.nav_language()}</span>
			<select
				value={getLocale()}
				onchange={(e) =>
					setLocale(e.currentTarget.value as (typeof locales)[number])}
			>
				{#each locales as locale (locale)}
					<option value={locale}>{localeNames[locale]}</option>
				{/each}
			</select>
		</label>

		{#if data.user}
			<a href="/account">{data.displayName ?? m.nav_account()}</a>
			<form method="POST" action="/logout">
				<button class="link-button">{m.nav_logout()}</button>
			</form>
		{:else}
			<a href="/login">{m.nav_login()}</a>
			<a class="button small" href="/signup">{m.nav_signup()}</a>
		{/if}
	</nav>
</header>

<main>
	{@render children()}
</main>
