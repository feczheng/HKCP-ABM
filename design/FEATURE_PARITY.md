# Current Workbench: Feature And Statistics Map

Updated 2026-09-08. Current application V12.14.1; predecessor V12.14.

V12.14.1 keeps all fourteen views and live statistics. It corrects same-anchor
OD accounting and stale audit state, keeps route focus on 3D re-entry/resize,
and adds an OSM audit legend separate from Agent states. No network travel
means no 3D network-overlay button. Evidence: `evidence/v12-14-1/`.
OSM also refits audit paths on resize and re-entry with room for its controls
and legend; this does not change normal non-audit map zoom behavior.

V12.14 retains every view below and adds a fourteenth: Evidence / Cross-region
routes. It provides independent source-backed mainland OD queries, paired
2D/3D estimates, source elevation, JSON export and labelled OSM/3D overlays.
It never replaces live Agent trips or adds results to live statistics. Its
charcoal 3D trace is network-only, excluding unverified access connectors.
The lazy 3D route fit is applied after geography initialization, and selected
traces render above translucent ground. Regression evidence is under
`evidence/v12-14/`; the existing full-day simulation is identical to V12.13.

V12.13 retains the 13 views below and adds Whole HK (452 DCCAs) to Study
region. The live inspector reports five cohort counts, represented population,
single-age sampling error, unresolved homes and all walking attempts/blocks.
Route quality distinguishes whole-HK live attempts from realised-route
histories. Validation and Kowloon lab retain their explicitly regional
historical evidence, not new whole-HK validation. 3D renders five graph
display samples under one 90,000-edge budget; exact routing is unchanged.
Original A retains the prior layout over the current shared code. Exact
historical engines are available from their frozen Previous Versions folders.

V12.12.2 only adjusts Map explorer wheel input: 120 pixels moves 0.25 zoom
level (maximum 0.35 per event). Zoom buttons remain one-level steps. The
V12.12.1 retention evidence below is unchanged; 24 additional wheel/basemap
checks are in `evidence/v12-12-2/wheel-qa.json`.

| Original view | Current navigation | Preserved content |
| --- | --- | --- |
| OSM | Observe / Map explorer | Basemap, Agent clusters, schools, POIs, density, routes, flows, selection |
| 3D | Observe / 3D environment | Live XYZ Agents, footprint samples, network display, selection, height display |
| Map | Observe / Boundary map | District/DCCA polygons, activity states and linked selection |
| Agents | Observe / Agent journeys | Cohort filters, individual follow, route audit, journey readouts |
| Buildings | Observe / Building atlas | Regional distribution and individual building viewer |
| Comparison | Analyse / 2D / 3D comparison | Existing paired comparisons and outcome tables |
| Stats | Analyse / Activity outcomes | Existing activity statistics and plots |
| Rules | Analyse / Behaviour rules | Existing interaction rules and scenario parameters |
| Route QA | Evidence / Route quality | Route diagnostics, purpose filters, critical-route shares |
| Terrain QA | Evidence / Terrain reliability | Source-3D and bounded sensitivity evidence |
| Validation | Evidence / Validation | Existing calibration/holdout evidence |
| Kowloon Lab | Evidence / Kowloon lab | Regional experiments, selection and area inspection |
| Expansion | Evidence / HK coverage | Regional coverage and graph evidence |
| New in V12.14 | Evidence / Cross-region routes | Mainland source OD audit, independent 2D/3D paths, elevation and modelled trip activity |

## Controls And Metrics

- Study region remains in the header; focused area is in the live inspector.
- Scenario, population and seed remain in Simulation settings (top-right).
- Play/pause, reset, time and speed remain in the bottom bar.
- Activity Mix and Modelled Physical Activity (including MVPA) remain in the
  live inspector. Other original metric sections are expandable below them.
  The inspector button is available in every view; analysis pages open it as
  an overlay without permanently reducing table/chart space.
- Layers and full symbol legend are available from the layers button in Map
  explorer, Boundary map and 3D environment.
- New basemap selector is at the upper-left of Map explorer. Switching it does
  not change scope, Agent state, simulation time, seed, focus or camera.

## Important Differences, Not Missing Science

The new WebGL renderer is not pixel-identical to the old projected-canvas 3D
view. It uses real proportions with optional 3x/10x vertical display emphasis.
Existing building samples and density cells are not complete fine-grained city
meshes. The ground is administrative geography, not a DEM. Regional network
display is sampled; routing still uses the full unchanged graph.

Aggregated flows and transport-node markers remain in Map explorer and the
original interface, not the new WebGL view. Direct school/POI inspection is
available in Map explorer/Boundary map. WebGL directly selects Agents/DCCAs.
Thus all original model capabilities remain accessible, but not every old
visual layer or hit-target is duplicated in the new 3D renderer.

Charcoal selected-route traces can include access connectors. The amber point
is a replay marker, not a new Agent. Detailed segment evidence is in Agent
journeys / Route audit. Replay is a visual traversal, not a rerun of the model.

## Evidence

- 13 view layouts checked at 1440x960 and 390x844.
- 135 baseline metric/control DOM fields present; none missing.
- 54 browser checks passed, including failure recovery, preference persistence,
  retained model/camera state and 3D selection/replay; no runtime errors.
- Six desktop/mobile framing checks plus orbit/live-motion checks passed.
- 494 engine/data files identical to V12.12; original `classic.html` identical.
- These checks establish UI retention and internal consistency, not external
  validation of the ABM's scientific accuracy.

Machine-readable reports: `evidence/v12-12-1/browser-qa.json`,
`evidence/v12-12-1/framing-qa.json`, `evidence/baseline-integrity.json`.
