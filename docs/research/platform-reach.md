# Platform reach: the facts worth keeping

**Trimmed 8 August 2026.** This was a 703-line assessment of Expo, react-native-tvos, Expo Web and
the one-codebase question. The decision is settled in [ADR-0005](../adr/0005-stack.md): a dedicated
Next.js web app, mobile later on the TV fork, TV last as its own app.

What remains is the material needed when mobile and TV are actually built. The Expo Web analysis is
cut, with its conclusion recorded here: `react-native-web` had no release between 2025-10-16 and
this assessment, Expo Router's SSR was alpha, and its RSC mode forced `output: "single"`, which is
why the web app is not an Expo app.

---

### 1.2 Versioning and how far behind core it lags

Versions follow `0.xx.y-z` where `0.xx.y` is the RN core release it derives from and `z` is the
fork's own increment.

| Package | Version | Published |
|---|---|---|
| `react-native` (core, `latest`) | **0.86.2** | 2026-07-27 |
| `react-native` (core, `next`) | 0.87.0-rc.4 | 2026-08-04 |
| `react-native-tvos` (`latest`) | **0.86.2-0** | 2026-08-02 |
| `react-native-tvos` (`next`) | 0.87.0-0rc3 | 2026-08-02 |
| `react-native-tvos` (`0.85-stable`) | 0.85.3-3 | 2026-06-26 |

**The lag is six days.** Core 0.86.2 landed 2026-07-27; the fork's 0.86.2-0 landed 2026-08-02. The
fork also ships release candidates in parallel with core (0.87.0-0rc3 exists while core is at
0.87.0-rc.4). The "the TV fork is always a year behind" folklore is out of date — I checked the
full publish history back to February 2026 and the fork has kept pace with every core minor.

Source: npm registry metadata for both packages, read 2026-08-08.

### 1.3 The SDK pairing that currently works

