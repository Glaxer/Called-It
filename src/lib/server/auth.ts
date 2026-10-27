export const MIN_PASSWORD_LENGTH = 8;
export const MAX_DISPLAY_NAME_LENGTH = 40;

/**
 * Only allows redirects to paths on this site, so a link like
 * /login?redirectTo=https://evil.example can't send people elsewhere.
 */
export function safeRedirect(
	to: string | null | undefined,
	fallback = "/"
): string {
	if (!to || !to.startsWith("/") || to.startsWith("//") || to.includes("\\")) {
		return fallback;
	}
	return to;
}
