---
paths:
  - "app/**"
---

# Routes (`app/`)

Reference: `docs/ARCHITECTURE.md` §4.

- Every file under `app/` becomes a URL. Put only route files here: no helpers, API calls, engines or shared components.
- Sport screens live in `sports/<sport>/screens/`. The route file is one line:
  `export { default } from '@/sports/<sport>/screens/XScreen';`
- Register a new route in the `<Stack>` in `app/_layout.tsx` with its title and presentation (`modal` for create screens, `headerShown: false` for full-screen flows).
- Don't change the provider order in `app/_layout.tsx`. A new sport's provider goes after `FootballMatchProvider` and before `ActionSheetProvider`.
- Use typed absolute paths in `router.push` (`'/notification'`, not `'../notification'`).
- Only Home redirects to `/login`. Admin routes (`/cricket/create-match`, `/cricket/live-scoring`, `/manage-stadiums`, other create screens) have no guard. If you add a guard, do it once in the root layout, not per screen, and update `docs/AUTHENTICATION.md` §5.
- Detail screens (`[id]`) currently show "not found" while data is still loading. Check loading state before showing not-found in new detail screens.
