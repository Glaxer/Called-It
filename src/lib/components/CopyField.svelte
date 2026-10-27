<script lang="ts">
	import { m } from "#lib/paraglide/messages.js";

	interface Props {
		value: string;
		label: string;
	}

	let { value, label }: Props = $props();
	let copied = $state(false);
	let input: HTMLInputElement;
	let timer: ReturnType<typeof setTimeout>;

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
		} catch {
			// Clipboard can be blocked (e.g. outside https); select it so it's easy to copy by hand
			input.select();
			return;
		}
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="copy-field">
	<input
		bind:this={input}
		readonly
		aria-label={label}
		{value}
		onfocus={(e) => e.currentTarget.select()}
	/>
	<button type="button" class="button small" onclick={copy}>
		{copied ? m.copied() : m.copy()}
	</button>
</div>
