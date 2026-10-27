<script lang="ts">
	import { m } from "#lib/paraglide/messages.js";
	import type { GroupVisibility } from "#lib/types.js";

	interface Props {
		name?: string;
		description?: string;
		visibility?: GroupVisibility;
		membersCanCreateBets?: boolean;
	}

	let {
		name = "",
		description = "",
		visibility = "private",
		membersCanCreateBets = true
	}: Props = $props();
</script>

<label>
	{m.group_name()}
	<input name="name" maxlength="60" required value={name} />
</label>

<label>
	{m.group_description()}
	<textarea name="description" maxlength="500" rows="3" value={description}
	></textarea>
	<small>{m.optional()}</small>
</label>

<fieldset>
	<legend>{m.group_who_can_join()}</legend>
	<label class="choice">
		<input
			type="radio"
			name="visibility"
			value="private"
			checked={visibility === "private"}
		/>
		<span>
			<strong>{m.group_private()}</strong>
			<small>{m.group_private_hint()}</small>
		</span>
	</label>
	<label class="choice">
		<input
			type="radio"
			name="visibility"
			value="public"
			checked={visibility === "public"}
		/>
		<span>
			<strong>{m.group_public()}</strong>
			<small>{m.group_public_hint()}</small>
		</span>
	</label>
</fieldset>

<label class="choice">
	<input
		type="checkbox"
		name="members_can_create_bets"
		checked={membersCanCreateBets}
	/>
	<span>
		<strong>{m.group_members_can_create_bets()}</strong>
		<small>{m.group_members_can_create_bets_hint()}</small>
	</span>
</label>
