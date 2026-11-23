---
version: 1
slug: "constants-colors-tsx"
primary_target: "constants/colors.tsx"
related_targets: ["app/login.tsx","sports/cricket/screens/LiveScoringScreen.tsx"]
---

## Scope

Whole FAQ Sports app (Expo / React Native, iOS + Android + web). Visitor mode: Operate. Primary user: admin scoring live, one-handed, outdoors in daylight.

## Direction contract

THESIS: Every match is a line on FAQ's own printed fixture sheet, and the live one is highlighted. Refuses the category-default dark card feed with a neon accent.

OWN-WORLD: Bright office-paper ground (#F7F6F1), black print ink (#16181D), one hairline rule colour, fluorescent highlighter yellow (#E8F24A) that marks only live or current items, drawing-pin red for LIVE and OUT, ink blue for primary actions. Team colours appear as small pin dots. Flat paper: no shadows, small radii (2–10), hairlines over boxes.

STORY: The scorer opens the app, sees the live match on the highlighter, taps into scoring and records every ball with large, unmissable keys. Players read fixtures, results and their stats as clean printed lists.

FIRST VIEWPORT: Large-title "FAQ Sports" with a role tag, the sport switcher as an underlined segment row, the live match on a highlighter block with huge tabular score numerals, then Fixtures and Results as hairline-ruled rows, with the native tab bar below.

FORM: The Fixture Sheet, position 6 of 7 on the ordered grounded list, seed:95a8a2f5752faecd. Signature move: the highlighter swipe behind whatever is live or current (live match, striker, selected option). Raises: scale-only hierarchy; focus lift; states stay visible; colour only decodes; one hairline rule system.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
