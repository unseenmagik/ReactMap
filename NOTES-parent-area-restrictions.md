# Working notes — parent-based areaRestrictions

Session log from 2026-07-23. Context for picking this back up later.

> **Housekeeping:** this file is working notes, not shippable docs. It is deliberately
> its own commit so it can be dropped in one step before opening the PR:
> `git rebase --onto ef873897 HEAD~1` (or `git reset --hard ef873897` if nothing else
> has landed on top).

---

## 1. Where this came from

The starting question was whether [PR #1195](https://github.com/WatWowMap/ReactMap/pull/1195)
was worth resurrecting. Conclusion: the **feature** is worth having, the **branch** is not.

### What the history showed

The original feature commit `600eed64` was small and reasonable — 5 files, 51+/15-.
The remaining **96 commits are all `fix:`**, chasing regressions. Final state of that PR:

| File | develop | PR #1195 head |
| --- | --- | --- |
| `server/src/utils/areaPerms.js` | 33 lines | **672 lines** |
| `server/src/utils/consolidateAreas.js` | 30 lines | 212 lines |
| total | — | 1638+ / 268- across 25 files |

### Root cause of the blowup

Five magic strings smuggled into what is supposed to be a plain array of area names:

```
__rm_no_access__   __rm_unrestricted__
__rm_area__:       __rm_parent__:      __rm_scope__:
```

`areaRestrictions` is a `string[]` that flows through session storage, GraphQL context,
the SQL builder, the RTree filter and the client store. Every newly discovered edge case
got encoded as another sentinel prefix rather than a change of shape. That cascaded into
request-scoped grant serialization, legacy fallbacks, a persisted-store migration,
auth-client changes and a signup gate — none of which the feature needs.

Mygod's own closing verdict on the PR was the correct read: it needs
*"one canonical area identifier model and explicit validation for ambiguous configs"*.

### Things that were still unfixed on #1195

- **Codex P2** — a parent polygon covering space outside its children was visible on first
  load, then silently lost the moment the user touched the scan-area filter, because the
  picker round-trips selections as child keys only.
- **Copilot** — `NO_ACCESS_SENTINEL` is stripped by `getPublicAreaRestrictions()`, so a
  no-access user reaches the client with an empty array, which the client reads as
  *unrestricted*. A permissions bug in the fail-open direction.
- Unguarded `JSON.parse` in the local-login path, stale `useMemo` deps, O(n²) recompute
  on every map tap.

### The merge conflict was a red herring

Everyone assumed `DIRTY` was the blocker. A trial merge showed **one** conflicted file
(`src/features/scanArea/ScanAreaTile.jsx`), and `develop` had moved only 3 commits over
the PR's files. Rebasing was always an afternoon — the problem was that rebasing gets you
a green merge button on top of logic nobody can verify.

---

## 2. What was built instead

Branch `feat/parent-area-restrictions`, cut from `origin/main` at `9fd57b94` (v1.48.1).
Feature commit `ef873897`. **+37 / -10 across 6 files.**

### The rule that keeps it small

> **A parent name is only ever expanded into child area keys. It never enters the
> permission array itself.**

That single constraint removes the ambiguity #1195 kept fighting — *is this string an area
name, a parent name, or a key?* — and with it the entire sentinel/scoping apparatus.
No client, storage, SQL, RTree or auth-provider changes at all.

### Changes

- **`server/src/services/areas.js`** — `parseAreas` also builds `childrenByParent`
  (parent name → child area keys), next to the existing `withoutParents` map.
- **`server/src/utils/areaPerms.js`** — expands each configured `parent` into its child
  keys. The empty-rule short circuit now considers `parent` too, so a rule with
  `areas: []` and a non-empty `parent` is no longer mistaken for "unrestricted".
- **`server/src/graphql/resolvers.js`** — `scanAreas` / `scanAreasMenu` also match on
  `feature.properties.key`. **This is a pre-existing bug fix, not new behaviour:**
  `areaPerms` has always returned *keys*, but a child's key is `Parent-Name`, which could
  never match the `properties.name` check. Any grant resolving to a child was being
  filtered back out of the map and drawer.
- **`packages/config/lib/mutations.js`** — `applyMutations` destructured `{ roles, areas }`
  and silently dropped everything else, so `parent` never survived config load.
- **`packages/types/lib/config.d.ts`** — optional `parent?: string[]`.
- **`config/local.example.json`** — documents `parent: []`.

### Key facts about the data model (worth not re-deriving)

- `areas.names` is a `Set` of **keys**, not names — see `parseAreas`, `names.add(key)`.
- A feature's key is `parent ? \`${parent}-${name}\` : name`, set in `loadScanPolygons`.
- `withoutParents` maps **name → [keys]**, which is how a bare name in `areas` expands to
  every matching area across parents.
- `consolidateAreas.js` was left **completely untouched**. It has legacy behaviour where a
  parent name in `areas` lets user-selected children through; touching it is what sent
  #1195 into its flip-flop loop.

### Deliberate limitation

`parent` grants **children only**, never the parent's own polygon — list it in `areas` as
well to include it. This is the one concession that keeps the feature small.

It matters because a parent that both has geometry *and* acts as a grouping header renders
as a group header row in the drawer, not a selectable child, so it cannot be individually
toggled. That is exactly the Codex P2 case on #1195. Requiring it to be listed explicitly
makes the grant visible in config instead of implied by geometry.

---

## 3. Verification status

**The repo has zero test files.** That is the real reason #1195 needed 96 fix commits.

Since there was no suite to lean on, `@rm/config` was stubbed and the real `areaPerms.js`
run against a fixture covering the cases #1195 kept regressing on — a parent with its own
polygon, a header-only parent with no polygon, and the same child name reused under two
different parents. **11/11 pass**, including three backward-compat checks:

- `areas: []` with no `parent` still means unrestricted
- a bare name in `areas` still expands through `withoutParents` across parents
- a rule with no `parent` key at all does not crash

### What has NOT been verified

- **No testing against a real `areas.json`.** This is the main outstanding task.
- The harness covers `areaPerms` only — not the resolver filters end to end.
- Lint and the repo's prettier could not be run; `node_modules` is not installed.
  The one prettier warning seen on `config.d.ts` reproduces on unmodified `main`,
  so it is pre-existing.
- The verification harness lived in a session scratchpad and is **gone**. If it is wanted
  as a committed test, it needs rewriting — the fixture shape is described above.

---

## 4. State + next steps

- Branch pushed to **fork only** (`unseenmagik/ReactMap`). Nothing on WatWowMap.
- **#1195 deliberately left open**, no comment posted.
- No PR opened yet.

To do:

1. Test against a real `areas.json`, ideally a multi-domain one.
2. Drop this notes commit (see top of file).
3. Open the PR against `WatWowMap/ReactMap:main` using the description below.
4. Decide whether to comment on / close #1195 as superseded.

---

## 5. Drafted PR description

<details>
<summary>Click to expand</summary>

## 📝 PR Overview

- feature: non breaking, additional config option.

For those that still use an `areas.json` file (rather than Kōji), this adds an optional
`parent: string[]` to `authentication.areaRestrictions` so you can grant access to every
child of a parent area without listing each child by name.

This **supersedes #1195** and is a clean reimplementation off `main`. Please close #1195
in favour of this.

### Why a new PR instead of reviving #1195

#1195 started as a 51-line change and ended at **1638 additions across 25 files over 100
commits** — 96 of which were `fix:` commits chasing regressions. The root cause is visible
at the top of the `areaPerms.js` it produced:

```
__rm_no_access__   __rm_unrestricted__
__rm_area__:       __rm_parent__:      __rm_scope__:
```

Because `areaRestrictions` is a plain `string[]` that flows through session storage,
GraphQL context, the SQL builder, the RTree filter and the client store, every newly
discovered edge case got encoded as another magic-string sentinel rather than a change of
shape. That forced request-scoped grant serialization, legacy fallbacks, a persisted-store
migration, auth-client changes and a signup gate — none of which the feature actually
needs. `areaPerms.js` went 33 → 672 lines and `consolidateAreas.js` 30 → 212.

That approach also left real defects open at the end, including one where a no-access
user's restrictions were stripped client-side and read as *unrestricted* — a fail-open
permissions bug.

### The rule that keeps this small

**A parent name is only ever expanded into child area keys. It never enters the permission
array itself.**

That single constraint removes the ambiguity #1195 kept fighting (is this string an area
name, a parent name, or a key?) and with it the entire sentinel/scoping apparatus. The
result is +37 / -10 across 6 files, with no client, storage, SQL, RTree or auth-provider
changes at all.

