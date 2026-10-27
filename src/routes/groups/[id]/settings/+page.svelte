<script lang="ts">
	import { enhance } from "$app/forms";
	import GroupFields from "#lib/components/GroupFields.svelte";
	import { m } from "#lib/paraglide/messages.js";
	import type { PageProps } from "./$types";

	let { data, form }: PageProps = $props();

	const isOwner = $derived(data.membership.role === "owner");
	const youId = $derived(data.user?.id);

	function roleName(role: string) {
		if (role === "owner") return m.role_owner();
		if (role === "admin") return m.role_admin();
		return m.role_member();
	}
</script>

<svelte:head>
	<title>{m.group_settings()} · {data.group.name} · {m.app_name()}</title>
</svelte:head>

<header class="page-header">
	<div>
		<a href="/groups/{data.group.id}">← {data.group.name}</a>
		<h1>{m.group_settings()}</h1>
	</div>
</header>

<div class="settings">
	{#if isOwner}
		<section class="card">
			<h2>{m.settings_details()}</h2>
			<form
				method="POST"
				action="?/update"
				use:enhance={() =>
					async ({ update }) =>
						update({ reset: false })}
			>
				{#if form?.updateError}
					<p class="error" role="alert">{form.updateError}</p>
				{/if}

				<GroupFields
					name={form?.name ?? data.group.name}
					description={form?.description ?? data.group.description ?? ""}
					visibility={form?.visibility ?? data.group.visibility}
					membersCanCreateBets={form?.membersCanCreateBets ??
						data.group.members_can_create_bets}
				/>

				<div class="actions">
					{#if form?.updated}
						<span class="saved" role="status">{m.saved()}</span>
					{/if}
					<button class="button">{m.save()}</button>
				</div>
			</form>
		</section>
	{/if}

	<section class="card">
		<h2>{m.invite_title()}</h2>
		<p class="muted">{m.invite_regenerate_hint()}</p>
		<form
			method="POST"
			action="?/regenerateInvite"
			use:enhance={({ cancel }) => {
				if (!confirm(m.invite_regenerate_confirm())) cancel();
			}}
		>
			{#if form?.inviteError}
				<p class="error" role="alert">{form.inviteError}</p>
			{/if}
			<div class="actions start">
				<button class="button small secondary">
					{m.invite_regenerate()}
				</button>
				{#if form?.inviteRegenerated}
					<span class="saved" role="status">{m.invite_regenerated()}</span>
				{/if}
			</div>
		</form>
	</section>

	<section class="card">
		<h2>{m.members_title()}</h2>
		{#if form?.memberError}
			<p class="error" role="alert">{form.memberError}</p>
		{/if}
		<ul class="member-list">
			{#each data.members as member (member.userId)}
				<li>
					<span class="name">
						{member.name}
						{#if member.name !== member.accountName}
							<small class="muted">({member.accountName})</small>
						{/if}
						{#if member.userId === youId}
							<small class="muted">· {m.you()}</small>
						{/if}
					</span>
					<span class="tag">{roleName(member.role)}</span>

					{#if member.role !== "owner" && member.userId !== youId}
						<span class="member-actions">
							{#if isOwner}
								<form method="POST" action="?/setRole" use:enhance>
									<input type="hidden" name="user_id" value={member.userId} />
									<input
										type="hidden"
										name="role"
										value={member.role === "admin" ? "member" : "admin"}
									/>
									<button class="link-button">
										{member.role === "admin"
											? m.members_remove_admin()
											: m.members_make_admin()}
									</button>
								</form>
							{/if}
							<form
								method="POST"
								action="?/removeMember"
								use:enhance={({ cancel }) => {
									if (!confirm(m.members_remove_confirm({ name: member.name })))
										cancel();
								}}
							>
								<input type="hidden" name="user_id" value={member.userId} />
								<button class="link-button danger">
									{m.members_remove()}
								</button>
							</form>
						</span>
					{/if}
				</li>
			{/each}
		</ul>
	</section>

	{#if isOwner}
		<section class="card danger-zone">
			<h2>{m.delete_group()}</h2>
			<p class="muted">{m.delete_group_hint()}</p>
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (!confirm(m.delete_group_confirm({ group: data.group.name })))
						cancel();
				}}
			>
				{#if form?.deleteError}
					<p class="error" role="alert">{form.deleteError}</p>
				{/if}
				<div class="actions start">
					<button class="button small danger">{m.delete_group()}</button>
				</div>
			</form>
		</section>
	{/if}
</div>
