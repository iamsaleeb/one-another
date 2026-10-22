# Identity-only session; Ability loaded from the database each request

The session token carries the user's identity and onboarding state, never their Grants. Every request loads the user's Grants from the database and builds a CASL Ability from them, and every permission check (pages, layouts, server actions, route handlers) goes through that Ability; middleware only checks "signed in". We chose this over embedding roles in the JWT because embedded roles went stale for up to an hour after a Grant changed, and pages that read role names from the token drifted from the server-side capability table. The cost is a few indexed queries per request, which we accept for correctness.

## Considered Options

- **Roles in the JWT, refreshed on change**: faster, but every Grant write must force a token refresh, and the token becomes a second source of truth.
- **Hosted authorization service (OpenFGA, SpiceDB, Permit.io)**: models the Church → Series → Event hierarchy natively, but every Grant must be written to both Postgres and the external store, and every check adds a network hop.
- **Hand-rolled rule engine**: viable for three resource types, but CASL's `accessibleBy` generates the Prisma `where` for "where can this user act", which is the part that is easy to get wrong by hand. CASL is used directly rather than behind our own wrapper.
