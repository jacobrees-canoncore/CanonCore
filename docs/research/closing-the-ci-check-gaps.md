# Closing the CI check gaps

**Researched 2026-08-18.** Every claim below was read on that date from the page or the machine that
owns it: GitHub's own REST, Actions and Apps documentation on `docs.github.com`; the README of
[`actions/create-github-app-token`](https://github.com/actions/create-github-app-token) in its own
repository, plus that repository's metadata read through `gh api`; Linear's own developer and product
documentation on `linear.app`; and this repository's `main` branch, its live CI run and its live
GitHub settings, read with `gh` and by running the script. **Nothing here comes from a blog post, a
listicle, a Stack Overflow answer or a summary.** Where a claim could only be reached second-hand, or
could not be reached at all, it is marked **unverified** and collected at the end.

Two observations are the perishable ones and both were made first-hand rather than quoted from a
document: the local report, and CI run `32112789702`. Both are reproduced verbatim below.

Every Linear issue named here carries its title, per `CLAUDE.md` → *Name every ticket you cite*: a
bare identifier is easy to misread as a neighbouring ticket, and three of the tickets in this area
differ only in scope.

## The answer

**Accept all three. The current arrangement is already correct, and one document needs a correction
rather than the arrangement needing a change.**

| Gap | Verdict | The one-line reason |
| --- | --- | --- |
| `the secret roster matches GitHub Actions` | **Accept** | A GitHub App would genuinely close it and is genuinely the standard route, but it costs a **non-expiring** private key in the very store the check exists to keep honest, to compare **two** names |
| `the security-settings roster matches the repository` | **Accept** | Closing it needs repository **Administration**, on the repository whose ruleset is the merge gate — and it is not even documented that an installation token would then receive the block |
| `the label roster matches the tracker` | **Accept** | A tracker's label taxonomy is not a property of the commit. Nothing about a runner makes it a better place to compare eight strings than the laptop that already does |

**The one thing to change is a sentence, not a workflow.**
[`docs/agents/triage-labels.md`](../agents/triage-labels.md) → *Where this check gates, and where it
does not* refuses a Linear credential on the grounds that "a personal API key is user-scoped and
workspace-wide". **The second half of that is no longer true** — Linear now documents both
permission-restricted and team-restricted personal keys. The decision survives on its other clause,
and should be made to rest on it. *Linear's key model has moved*, below.

## What the two runs actually report

**Locally, 18 August 2026**, `node scripts/check-docs.ts --verbose`, run in the CAN-136 worktree
shortly before that branch landed on `main` as `852dd84`. The commit it ran against was amended
away and is reachable from nothing, which is why it is not named: the check reads the working tree
rather than a commit, so the report below is a property of those files, not of a SHA.

```
PASS  the label roster matches the tracker                 8 labels agree
PASS  the secret roster matches GitHub Actions             2 secrets agree
PASS  the security-settings roster matches the repository  7 settings agree, 781 packages in the graph

11 passed, 0 skipped, 0 failed
```

**In CI, run `32112789702`**, on `main` at `852dd84`, 18 August 2026 07:45 UTC, conclusion `success`:

```
SKIP  the label roster matches the tracker                 cannot read the tracker labels: `orca linear team labels --team CAN --workspace ad2669ec-93a5-4ce1-97fa-c7d9247a1452 --json` — spawnSync orca ENOENT
SKIP  the secret roster matches GitHub Actions             cannot read the Actions secrets: `gh secret list --json name --jq .[].name` — failed to get secrets: HTTP 403: Resource not accessible by integration (https://api.github.com/repos/jacobrees-canoncore/CanonCore/actions/secrets?per_page=100)
SKIP  the security-settings roster matches the repository  the repository carried no `security_and_analysis` block, which GitHub returns only to a caller with admin on it — so none of the three sources could be read as an answer

8 passed, 3 skipped, 0 failed  (a skipped check reached no source; it is not a pass)
```

**The local run's advantage is an identity, not a machine.** `gh api repos/jacobrees-canoncore/CanonCore`
read back `"permissions": {"admin": true, …}` for the signed-in account on 18 August 2026. Every one
of the three gaps below is that difference and nothing else: the laptop holds `admin` on an
Organization-owned public repository, and a runner holds a repository-scoped app installation token.

## The secret roster

### The default `GITHUB_TOKEN` can never read Actions secret names

**This is settled by enumeration rather than by argument.** GitHub's workflow syntax reference states
*"You can use `permissions` to modify the default permissions granted to the `GITHUB_TOKEN`, adding or
removing access as required, so that you only allow the minimum required access"*, and *"For each of
the available permissions, shown in the table below, you can assign one of the access levels: `read`
(if applicable), `write`, or `none`. `write` includes `read`"*
([Workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions),
read 18 August 2026). The table it refers to holds sixteen keys and this is all of them:

`actions`, `artifact-metadata`, `attestations`, `checks`, `code-quality`, `contents`, `deployments`,
`discussions`, `id-token`, `issues`, `packages`, `pages`, `pull-requests`, `security-events`,
`statuses`, `vulnerability-alerts`.

**There is no `secrets` key and no `administration` key.** A workflow cannot ask for what is not on
that list, so no `permissions:` block, in any job, reaches the secrets API. That is the whole answer
to the question, and it holds regardless of what the repository's default permission is set to.

**And the token is not something else in disguise.** GitHub's own concept page says *"The
`GITHUB_TOKEN` secret is a GitHub App installation access token"* and *"The token's permissions are
limited to the repository that contains your workflow"*
([GITHUB_TOKEN](https://docs.github.com/en/actions/concepts/security/github_token)). So the runner's
identity is already an app installation — one whose grantable permission set is the sixteen above.

**One near miss is worth naming, because the name invites it.** `vulnerability-alerts` is on the list
and reads as if it were the missing scope for the security-settings gap. It is not: GitHub defines it
as *"Read Dependabot alerts. For example, `vulnerability-alerts: read` permits an action to list
Dependabot alerts for the repository. Only `read` and `none` are supported; `write` is not valid"*
— the alerts, not the setting. [`docs/infrastructure.md`](../infrastructure.md) →
*Dependency and secret scanning* already draws that distinction, and this research confirms it
against the same page rather than correcting it.

**The keyless route was tried here and is worse than unavailable.** `${{ toJSON(secrets) }}` reduced
to key names is an exfiltration shape to GitHub's malicious-workflow detector, and the run was held
before any job started, reporting no status context at all — [`docs/incidents.md`](../incidents.md)
→ *A workflow reading `toJSON(secrets)` is held before any job starts*. Nothing in this research
changes that.

### What identity could

**Two, and both are documented.** GitHub publishes a repository permission named **"Secrets"**, for
GitHub Apps and for fine-grained personal access tokens alike, and it maps to exactly the call the
check makes:

| Endpoint | Access | Permission |
| --- | --- | --- |
| `GET /repos/{owner}/{repo}/actions/secrets` | read | **Secrets** |
| `GET /repos/{owner}/{repo}/actions/secrets/{secret_name}` | read | **Secrets** |
| `PUT` / `DELETE /repos/{owner}/{repo}/actions/secrets/{secret_name}` | write | **Secrets** |

([Permissions required for GitHub Apps](https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps?apiVersion=2022-11-28)
and [Permissions required for fine-grained personal access tokens](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens?apiVersion=2022-11-28),
both read 18 August 2026.) The endpoint's own reference adds *"Authenticated users must have
collaborator access to a repository to create, update, or read secrets"*
([List repository secrets](https://docs.github.com/en/rest/actions/secrets?apiVersion=2022-11-28)) —
which is a lower bar than the security-settings gap, and the reason this is the gap an App could
actually close.

**Read only, and only names.** Nothing in this changes what the check can catch: an Actions secret's
value cannot be read back any more than a Vercel Sensitive one can, so the comparison stays a set of
names either way. [`docs/infrastructure.md`](../infrastructure.md) → *What this check compares, and
what it cannot* already says so.

### `actions/create-github-app-token` is the standard answer, and this establishes it

**It is GitHub's, not a third party's.** `gh api repos/actions/create-github-app-token` on
18 August 2026 returns owner `actions`, owner type `Organization`, not archived, described as *"GitHub
Action for creating a GitHub App Installation Access Token"*; the latest release is `v3.2.0`,
published 2026-05-12.

**And GitHub's own documentation reaches for it by name.** The page *Making authenticated API requests
with a GitHub App in a GitHub Actions workflow* says *"you can use a GitHub-owned action as
demonstrated in the following example"* and the example is:

```yaml
      - name: Generate a token
        id: generate-token
        uses: actions/create-github-app-token@v3
        with:
          client-id: ${{ vars.APP_CLIENT_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}
```

with the surrounding prose stating the workflow *"uses the `actions/create-github-app-token` action to
generate an installation access token"*. So "when `GITHUB_TOKEN` cannot do X, mint an installation
token with a GitHub App" is not folklore: it is the documented route, in GitHub's own words, using
GitHub's own action.

**The tokens are short-lived and scopeable per run**, which is the part that makes it defensible where
a long-lived token is not:

- *"An installation access token expires after 1 hour"* (action README), matching
  *"The installation access token will expire after 1 hour"*
  ([Authenticating as a GitHub App installation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation)).
- *"By default, the token inherits all of the installation's permissions. We recommend to explicitly
  list the permissions that are required for a use case"* (action README) — narrowed with
  `permission-<permission name>` inputs, on top of GitHub's own rule that *"The installation access
  token cannot be granted permissions that the app was not granted"*.
- *"Unless the `skip-token-revoke` input is set to true, the token is revoked in the `post` step of
  the action, which means it cannot be passed to another job"* (action README).

**What it costs is not short-lived at all, and that is the whole objection.** The workflow must hold
the app's private key as an Actions secret, and GitHub states plainly: *"Private keys do not expire
and instead need to be manually revoked"*
([Managing private keys for GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/managing-private-keys-for-github-apps)),
which also records the rotation model — *"You can create up to 25 private keys for an app. You should
use multiple keys in order to rotate keys without downtime in the event of a key compromise"* — and
recommends storing the key *"in a key vault, such as Azure Key Vault"* rather than as an environment
variable, which is not available to a GitHub Actions consumer.

### The fine-grained PAT alternative, priced

**Same permission, worse identity, and an expiry to carry.** A fine-grained token with **Secrets:
read** reaches the same endpoint. GitHub's own guidance points away from it for this shape of use:
*"Personal access tokens are intended to access GitHub resources on behalf of yourself. To access
resources on behalf of an organization, or for long-lived integrations, you should use a GitHub App"*
([Managing your personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens),
read 18 August 2026). The same page records that *"Both fine-grained personal access tokens and
personal access tokens (classic) are tied to the user who generated them"*, that *"Each token is
limited to access resources owned by a single user or organization"*, that *"Infinite lifetimes are
allowed but may be blocked by a maximum lifetime policy set by your organization or enterprise
owner"*, that *"To provide additional security, we highly recommend adding an expiration to your
personal access tokens"*, and that *"GitHub automatically removes personal access tokens that haven't
been used in a year"*.

**An expiry is a tracked liability in this repository, not an abstraction.** `VERCEL_TOKEN` expires
2027-08-14 and [`docs/infrastructure.md`](../infrastructure.md) → *Why this one is account-scoped*
records the identity, the expiry and the reasoning; `scripts/check-docs.ts` compares that date against
Vercel on every run, in CI as well as locally, and needed a whole check plus a
last-used-token heuristic to do it, because a reissue leaves the replaced token live under the same
name. **A second dated credential inherits all of that**, and it is a real cost rather than a
rhetorical one. The App private key avoids the expiry by having none, which trades a dated liability
for an undated one — and an undated one is the kind this repository has no check for.

### Verdict: accept

**What would be bought:** the two names `MIGRATION_DATABASE_URL` and `VERCEL_TOKEN` compared on a
runner instead of on a laptop.

**What it would cost:** a GitHub App registration to own and document, a non-expiring private key
stored as an Actions secret, a third row in the credential roster, a rotation story, and a workflow
step — added so that a check about credential hygiene can verify a credential list that would then be
one entry longer because of it. That is the recursion **CAN-109 Decide whether the label roster check
needs enforcing, or is honest as it stands** already refused for the PAT route; the App route is
better in the ways this research establishes and does not change the arithmetic.

It is also the shape `CLAUDE.md` → *Engineering principles* rules out — "avoid speculative
abstractions, configuration, and indirection" — and
[ADR-0016](../adr/0016-provisioning-plain-api-keys-neon-excepted.md) generalises the same instinct
for vendors: ownership is the standing cost, and you pay it only for something a credential cannot
otherwise express. Here the credential *is* the thing being checked.

**What would change the verdict.** Not a better route — the route already exists and is documented.
It changes when the roster stops being two rows a single person sets, or when someone other than that
person can add a secret. At that point the local gate stops being a gate, because it depends on the
one person who could have caused the drift also being the one who runs the check.

## The security-settings roster

### Admin is the documented requirement, and it is stated three times

**GitHub's REST reference is explicit:** *"In order to see the security_and_analysis block for a
repository you must have admin permissions for the repository or be an owner or security manager for
the organization that owns the repository"*
([Get a repository](https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#get-a-repository),
read 18 August 2026). The same sentence appears on *List organization repositories* and *Create an
organization repository*. The repository object itself is otherwise a **Metadata** permission call —
so the endpoint is reachable by anyone and the block inside it is not, which is exactly what the CI
skip line describes.

**The check's other two calls split the same way**, and only one of them is already within reach:

| Call | Permission | Reachable from a runner today |
| --- | --- | --- |
| `GET /repos/{owner}/{repo}` → `.security_and_analysis` | Metadata for the object, **admin** for the block | Object yes, block **no** |
| `GET /repos/{owner}/{repo}/vulnerability-alerts` | **Administration** | **No** |
| `GET /repos/{owner}/{repo}/dependency-graph/sbom` | **Contents** | **Yes** — `contents: read` is a workflow scope |

The vulnerability-alerts endpoint states its own bar in the same terms: *"The authenticated user must
have admin read access to the repository"*, with `204` meaning enabled and `404` meaning not
([Check if vulnerability alerts are enabled for a repository](https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#check-if-vulnerability-alerts-are-enabled-for-a-repository)).
**That `404` is why the script reads the block first**, and why partial reach is worse than none: a
`404` from a caller who may not read the endpoint at all is indistinguishable from a `404` meaning
disabled. The script's comment and
[`docs/infrastructure.md`](../infrastructure.md) → *Dependency and secret scanning* already carry that
argument; this research confirms both halves of it against the pages cited there.

### The obvious alternative route is the same wall

**There is a newer endpoint, and it does not help.** `GET /repos/{owner}/{repo}/code-security-configuration`
exists, and its reference states *"The authenticated user must be an administrator or security manager
for the organization"*
([REST API endpoints for code security configurations](https://docs.github.com/en/rest/code-security/configurations?apiVersion=2022-11-28)).
Same bar, different path — and it would also be a rewrite of a check that currently reads the settings
where they actually live.

### Verdict: accept, and most firmly of the three

**Closing this needs the repository `Administration` permission**, which the fine-grained reference
describes as covering the ability to *"create repositories, manage branch protections, configure
Actions permissions, handle collaborators, and manage various security features"*. Even at `read`,
that is a standing grant over the settings surface of the repository whose ruleset is the merge gate
— granted to an app whose private key never expires — in order to compare seven prose rows.

**And it is not established that it would even work.** Every GitHub statement about
`security_and_analysis` is phrased in terms of a *user's* admin permission or an org role. No page
read in this research says an installation access token carrying `Administration: read` receives the
block. That is listed as **unverified** below, and it is decisive on its own: a credential whose
sufficiency has to be discovered by experiment is not a change to make on the strength of a research
document.

**What would change the verdict.** GitHub adding a read scope for this to the `permissions:` list. That
list is not static — it currently carries `artifact-metadata`, `code-quality` and `vulnerability-alerts`,
none of which are long-standing — so the right maintenance is to re-read the enumeration when this comes
up again rather than to treat today's sixteen as permanent.

## The label roster

### `orca` is genuinely unavailable, and Linear's API is genuinely reachable

The skip is honest: `spawnSync orca ENOENT`, because `orca` drives a desktop application on Jacob's
machine. **But the tracker is not unreachable — only that CLI is.** Linear publishes a GraphQL API,
documents personal API keys as the route for scripts (*"For personal scripts API keys are the easiest
way to access the API. Visit Security & access settings to create and manage them"*,
[Getting started](https://linear.app/developers/graphql)), and applies limits that a per-push check
would never approach: *"up to 5,000 requests per hour"* and *"up to 3,000,000 points per hour"* for
API-key authentication ([Rate limiting](https://linear.app/developers/rate-limiting)). So CI *could*
query Linear directly. The question is whether it should.

### Linear's key model has moved, and one document here still describes the old one

**This is the one correction this research produces.**
[`docs/agents/triage-labels.md`](../agents/triage-labels.md) → *Where this check gates, and where it
does not* records the refusal as: *"a personal API key is user-scoped and workspace-wide, and it would
need a roster row, an expiry and a rotation story of its own"*.

Linear's own documentation now says otherwise on the second point: *"For each key you create, you can
choose to give it full access to the data your user can access, or restrict it to certain permissions
(Read, Write, Admin, Create issues, Create comments)"* and *"You can also limit an API key's access to
specific teams in your workspace"*
([API and Webhooks](https://linear.app/docs/api-and-webhooks), read 18 August 2026). A key for this
check could therefore be **Read**, restricted to team `CAN`. Workspace-wide is no longer forced.

**The conclusion still holds, on the clause that survives.** The key remains tied to a user account,
still needs a roster row, and still exists only to gate eight strings. But the document's stated
reason is now half false, and a decision resting on a false premise is the failure mode this
repository's own audits keep finding — see
[tracker-and-repository-audit.md](tracker-and-repository-audit.md) and
[verification-sweep-16-august.md](verification-sweep-16-august.md). Rewrite the sentence to rest on
the cost argument alone, and note that scoped keys exist so the next reader does not rediscover it as
a reason to reopen.

### Does a tracker-label check belong in CI at all?

**Honestly: no, and this is the gap where "leave it" is not a concession but the right design.**

- **It is not a property of the commit.** Every other gate in
  [`docs/agents/workflow.md`](../agents/workflow.md) → *The gates* judges the code and the lockfile:
  nothing published overnight can turn `knip` red, which is the line that file itself draws between
  the five local gates and the two remote ones. A label roster fails when somebody renames a label in
  Linear, with no commit involved and nobody's push at fault. That is the "red on arrival" class this
  repository already refuses twice over — the `high` audit threshold, and the decision not to count
  down to `VERCEL_TOKEN`'s expiry, both argued on the grounds that a gate which is red for reasons
  outside the change is a gate that gets ignored.
- **The exposure is already asymmetric and the loud half is loud at the right moment.** The document
  inventing a label fails at the point of use, because `orca linear` cannot create a label definition.
  The silent half — the tracker gaining a label the document does not map — is handled by `/triage`
  simply having no role for it, which is what it already does with `Improvement` on purpose.
- **A runner is not a better reader than the laptop.** Both compare the same eight strings against the
  same tracker. The runner's only advantage is that it runs unprompted — and the local one is not
  unprompted either, because `/review-pr` runs it before every merge.

### Verdict: accept

Keep the check local. Correct the sentence. Do not buy a Linear credential.

**What would change the verdict:** labels becoming load-bearing for something automated beyond
`/triage` — at which point the roster stops being documentation and starts being configuration, and
configuration is checked where it is consumed.

## Half-measures considered and rejected

**Comparing the roster against `secrets.*` references in the workflow files.** Local source, no
credential, would run everywhere. Rejected: it changes what the check *means*. It would catch
"documented but never referenced" and miss "set but undocumented", which is precisely the silent
direction [`docs/infrastructure.md`](../infrastructure.md) → *What this check compares, and what it
cannot* names as how a roster goes stale. A check that reports green over the failure it was built for
is worse than a skip that says so.

**OIDC.** `id-token` is on the permissions list and GitHub's hardening guidance recommends it — *"If
your GitHub Actions workflows need to access resources from a cloud provider that supports OpenID
Connect (OIDC), you can configure your workflows to authenticate directly to the cloud provider. This
will let you stop storing these credentials as long-lived secrets"*
([Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)).
It is for third-party providers trusting GitHub's identity, not for widening GitHub's own token
against GitHub's own API. It reaches none of these three gaps.

**Making the skips fail instead.** Already answered, and answered correctly: a check whose source is
unreachable must not block every merge, and the job summary is what stops a skip reading like a pass
from a green tick.

## One adjacent thing, checked and already right

While enumerating the `permissions:` keys it was worth reading back what this repository actually
grants. `gh api repos/jacobrees-canoncore/CanonCore/actions/permissions/workflow` on 18 August 2026
returns `{"default_workflow_permissions": "read", "can_approve_pull_request_reviews": false}` — which
is what GitHub's hardening page recommends, *"set the default permission for the `GITHUB_TOKEN` to
read access only for repository contents. The permissions can then be increased, as required, for
individual jobs"*. [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) declares no
`permissions:` block and therefore inherits that default. **Nothing to do**, recorded so the next
reader does not have to check.

## Unverified

Everything below could not be pinned to a page owned by the party making the claim, or could not be
settled without an experiment this research did not run.

| Claim | Why it is unverified | How to settle it |
| --- | --- | --- |
| Whether a GitHub App installation token carrying `Administration: read` receives the `security_and_analysis` block | Every GitHub statement about that block is phrased in terms of a *user's* admin permission or an org owner/security manager role. No page read names an app permission that grants it | Register an app, install it with `Administration: read`, call `GET /repos/{owner}/{repo}` with the installation token. **Decisive for the security-settings gap** |
| Whether `gh secret list` works unchanged with an installation access token in `GH_TOKEN` | The REST endpoint's permission is documented; `gh`'s own behaviour under an app token was not exercised here | Mint a token with `actions/create-github-app-token` and run the command. Moot under this recommendation |
| Whether Linear personal API keys carry an expiry | [API and Webhooks](https://linear.app/docs/api-and-webhooks) documents creation, permissions, team restriction and revocation, and states no expiry either way | Ask Linear, or read the key-creation dialogue. Moot under this recommendation |
| Whether a Linear key restricted to **Read** and to team `CAN` can read that team's label set | The permission model is documented; this specific read was not performed | Create such a key and run the query. Moot under this recommendation |
| The exact GraphQL field for a team's labels | Linear's getting-started page shows no label example; the full schema is browsable only in Apollo Studio, which needs a browser | Browse the schema, or read the LinearClient types. Not load-bearing: the capability is established, only the field name is not |
| The "Fine-grained access tokens for this endpoint" paragraph on *List repository secrets* | That paragraph did not render in the fetched page; the **Secrets** permission mapping used above comes instead from GitHub's two permissions-reference pages, which are the pages that own the mapping | Read the endpoint page in a browser. The mapping itself is verified from a primary source either way |
| Whether GitHub will add a read scope for `security_and_analysis` to `permissions:` | Unknowable | Re-read the enumeration next time this question arises. Three of the sixteen are recent |
