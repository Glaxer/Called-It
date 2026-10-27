<script lang="ts">
	import { enhance } from "$app/forms";
	import CopyField from "#lib/components/CopyField.svelte";
	import { m } from "#lib/paraglide/messages.js";
	import type { PageProps } from "./$types";

	let { data, form }: PageProps = $props();

	const canManage = $derived(
		data.membership?.role === "owner" || data.membership?.role === "admin"
	);
	const youId = $derived(data.user?.id);

	/** "+50", "−50" or "0", with a real minus sign */
	function formatPoints(points: number) {
		if (points > 0) return `+${points}`;
		if (points < 0) return `−${Math.abs(points)}`;
		return "0";
	}
</script>

<svelte:head>
	<title>{data.group.name} · {m.app_name()}</title>
</svelte:head>

<header class="page-header">
	<div>
		<h1>{data.group.name}</h1>
		{#if data.group.description}
			<p class="muted">{data.group.description}</p>
		{/if}
		<span class="tag">
			{data.group.visibility === "public"
				? m.group_public()
				: m.group_private()}
		</span>
	</div>
	{#if canManage}
		<a class="button small secondary" href="/groups/{data.group.id}/settings"
			>{m.group_settings()}</a
		>
	{/if}
</header>

{#if !data.membership}
	<section class="card narrow">
		<p>{m.group_public_join_intro()}</p>
		<form method="POST" action="?/join" use:enhance>
			<button class="button">{m.join_button()}</button>
		</form>
	</section>
{:else}
	<div class="group-grid">
		<section class="card bets">
			<h2>{m.bets_title()}</h2>
			<p class="muted">{m.bets_coming_soon()}</p>
		</section>

		<section class="card">
			<h2>{m.leaderboard_title()}</h2>
			<ol class="leaderboard">
				{#each data.leaderboard as row, i (row.user_id)}
					<li class:you={row.user_id === youId}>
						<span class="rank">{i + 1}</span>
						<span class="name">
							{row.display_name}
							{#if row.user_id === youId}
								<small class="muted">({m.you()})</small>
							{/if}
						</span>
						<span class="points" class:negative={(row.points ?? 0) < 0}>
							{formatPoints(row.points ?? 0)}
						</span>
						<small class="muted record">
							{m.leaderboard_record({
								won: row.bets_won ?? 0,
								played: row.bets_played ?? 0
							})}
						</small>
					</li>
				{/each}
			</ol>
		</section>

		{#if data.inviteUrl}
			<section class="card">
				<h2>{m.invite_title()}</h2>
				<p class="muted">
					{data.group.visibility === "private"
						? m.invite_hint_private()
						: m.invite_hint_public()}
				</p>
				<CopyField value={data.inviteUrl} label={m.invite_title()} />
			</section>
		{/if}

		<section class="card">
			<h2>{m.nickname_title()}</h2>
			<form
				method="POST"
				action="?/nickname"
				use:enhance={() =>
					async ({ update }) =>
						update({ reset: false })}
			>
				{#if form?.nicknameError}
					<p class="error" role="alert">{form.nicknameError}</p>
				{/if}
				<label>
					<span class="visually-hidden">{m.nickname_title()}</span>
					<input
						name="nickname"
						maxlength="40"
						placeholder={data.displayName ?? ""}
						value={form?.nickname ?? data.membership.nickname ?? ""}
					/>
					<small>{m.nickname_hint({ name: data.displayName ?? "" })}</small>
				</label>
				<div class="actions">
					{#if form?.nicknameSaved}
						<span class="saved" role="status">{m.saved()}</span>
					{/if}
					<button class="button small">{m.save()}</button>
				</div>
			</form>
		</section>
	</div>

	{#if data.membership.role !== "owner"}
		<form
			class="leave"
			method="POST"
			action="?/leave"
			use:enhance={({ cancel }) => {
				if (!confirm(m.leave_confirm({ group: data.group.name }))) cancel();
			}}
		>
			{#if form?.leaveError}
				<p class="error" role="alert">{form.leaveError}</p>
			{/if}
			<button class="link-button danger">{m.leave_group()}</button>
		</form>
	{/if}
{/if}