Expo now publishes the TV fork version in its official compatibility table
(<https://docs.expo.dev/versions/latest/>, section "Each Expo SDK version depends on a React
Native version"):

| Expo SDK | React Native | React | react-native-web | **React Native TV** | Min Node |
|---|---|---|---|---|---|
| **57.0.0** | 0.86 | 19.2.3 | 0.21.0 | **0.86-stable** | 22.13.x |
| 56.0.0 | 0.85 | 19.2.3 | 0.21.0 | 0.85-stable | 20.19.x |
| 55.0.0 | 0.83 | 19.2.0 | 0.21.0 | 0.83-stable | 20.19.x |
| 54.0.0 | 0.81 | 19.1.0 | 0.21.0 | 0.81-stable | 20.19.x |

Current Expo SDK is **57**: `expo@57.0.11` published 2026-08-06; `57.0.0` published 2026-06-30.

**So the answer to "name the specific pair that works": Expo SDK 57 with
`react-native-tvos@0.86-stable`.**

One caveat worth knowing before you trust that pairing blindly. Expo's official TV example
templates lag by one SDK. `expo/examples/with-router-tv` is still on `expo: ~56.0.3` /
`react-native-tvos@0.85-stable`; its last update was commit "Move TV templates to SDK 56"
(2026-05-21), i.e. before SDK 57 shipped. **The SDK 57 + 0.86-stable pairing is documented but
not yet demonstrated by a first-party template** — treat it as documented-but-unproven and be
ready to fall back to SDK 56 + 0.85-stable, which *is* demonstrated.

Since **SDK 56 and later**, upgrading the Expo SDK also upgrades the TV dependency automatically.
On SDK 55 and earlier you had to bump it by hand and add `expo.install.exclude: ["react-native"]`
to stop `npx expo install` validation fighting you. That is a real quality-of-life improvement and
a sign Expo is investing rather than tolerating.

### 2.5 Focus management — the actual architectural constraint

This is the correct thing to be worried about, and framing it as "architectural, not styling" is
right. On tvOS, focus is owned by **Apple's native `UIFocusEngine`**. You do not imperatively move
focus; you declare a focusable view hierarchy and supply hints, and the engine decides. Android TV
has an analogous D-pad focus system, which RNTV models the same way. The consequence: **your
component tree has to be authored so a focus engine can traverse it.** Components authored for tap
or click carry none of the required metadata, so this is not a prop you sprinkle on at the end.

**What the ecosystem gives you, in `react-native-tvos` itself** (all from the fork's README):

| Primitive | What it does |
|---|---|
| `Pressable`, `TouchableHighlight`, `TouchableOpacity` | Fully native focus events: `onFocus`, `onBlur`, `onPress`, `onPressIn`, `onPressOut`, `onLongPress`. Because focus/blur are native core events they respect capture and bubble phases on `View`. |
| `TouchableNativeFeedback`, `TouchableWithoutFeedback` | Respond to press but **not** focus/blur — the README says they are "not recommended for TV". |
| `hasTVPreferredFocus` | Forces initial focus onto a specific element. |
| `nextFocusUp/Down/Left/Right` | Explicit focus targets. Now works on tvOS, not just Android. **Caveat from the README:** if there is no focusable in that direction, iOS ignores the override. |
| `TVFocusGuideView` | Wraps Apple's `UIFocusGuide`, mirrored on Android TV. Props: `destinations` (array of components to register as targets), `autoFocus` (redirect to first focusable on first visit, then remember and restore the last focused child), `focusable` (false disables the whole subtree), `trapFocus{Up,Down,Left,Right}` (stop focus escaping a container). `destinations` takes precedence over `autoFocus`. |
| `TVTextScrollView` | Necessary because **a plain `ScrollView` will not scroll on Apple TV unless there are focusable items inside it or above/below it.** |
| `ScrollView` TV props | `snapToAlignment="item"` enables per-item snapping; children then set `scrollSnapAlign` (`start`/`center`/`end`) or `scrollSnapOffset` (per-item pixel offset, takes precedence). Plus `snapToItemPadding` and `scrollAnimationEnabled={false}` for instant focus jumps. |
| `VirtualizedList` / `FlatList` | Auto-wrapped in a `TVFocusGuideView` with orientation-appropriate `trapFocus`, so focus can't escape a list through a virtualization hole. New `additionalRenderRegions` prop (`{first, last}[]`) pins index ranges out of virtualization to stop blank regions. |
| `Platform.isTV` / `Platform.isTVOS` | Branch logic. `isTVOS` is Apple-TV-only; `isTV` includes Android TV. |
| Parallax | Native Apple-recommended parallax animations on focus, adjustable via view props. |
| NativeWind | Because focus/blur are real native events, Tailwind's `focus:` and `active:` pseudo-classes work. |
| Accessibility | Extra `accessibilityFocus` accessibility action on Android for TalkBack focus detection. |

That is a genuinely rich toolkit — richer than I expected, and it has been actively improved
through 2026 (the `scrollSnapOffset` and `scrollAnimationEnabled` props are recent additions
visible in the June–August 2026 releases).

**What you must still hand-build:**

1. **Focus choreography.** Which row takes focus on mount; what gets focus after a back
   navigation; per-row focus memory so returning to a carousel lands on the item you left. The
   primitives give you hooks; the policy is yours.
2. **Focus across virtualization.** `additionalRenderRegions` exists precisely because focus and
   list virtualization fight. You have to know your list's shape and hand-pin regions.
3. **Non-grid traversal.** Anything not on a clean row/column grid needs explicit `destinations`
   on `TVFocusGuideView` — hand-wired, per layout.
4. **"Snap to top" for focused items in lists** is an open feature request on the fork
   (issue dated 2024-12-21, still open).
5. **The ten-foot layout itself** — type sizes, hit-target density, overscan-safe margins, and a
   navigation model with no cursor and no scrollbar.

Third-party options, both worth knowing and neither an obvious win:

- **`react-tv-space-navigation`** (BAM) — JS-side spatial navigation. Last stable **5.2.0**
  (2025-07-10); `latest` on npm is **6.0.0-beta1** (2025-07-17). **No stable release in roughly
  thirteen months.** Treat as stale; do not adopt for new work.
- **`@noriginmedia/norigin-spatial-navigation`** — hooks-based spatial navigation, **3.3.0**
  published 2026-07-30, clearly actively maintained (3.0.0 → 3.3.0 across 2026). Primarily a
  browser/web-TV solution. *Whether it integrates cleanly with tvOS's native focus engine, as
  opposed to replacing it in JS, is **unverified** — I found no primary source on that.*

The honest summary: **for tvOS, use the native primitives in the fork and hand-build the policy.**
Reaching for a JS spatial-navigation library on a platform that has a native focus engine means
fighting the engine.

---

### 4.2 The TV monorepo tax — read this one twice

From Expo's TV guide, verbatim:

> If you have more than one Expo project in a monorepo, and **one of them is modified for TV, then
> all of them should be modified to use the React Native TV package** as described here, **even if
> some of the projects are not configured to target TV.** This avoids possible conflicts between
> the project dependencies, while still supporting mobile development fully on all the projects.

**One TV app forces the `react-native` → `react-native-tvos` alias onto every *Expo* app in the
repo.** Every phone app, and any later Expo target. **Not `apps/web`**: the rule's own scope is
"more than one **Expo project** in a monorepo", and a Next.js app that never depends on
`react-native` is not an Expo project and has no dependency to conflict. The root `resolutions` pin
still reaches its lockfile; the alias does not reach an app that never imports the package. Note
also that Expo says **should**, with a stated reason, rather than must.

Within that scope the cost is real. The apps will still build and work — the fork is a superset —
but every Expo app in the monorepo then depends on a one-maintainer fork of React Native core, and
each one's upgrade cadence is coupled to that fork's release schedule. This is the single most
concrete, most under-appreciated cost of "add tvOS to the monorepo", and it is stated by Expo, not
inferred by me. The narrowing is [frontend-design-scope.md](frontend-design-scope.md) →
*Web and native share three things*.

### 4.3 The mechanics of sharing

- **Platform extensions.** `.ios.tsx`, `.android.tsx`, `.native.tsx`, `.web.tsx`, resolved by
  Metro. Inside `app/`, a platform-specific route only resolves **if a non-platform version also
  exists** — Expo enforces this "to ensure that routes are universal across platforms for deep
  linking". So **the route graph must be common even when every screen's UI differs.** Outside
  `app/`, you put the variants in `components/` and re-export: `export { default } from
  '@/components/about'`.
- **TV-specific extensions.** RNTV's template ships a Metro config adding `.tv.tsx`,
  `.ios.tv.tsx`, `.android.tv.tsx`, resolving in that precedence order before `.ios.tsx` /
  `.tsx`. Note the README's caveat: this **"is not enabled by default, since it will impact
  bundling performance."** Opting into TV-aware resolution slows every build in the project.
- **Typical shape** (this is the pattern the templates and Expo's guidance converge on, though
  Expo does not prescribe it as such — *the "shared domain, separate UI" split is my synthesis,
  not a first-party recommendation*): `packages/` holds domain types, data access, validation and
  the API client in plain TypeScript; `apps/` holds one app per surface, each owning its own UI.

### 4.4 Where sharing actually breaks down

The break is not technical, it is product. A ten-foot TV interface and a phone interface and a web
page are three different products wearing the same data:

- **Input.** Web has a pointer and a keyboard. Phone has touch. TV has a D-pad and a focus engine
  that owns navigation. Every interactive component differs at the root, not at the leaf.
- **Density and distance.** TV is read from three metres; phone from thirty centimetres. Type
  scale, hit targets, information per screen — nothing transfers.
- **Navigation.** Web has URLs, a back button, deep links and a scrollbar. TV has rows, a focus
  cursor and a menu button. Expo Router demands a common route graph across platforms, which means
  you either contort the TV app into a web-shaped route tree or contort the web app into a
  TV-shaped one.
- **Concrete casualties.** No web view on tvOS, so no `expo-web-browser` and no OAuth redirect
  flow; gesture-driven interactions have no analogue; `ScrollView` needs focusables to scroll at
  all.

What genuinely shares across all three: **domain model, types, validation, data-fetching client,
formatting and business rules.** That is the shared layer — and note that it is plain TypeScript,
so **it shares just as well between a Next.js web app and an Expo TV app as it does between two
Expo apps.** The unique benefit of an all-Expo monorepo is shared *UI components*, and shared UI
components across web + phone + TV is largely a mirage for exactly the reasons above.

That observation is what collapses the decision.

---

## 5. Cost and complexity of tvOS specifically

### 5.1 Do you need a paid Apple Developer account?

**To run on a real Apple TV: no, but with sharp teeth.** From Apple's own membership comparison
(<https://developer.apple.com/support/compare-memberships/>), a free Apple Account gets you Xcode,
downloads, documentation, forums, and:

> …as well as **test your apps on devices**.

Via the "Xcode Personal Team", with these limits quoted verbatim:

> - The number of App IDs that can be registered to your account at one time is limited to **10
>   and each expires after 7 days**.
> - The number of test devices that can be registered to your account for each platform is limited
>   to **3 and each expires after 7 days**.
> - Provisioning profiles will expire **7 days from issuance**, which may require you to rebuild
>   and re-install your app to your device after expiration.

So: free account, real Apple TV hardware, **and you re-sideload from Xcode every seven days,
forever.** For an audience of one that is technically viable and practically grating.

**The $99/year Apple Developer Program is required for:** App Store distribution, **TestFlight**,
App Store Connect, custom/enterprise distribution, notarisation.

For an audience of one person, **TestFlight is the real reason to pay** — it turns "plug in a Mac
every Sunday" into "the app is just installed". $99/year to avoid a weekly chore for a
single-user app is a judgement call, not an obvious yes.

**The simulator needs no account at all.** `expo run:ios` against the Apple TV simulator is free
and unlimited.

### 5.2 The rest of the bill

- **A Mac is mandatory.** Xcode 16 or later, plus **tvOS SDK 17 or later, which is not installed
  with Xcode** — you fetch it separately with `xcodebuild -downloadAllPlatforms`. There is no
  Linux or Windows path to a tvOS binary. (EAS Build's macOS workers can compile for you, which is
  how the cloud-build route sidesteps owning a Mac; *whether the full local dev loop is workable
  without any Mac is **unverified***.)
- **Minimum OS:** tvOS 15.1 (`tvosDeploymentTarget` defaults to `'15.1'`).
- **Seven exact-size brand images** if you use `appleTVImages`, all mandatory together, or
  prebuild throws.
- **The provisioning-profile gap** from §1.6 — EAS does not create tvOS profiles; you do it by
  hand at Apple, or you use local credentials.
- **App Store review** applies identically to tvOS if you distribute publicly. For one user you
  would never go near it — TestFlight or sideloading is the whole story.

### 5.3 What this adds up to

For an audience of one person, shipping to a real Apple TV costs: a Mac, Xcode plus a separate SDK
download, either $99/year or a weekly re-sideload, a manual provisioning-profile dance, seven
bespoke image assets, and a from-scratch focus-driven UI. **And at the end of it, the artefact
cannot be linked to.**

---

