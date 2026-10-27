<script lang="ts">
	import { page } from "$app/state";
	import { m } from "#lib/paraglide/messages.js";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
</script>

{#if data.user}
	<section>
		<h1>{m.home_greeting({ name: data.displayName ?? "" })}</h1>

		{#if page.url.searchParams.has("passwordChanged")}
			<p class="notice" role="status">{m.reset_password_done()}</p>
		{/if}

		<div class="section-header">
			<h2>{m.home_groups_title()}</h2>
			<a class="button small" href="/groups/new">{m.group_create()}</a>
		</div>

		{#if data.groups.length}
			<ul class="group-list">
				{#each data.groups as group (group.id)}
					<li>
						<a class="card group-card" href="/groups/{group.id}">
							<span class="group-card-name">{group.name}</span>
							{#if group.description}
								<span class="muted">{group.description}</span>
							{/if}
							<span class="tags">
								<span class="tag">
									{group.visibility === "public"
										? m.group_public()
										: m.group_private()}
								</span>
								{#if group.role !== "member"}
									<span class="tag">
										{group.role === "owner" ? m.role_owner() : m.role_admin()}
									</span>
								{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<div class="card empty">
				<p>{m.home_groups_empty()}</p>
				<a class="button" href="/groups/new">{m.group_create_first()}</a>
			</div>
		{/if}
	</section>
{:else}
	<section class="hero">
		<h1>{m.app_name()}</h1>
		<p>{m.app_tagline()}</p>
		<a class="button" href="/signup">{m.home_get_started()}</a>
	</section>
{/if}