### Changes

- **`server/src/services/areas.js`** — `parseAreas` now also builds `childrenByParent`
  (parent name → child area keys), next to the existing `withoutParents` map.
- **`server/src/utils/areaPerms.js`** — expands each configured `parent` into its child
  keys. The empty-rule short circuit now considers `parent` too, so a rule with
  `areas: []` and a non-empty `parent` is no longer mistaken for "unrestricted".
- **`server/src/graphql/resolvers.js`** — `scanAreas` / `scanAreasMenu` now also match on
  `feature.properties.key`. This is a pre-existing gap rather than new behaviour:
  `areaPerms` has always returned *keys*, but a child's key is `Parent-Name`, which could
  never match the `properties.name` check. Without this, granted children are filtered
  back out of the map and the drawer.
- **`packages/config/lib/mutations.js`** — `applyMutations` destructured
  `{ roles, areas }` and silently dropped everything else, so `parent` never survived
  config load.
- **`packages/types/lib/config.d.ts`** — optional `parent?: string[]`.
- **`config/local.example.json`** — documents `parent: []`.

### Usage

```jsonc
{
  "roles": ["some-role"],
  "areas": [],
  "parent": ["London"]   // grants London-Central, London-North, ...
}
```

`areas` and `parent` are additive, so a parent that has a polygon of its own is granted by
listing it in both:

```jsonc
{
  "roles": ["some-role"],
  "areas": ["London"],   // the London polygon itself
  "parent": ["London"]   // + all of its children
}
```

### Deliberate limitation

`parent` grants **children only**, never the parent's own polygon. This is the one
concession that keeps the feature small, and it is what the second example above is for.

It matters because a parent that both has geometry *and* acts as a grouping header is
rendered as a group header row in the drawer, not as a selectable child — so it cannot be
individually toggled. In #1195 that produced the reported behaviour where such a region
was visible on first load and then silently disappeared as soon as the user touched the
scan-area filter. Requiring it to be listed explicitly in `areas` makes the grant visible
in config instead of implied by geometry.

### Compatibility

Non-breaking. `parent` is optional and absent configs take exactly the previous code path.
Existing behaviour that was explicitly preserved and checked:

- `areas: []` with no `parent` still means unrestricted.
- A bare area name in `areas` still expands through `withoutParents` to every matching key
  across parents.
- A parent name in `areas` still behaves as before via `consolidateAreas` — that file is
  untouched.

### Testing

The repo has no test harness, so I verified `areaPerms` against a fixture built to cover
the cases #1195 kept regressing on — a parent with its own polygon, a header-only parent
with no polygon, and the same child name reused under two different parents. All 11 checks
pass, including the three compatibility cases above. Happy to fold this into a proper test
file if you'd like one added.

</details>
