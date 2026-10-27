/** @type {import("prettier").Config} */
const config = {
	useTabs: true,
	trailingComma: "none",
	printWidth: 80,
	plugins: ["prettier-plugin-svelte"],
	overrides: [{ files: "*.svelte", options: { parser: "svelte" } }]
};

export default config;
