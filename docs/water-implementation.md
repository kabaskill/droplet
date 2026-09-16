# Water release: implementation checkpoints

## Checkpoint 1: experience proposal

The product direction is approved. The [clickable proposal](prototypes/water-experience.html)
is a design-review surface, not the production app. All values and trends in it
are explicitly illustrative. It makes no network/API requests.

Serve the repository root with `python3 -m http.server 4174 --bind 127.0.0.1`
and open `/docs/prototypes/water-experience.html`.

Screen inventory:

| Screen | Default | Deliberately opened detail |
| --- | --- | --- |
| Explore | Search, place list/map overview, named gauge, condition, level, recent change, rainfall | Meaning of the gauge; account-only extended history |
| My places | Saved places and default-place control, or one sign-in invitation | Open a saved place |
| Account | Sign-in/account settings without provider jargon | Existing identity provider's profile/password controls |

Review the guest/member switch, search, saving a place, choosing a default,
opening history, and the mobile layout. The map is a geographic overview in
this proposal; selection uses the list. Interactive gauge markers will follow
once actual station metadata is wired into the production interface.

## Checkpoint 2: measured-data foundation

In progress. The new observation path will be additive and separate from legacy
score history. The existing interface and legacy paths remain until checkpoint 3.
No checkpoint deploys changes to Jarvis automatically.
