# Droplet: water-focused product roadmap

Status: product direction approved on 2026-09-16. Implementation proceeds in
checkpoint commits; the interface proposal is reviewed before replacing the
existing screens.

## Implementation checkpoints

1. **Experience proposal:** clickable guest/account layout and screen inventory.
2. **Measured-data foundation:** additive schema, ingestion and public current/
   recent readings; account-protected extended history. Existing screens remain
   compatible. Stop here for review before the interface replacement.
3. **Public water release:** replace screens, remove AI/unrelated climate, and
   retire legacy/demo production paths together.
4. **Accounts:** saved/default places and detailed history interface.
5. **Release verification:** migration rehearsal, usability review and rollout.

Each checkpoint is committed independently. No production deployment is implied
by a development checkpoint. See [implementation notes](water-implementation.md)
for completed work, verification and remaining dependencies.

## Product direction

Droplet helps people understand water conditions around places they care about
in Germany. The public experience answers three questions: How is the water
level? Has it changed? How much has it rained?

Signing in adds saved places and deeper exploration. It should preserve the
same simple interface, with detail opened deliberately rather than added to
every screen automatically.

Recommendation: remove AI completely. Short descriptions such as “Below the
low-water reference” and “Up 8 cm since yesterday” can be generated from
verified measurements and explicit rules, without an AI service or API key.

## Scope

| Keep and improve | Remove from the product | Move out of ordinary navigation |
| --- | --- | --- |
| Observed water levels, measured rainfall, recent changes, water history, place search and map | AI analysis and saved AI history UI, forecasts, CO2, air quality, sunlight/UV, evaporation scores, blended overview/confidence/visibility scores | Ingestion, cache, worker, and source diagnostics |

Keep observation times, source attribution, and missing/stale-data notices
available to everyone. Operational diagnostics belong in operator tooling;
they are not a benefit of an ordinary account. Keep infrastructure health
checks even when removing the public Health page.

This release is not a water-quality, swimming-safety, drinking-water, reservoir
capacity, or flood-warning service. Those require different data and scope.

## Public and account experiences

| Capability | Guest | Free account |
| --- | --- | --- |
| Browse places and current water conditions | Yes | Yes |
| Latest gauge reading, plain-language condition, recent change, 24-hour rainfall | Yes | Yes |
| Observation time, station identity, source link, unavailable/stale status | Yes | Yes |
| Brief recent trend, proposed as 24 hours where available | Yes | Yes |
| Extended water/rainfall charts and date ranges | Preview | Yes, where real observations exist |
| Reference lines, measurement details, and data table | Preview | Yes |
| Save places and choose a default place across devices | No | Yes |
| Compare saved places with their own reference ranges | No | Yes; after the first account release |
| Export observations | No | Later, if useful |

The account promise: “Save your places and explore their water history.”
Use one contextual sign-in invitation when someone saves a place or opens
extended history. Avoid repeated locked cards on the public dashboard.

## Information and visual design

- Navigation: Explore, My places, Account. History lives inside a place's
  details rather than requiring a separate operations page.
- Default view: map/search plus a compact selected-place card. Offer a list
  alternative on mobile and for accessibility.
- A card shows the river and gauge name, a condition label, measured level,
  recent change, and rainfall over an explicit period. Put explanations behind
  a details control and small “What does this mean?” affordance.
- Replace index percentages with measurements: centimeters for gauge level,
  millimeters for rainfall. Explain that gauge level is relative to the
  station's reference point, not river depth.
- Use states to find places. A representative gauge must not be presented as
  a measurement of all water in the state. Defer state-wide color summaries
  until there is a defensible aggregation method.
- Avoid ranking gauges by raw centimeters: different gauges have different
  reference points. Compare change over time and source-defined conditions.
- Use color together with words/icons. “High water” must not appear healthy
  simply because its number is larger.
- Show a single concise age label in the overview; keep water and rainfall
  observation periods explicit when they differ. Details stay collapsed even
  after login.

## Delivery roadmap

### 1. Agree on the experience

Create a small screen inventory and low-fidelity desktop/mobile mockups for
Explore, a place detail, and My places, including signed-out states. Agree on
the access table above, naming, condition labels, and what counts as a place.

