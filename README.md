# Called It

Friendly bets for friends and family. Make a group, create a bet like "When will X give birth?", and everyone claims a timeslot. Closest guess takes the pot. Points only, no money.

## Stack

- SvelteKit + Svelte 5, TypeScript
- Supabase (auth + Postgres with row-level security)
- Paraglide JS for English and Danish (English is the base language)
- Vercel for hosting

## Getting started

```bash
npm install
cp .env.example .env
npm run dev
```

`.env.example` points at the Supabase project. The publishable key is safe to expose; it only allows what the RLS policies permit.

## Database

The schema lives in `supabase/migrations`. In short:

- `groups`, `group_members`, `group_invites`: private groups are joined with an invite link, public ones by anyone logged in.
- `bets`: a question with a timeslot grid (`answer_config`), a fixed buy-in and a closing time.
- `wagers`: one claimed slot per person per bet; each slot can only be claimed once.
- `group_leaderboard`: net points per member, over resolved bets.

Placing wagers, joining groups and resolving bets go through database functions (`place_wager`, `join_group`, `resolve_bet`, …) so the rules are enforced in one place.

To regenerate the TypeScript types after a schema change:

```bash
npx supabase gen types typescript --project-id djqhwqogbcgahawabylz > src/lib/database.types.ts
```

## Translations

Strings live in `messages/en.json` and `messages/da.json`. Use them with `m.key()` from `#lib/paraglide/messages.js`. The language comes from a cookie (set by the language picker), then the browser's language, then English. URLs are the same in every language.

## License

[AGPL-3.0](LICENSE)
