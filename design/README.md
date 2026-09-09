# Current Research Workbench

Owner-adopted interface, 8 September 2026; current runtime V12.13.
Predecessor: V12.12.2, commit `1ec6841c7680126afba8365b38d53accdde7adba`.

V12.13 adds a default 452-DCCA whole-HK shared cohort and a live population/
attempt audit. Five regional scopes and the 13 views remain. All five graphs
must load before cohort creation; initialization is paused. 3D combines their
display samples with a territory-wide 90,000-edge budget, without reducing
the routing graph. Administrative surfaces are batched, retaining DCCA
triangle-level picking. Cross-pack travel remains unimplemented.

`classic.html` is the original layout using the current engine, not an exact
frozen V12.12 engine. Previous Versions contains the exact historic snapshots.
Current evidence: `evidence/v12-13/` (synthetic raster fixtures).

The original B experiment remains frozen at `abm-ui-b-2026-09-06-workbench`.
The current UI adds five basemap options and selection/inspector fixes. The
default is OSM Gray. A complete navigation/statistics mapping and explicit 3D
differences are documented in `FEATURE_PARITY.md`.

V12.12.2 refines wheel input in Map explorer only: normalized, fractional
zoom with a per-event cap and integer native tile levels. The existing camera
center, zoom buttons and all scientific state are retained. Targeted evidence:
`evidence/v12-12-2/wheel-qa.json` (24 checks passed).

## Compare A And B

- Current: [Research workbench](http://127.0.0.1:8030/)
- A: [Original interface](http://127.0.0.1:8030/classic.html)

Use the same scope, seed, population and scenario in each page. Reset and pause
at comparable simulation times. The two pages run independently; their clocks
and random streams are not synchronized by an A/B testing service.

## Design Changes

| Area | Design B |
| --- | --- |
| Navigation | 13 views grouped into Observe, Analyse and Evidence |
| Main canvas | Unframed map with separate toolbar and persistent day controls |
| Parameters | Region in the header; experiment settings in a modal |
| Selection | Agent/DCCA search; contextual inspector; linked journey and audit |
| Time | Play/pause, reset, day seek and speed together in a bottom transport bar |
| Layers | On-demand layer controls, state key, school stages and POI shape key |
| Agent journeys | Separate toolbar, map, readout and expandable evidence legend |
| Analysis | Full-width workspaces with consistent type, spacing and colours |
| Small screens | Compact navigation, optional filters/inspector, visible Agent map |
| 3D | Local Three.js, OrbitControls, live Agent positions, explicit vertical scale |

## Scientific Boundaries

`app.js`, `styles.css`, both routing engines and all existing data files are
unchanged from the frozen baseline. `classic.html` equals its original
`index.html` byte-for-byte. The alternative moves the existing controls and
wraps presentation functions only. It does not adjust MVPA accounting, trip
generation, path costs, Census weights, calibration or random-number calls.

The new 3D canvas combines the existing official footprint **sample** with flat
aggregated density cells and current Agent XYZ coordinates. Region display
edges are capped at approximately 90,000; the existing routing engine still
uses the full graph. Pilot views use the pilot graph. The pale base is an
administrative-area surface, not surveyed terrain or a complete city mesh.
The height selector is a visual factor of 1, 3 or 10, with no computational
effect. Schools and POIs retain the original symbol vocabulary. This trial
does not add aggregate flow lines or transport-node markers to the new WebGL
canvas; those layers remain available in the original map views.

## Local Dependencies And Privacy

- Three.js 0.179.1, local modules and OrbitControls, MIT license in `vendor/LICENSE`.
- Lucide 1.8.0, locally bundled UMD icons, license in `vendor/LUCIDE_LICENSE`.
- OSM raster and optional OpenTopoMap are the online tile sources. All model/data
  assets are local. No project upload, hosting deployment or analytics added.
- Runtime-only current app: `Current Version/`. It excludes private
  owner notes, raw TCS/POI downloads, proposal files and Git metadata.

## Reproduce And Verify

```sh
node scripts/package_current_workbench.mjs
python3 -m http.server 8030 --bind 127.0.0.1 --directory "Current Version"
node scripts/validate_current_workbench.mjs
node scripts/validate_workbench_framing.mjs
node scripts/verify_workbench_baseline.mjs
```

The test scripts use installed Chrome with an isolated headless test profile
and intercept raster tile requests with fixtures, not bulk public tile access.
Set `PLAYWRIGHT_PATH` to a local Playwright package if needed. Browser evidence
is in `design/evidence/browser-qa.json`, with screenshots of all 13 views at
1440 x 960 and 390 x 844. Checks cover controls, selection, 3D pixels, orbiting,
live movement and representative regional/pilot scopes. This is UI and internal
integration QA, not new external validation of the scientific model. The final
record contains 45 browser checks, six desktop/mobile 3D framing checks and
494 unchanged baseline engine/data files. All passed; no page errors were
reported. The camera-framing report is `evidence/framing-qa.json`.

The original 45-check B report above is retained as historical evidence. Current
evidence is in `evidence/v12-12-1/`: 54 browser checks and seven framing/motion
checks passed. The current baseline-integrity check still covers 494 unchanged
files. Fixture screenshots are not real basemap images. Owner approval to use
the workbench was received on 2026-09-08; it is now the default local interface.