Exit criterion: someone can identify the selected gauge, understand its
condition, and find rainfall without reading explanatory paragraphs. Review
this design before rebuilding the interface.

### 2. Make measurements trustworthy

Introduce a migration-backed observation model with stable station IDs,
location/water-body metadata, raw level in cm, reference values and their
provenance, water observation time, rainfall in mm with its time window and
weather station, and explicit availability/quality states. Derive conditions
from supported source classifications or documented station references.

Calculate recent changes from comparable observations at the same station and
datum. Missing history means no change estimate, not zero. Preserve independent
water and rainfall availability; a failed weather source must not hide valid
water data.

Disable synthetic production fallbacks and automatic demo-history generation.
Keep demos explicitly separate. Show last known observations with their age,
or unavailable when no usable observations exist. Audit existing history:
the current seed path can label synthetic readings with real source names.
Do not assume those labels prove that a historical record is measured.

Existing clamped water indices cannot reconstruct original gauge readings.
Retain legacy records separately, start collecting the new measurements, and
backfill only where verified upstream observations and compatible station
metadata are available. History queries need date ranges and aggregation;
the existing 365-record cap does not represent 365 days at frequent sampling.

Exit criterion: low water, genuine zero rainfall, missing readings, stale
readings, station changes, and incomplete history remain distinguishable.

### 3. Release the simple public water experience

Implement the approved Explore and place views on the new observation API.
Remove climate and forecast panels, AI navigation/screens/API calls, irrelevant
scores, and technical dashboard text. Retain rainfall ingestion when removing
the broader climate subsystem.

Remove unused backend AI/climate/forecast routes, services, scheduled jobs,
client queries, dependencies, and environment settings, including Gemini key
configuration. Check shared imports before deletion. Retire old routes with
an intentional redirect or clear response rather than broken navigation.

Keep the current authentication provider; redesigning identity infrastructure
is outside this release. Archive existing AI records pending an explicit
retention decision rather than dropping stored user data during UI cleanup.

Exit criterion: the public journey has no AI calls, unrelated climate requests,
or synthetic production readings; it works without a Gemini key.

### 4. Give accounts a useful purpose

Add saved places, a default place, and available extended history with reference
lines and an optional observation table. Store preferences per authenticated
user so they work across devices. Replace identity-provider jargon and subject
IDs on the account page with useful settings.

Enforce account-only access in backend endpoints, not just hidden frontend
panels. Separate public and account responses and their caches, and clear
private cached data on logout. Saved places must be isolated by user identity.

Exit criterion: a user can save a place, sign in elsewhere, and find it with
its detailed history. Guests still get a complete current-conditions view.

### 5. Validate and roll out

Test the core journey with casual users: find a place, explain its current
condition, read rainfall, and find history. Check mobile layout, keyboard
access, color-independent statuses, empty states, and slow/offline behavior.

Validate ingestion and migrations on a staging copy, including legacy/demo
history handling and rollback. Verify guest/account API boundaries and user
isolation. Deploy compatible data/API changes before the new frontend, then
retire obsolete services/configuration and update deployment documentation.

Exit criterion: successful deployment and rollback checks, healthy ingestion,
verified live-source samples, and no misleading defaults when data is absent.

## First release and later work

First release: water/rainfall measurements, the simpler public interface, AI
and unrelated climate removal, saved/default places, and available detailed
history. Delivery can be incremental, but login should not be marketed as
valuable until its replacement features are usable.

Defer multi-place comparison, exports, notifications, more station coverage,
and seasonal context until the core experience is clear and the measured
history supports them. Do not add alerts or predictions to fill the space
left by AI.

## Decisions before implementation

1. Remove AI entirely: recommended.
2. Keep current measurements public; reserve extended exploration and saved
   places for accounts: recommended.
3. Organize around named gauges/places, using states for discovery rather than
   pretending to have state-wide water measurements: recommended.
4. Validate mockups first, then implement the trustworthy measurement model
   before account-only detail: recommended sequence.

Effort estimates should follow the screen review and legacy-history audit;
the data migration is the main uncertainty, not the removal of UI panels.
