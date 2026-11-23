---
name: add-api-function
description: Add or change a Supabase data-access function in FAQ Sports (api/*.ts or sports/<sport>/api.ts) and wire it into React Query and the screens. Use when a feature needs to read or write a Supabase table, or when replacing mock data with real data.
---

# Add an API function

Read `docs/API_DOCUMENTATION.md` and `docs/DATABASE_SCHEMA.md` (especially §6 mismatches and §7 enums, delete rules and RLS) first.

## 1. Check the database supports it

In `docs/supabase-schema.sql` and `docs/DATABASE_SCHEMA.md` §7:

- Table and column names (snake_case) and types.
- Enum values: send them exactly, case-sensitive.
- **RLS policy for this operation.** Many tables are read-only for clients and no policy checks the admin role. If the write has no policy, stop and use the `supabase-sql` skill to write one; don't ship a write that RLS will reject or that anyone can call.
- Delete rules: what cascades or blocks.

If a column is missing, propose a schema change with the `supabase-sql` skill. Don't work around it in app code.

## 2. Write the function

Shared data → `api/<entity>Api.ts`; one sport → `sports/<sport>/api.ts`.

```ts
export const getGroundList = async (): Promise<Ground[]> => {
  const { data, error } = await supabase
    .from('grounds')
    .select('id, name, location')   // list columns; avoid select('*')
    .order('name');
  if (error) {
    console.error('Error fetching grounds:', error);
    throw error;
  }
  return (data ?? []).map(row => ({ id: row.id, name: row.name, location: row.location ?? undefined }));
};
```

- Map snake_case rows to camelCase app types inside the function. Put row types in `types/` (shared) or `sports/<sport>/types.ts`.
- Use database-generated uuids; never send app-made or mock IDs.
- Embed one-to-one tables instead of a second request: `select('*, player_stats(*)')`.
- **Writes:** chain `.select()` and check rows came back. A write denied by RLS can "succeed" with 0 rows.
- Don't log row data.

## 3. Wire it up

- Reads: a `useQuery` with a stable key (`['grounds']`), in the relevant provider (`context/AppContext.tsx` or `sports/<sport>/context.tsx`) or the screen. Don't copy query data into `useState`, and don't fall back to mock data on error; expose `isLoading` / `error`.
- Writes: call from the screen inside `runWithGlobalLoading`, disable the button while saving, then `refetch` or `queryClient.invalidateQueries`.
- Errors: show a specific message for `23505` (already exists), `23503` (in use) and `42501` (not allowed); keep the user's input.

## 4. Finish

- Add a unit test with a mocked client (`write-tests` skill): right table, right columns, mapping, error thrown.
- Update `docs/API_DOCUMENTATION.md` §3 (and a request example for anything non-trivial) and, if behaviour changed, `docs/DATABASE_SCHEMA.md` §6.
- Run the `verify-change` skill.
