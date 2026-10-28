# Droplet environmental data research

Research date: 28 October 2026. Geography: Germany first, following the current app.
Status: initial source research for discussion; no implementation or replacement roadmap approved.

The subsequent [implementation plan](implementation-plan.md) is the current draft for review. Its narrowed scope and checkpoints take precedence over this catalogue's broader candidate list. Creating that plan does not mark any implementation checkpoint complete.

All three access tiers will initially be free. The professional tier is intended to serve journalists and climate professionals and build credibility. Pricing, billing, and monetisation are outside the current objective.

## Follow-up: narrowed scope and product direction

The subsequent discussion narrows active investigation to PEGELONLINE, DWD, UBA air data, EEA water/bathing datasets, the supplied WasserBLIcK drinking-water workbook, and UFZ drought products. Other state/utility integrations and climate-history features are deferred. The broader source catalogue below remains reference research, not a proposed launch checklist.

The user priorities are a clear first view with substantive context, reliable normalization, backend changes appropriate to the new sources, reuse of existing map geography, and early German localization. All three tiers remain free.

### Workbook sample changes the drinking-water assessment

Read only workbook metadata, its header, and seven sample records from `/home/flinte/Downloads/Trinkwasser.xlsx`. It has one sheet, `Überschreitungen`, whose reported dimensions are 2,856 rows including the header and 20 columns. The file was not modified or fully audited.

Headers include reporting year/type, water-supply-area ID/name, point coordinates, municipality codes, parameter, units, maxima, medians, analysis counts, and counts of exceeded analyses. This is structured around historical exceedance reporting. It must not be treated as a complete routine-quality dataset or a current drinking-water assessment. Absence from the table cannot establish compliance.

Sample records also show that municipality codes can contain multiple comma-separated values. Codes need to remain identifiers, including leading zeroes. Supply-area point coordinates do not describe supply boundaries. The volume column's definition and scale need documentation before use; do not infer its unit conversion from sampled values alone.

Appropriate possible use: historical reported exceedances with year, parameter, counts, and coverage explained. Current local tap-water composition remains unsupported by this workbook alone. Under the narrowed national-source scope, drinking and bathing water may initially provide dated reporting context rather than current local advice.

An eventual import should retain the source file, content hash, published reporting period, import version, and schema version. Scheduled update checks should separate `lastCheckedAt` from the reporting year. Conditional HTTP requests can reduce transfers if supported; content hashes detect actual revisions. Validate changed files before promoting them and invalidate dependent views after a successful import. Keep the previous valid release if an update fails validation. This is an ingestion requirement for later implementation, not a request to create a chat automation now.

### Simplicity through progressive detail

Proposed first-view structure: a selected place, one primary map topic, and two or three concise findings. Each finding should contain a condition, a useful measurement/comparison, and the relevant place/time. Other topics remain easy to open without competing on the map simultaneously.

Illustrative wording, with invented values: “Below this gauge's published low-water reference; down 8 cm over approximately 24 hours.” A topic detail can show the actual level, reference definition, source, station, and short chart. The professional view can expose full available series, tables, methods, and exports.

Avoid a single environmental score or blanket good/bad interpretation. Low river levels, poor bathing quality, soil drought, and pollution mean different things. Navigation effects should only appear where the relationship is documented. Weather and drought can provide adjacent context without asserting that one caused the other.

### Normalization and interpretation are separate responsibilities

Normalization should preserve canonical values/units, source and entity IDs, geographic scope, time or reporting period, measurement/model/report type, quality state, and revision provenance. Topic-specific fields remain necessary: air averaging periods, gauge references, soil depth, and annual reporting counts cannot be flattened into one universal observation.

A separate deterministic interpretation layer should derive comparisons and findings from that evidence. Give each rule a version and minimum-evidence requirements. Preserve missing versus zero, censored values, provisional records, station/datum changes, and ambiguous place assignments. Stable finding codes plus numeric parameters and evidence references allow identical reasoning in English and German.

### Backend implications found in the current code

The current water routes do not use the old computed snapshot system or Redis response cache. They assemble responses from measured observation tables. Celery refreshes water/rainfall on a default 30-minute schedule. The frontend refetches its region query every minute; the query client has a default two-minute stale time. Water responses use `private, no-store`. Redis cache utilities and old snapshot code exist elsewhere, but are not the current water read path.

Recommended direction for later design:

1. Source adapters independently ingest and validate their own data. A failed air update must not block valid river observations.
2. Persist source-specific observations and versioned reporting datasets, keeping their original temporal meanings.
3. Associate cities with relevant gauges, stations, grids, bathing sites, or reporting areas through explicit place relationships. Avoid making a discovery state the identity of a measurement.
4. Build a versioned place overview from the latest usable evidence in each topic. It is a composed view with different source times, not a claim that all readings were measured together.
5. Cache overview, map, and history responses separately where worthwhile. Rebuild/invalidate affected views on committed source changes and interpretation/place-mapping changes. Keep private preferences isolated.

Source update frequency, source-data age, and cache age are three separate concerns. A rebuilt cache does not refresh an old sample. Fast gauge observations and annual reports need different refresh/availability policies; source failures should preserve clearly dated last-known values.

Shared cached evidence should generally be independent of language. Include response/normalization versions and relevant place, query, and access scope in cache identity. Add user identity only for user-specific content, and locale only where cached text is actually localized. Recalculate age-dependent statuses when serving or bound cache lifetime to the next freshness transition.

No choice between extending existing tables and introducing additional domain tables is approved yet. No full backend rewrite is implied.

### Reuse map geography at the appropriate scale

Existing SVG, GeoJSON, and tile data can supply the base geography. Correct alignment still requires known projection/coordinates and compatible city/river/lake features. A decorative outline SVG alone does not provide those relationships.

[Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/) offers public-domain geography; its [river documentation](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/) describes generalized overview data. [OpenStreetMap](https://www.openstreetmap.org/copyright) offers more detailed reusable geography under its attribution/share-alike terms, with separate hosted-service policies. No map renderer or provider is selected.

At national scale, prioritize major cities and a small number of selected-topic summaries. Reveal more locations and individual source markers with zoom or selection. Do not use city-wide colors to imply uniform conditions without a defensible aggregate. Reusing geography does not fill gaps in environmental measurements.

### German localization belongs in the foundation

Prepare English/German message catalogues and locale-aware number/date/relative-time formatting before expanding the interface. Translate whole messages with parameters and plural handling, including chart labels, legends, errors, empty states, keyboard/accessibility text, and finding explanations. Keep canonical numeric values and timestamps in the API; avoid preformatted English values or English sentences as domain state.

Provide an explicit language selector and remember the preference. Browser language can select an initial default; language and display timezone remain distinct settings. Retain original proper names/source wording where appropriate and provide localized explanations separately. Check German text expansion on mobile and define an explicit fallback for untranslated messages.

The proposed next discussion artifact is one English/German place-overview example and its evidence/normalization contract. Agree on what a person should understand from it before choosing the first implementation checkpoint.

## Main findings

Droplet can expand substantially using public environmental data. The strongest near-term source families are river observations, weather, and air quality. Bathing water and drinking water provide strong everyday value, but require more regional integration and careful location matching.

The opportunity is to connect understandable local summaries with evidence that professionals can inspect and cite. More measurements alone will not establish credibility: timestamps, coverage, methods, revisions, and original sources matter just as much.

Four different things must remain distinct:

- Drinking-water composition in a supply area.
- Official bathing-site assessments and restrictions.
- River and groundwater quantity.
- Ecological and chemical condition of natural water bodies.

None can stand in for another. A river's level does not establish bathing suitability; groundwater contamination does not directly describe treated tap water.

## What the repository already provides

Inspected the current working tree, including existing uncommitted work. Application files were not changed for this research.

- Production is the measured-water experience described in `docs/water-implementation.md`.
- `backend/services/water_catalog.py` contains 15 verified gauge IDs associated with state discovery entries. Thuringia deliberately has no unsuitable substitute gauge.
- `backend/services/water_sources.py` ingests gauge observations and complete DWD rainfall windows independently, preserving measurement identities and missing-data states.
- Current functionality includes recent/public observations, authenticated extended history, and saved/default places.
- Legacy UBA air-quality and broader weather modules remain as reference code. They include source selection and normalization work, but also older blended scores and model fallbacks that need review before reuse.
- `frontend/src/components/app/WaterMap.tsx` uses a state-outline SVG with D3 interactions. City discovery and geographic data layers require additional geographic data, not just more markers.

Earlier roadmap exclusions reflect the previous release. This document investigates the broader direction requested on 28 October; it does not silently rewrite those historical decisions.

## Candidate data at a glance

Readiness below is a research judgement, not a delivery estimate. “Strong candidate” means useful access is documented; it does not mean an integration has been tested.

| Data family | Everyday question | Professional use | Coverage / cadence | Research assessment |
| --- | --- | --- | --- | --- |
| River levels and discharge | Is the nearby river unusually low or high? | Event timelines, low-water duration | Federal network; station-specific readings | Strong candidate; extend current foundation |
| Navigation context | Could low water constrain freight? | Shipping context alongside river history | Selected gauges and river sections | Useful; keep restrictions, depth, and gauge level distinct |
| Drinking-water analysis | What is in my supplied water? | Parameter comparisons and reporting | Utility/supply-area reports; variable publication periods | High value; local mapping and reuse need work |
| National drinking-water archive | What has been reported historically? | Cross-area research | Government-described 2020–2024 archive | Important lead; contents not inspected |
| Bathing-site annual quality | How has this monitored site performed? | Historical comparison | Germany/EU; annual classification | Strong baseline; historical context |
| Bathing-site current assessment | Are there published warnings at this site? | Restrictions and seasonal timelines | State/local services; seasonal updates | Strong regional pilot candidate |
| River temperature and chemistry | Is this river warm or under stress? | Oxygen, nutrients, pollution trends | Selected stations/basins; parameter-specific cadence | Valuable; multiple regional providers |
| Groundwater levels | Is groundwater unusually low locally? | Resource trends | State monitoring networks; variable | Valuable; fragmented observations |
| Groundwater forecasts | How might groundwater develop? | Forecasts and longer-term scenarios | BGR reference sites; product-dependent | Documented downloads; clearly model-based |
| Soil moisture and drought | Is the ground unusually dry? | Agricultural/environmental context | Germany-wide daily model products | Useful; UFZ reuse needs examination |
| Air quality | What is the reported air quality nearby? | Pollutant series and annual assessments | Germany-wide monitoring network; hourly/daily/annual | Strong candidate |
| Weather observations | How hot, wet, or windy has it been? | Event context and anomalies | DWD stations/grids; product-dependent | Strong candidate |
| Forecasts and weather warnings | What conditions are expected? | Forecast issue-time comparisons | DWD products and warning areas | Strong candidate; separate from observations |
| Long-term climate context | Is this unusual for the season? | Baselines and climate reporting | DWD archives / Copernicus reanalysis | Valuable after method and baseline choices |
| Flood hazard and water-body status | What long-term risks or pressures exist? | Geographic context and policy reporting | Official thematic layers; periodic assessments | Later research candidate; not a current warning |

## Source catalogue

### 1. WSV PEGELONLINE: river observations and navigation context

The stable REST API documents station discovery, water level (`W`), discharge (`Q`) where supplied, references, forecasts (`WV`), and selected navigation products. JSON and measurement CSV are available without authentication. Its rolling observation window is 31 days; long records need another archive or ongoing collection. Actual sampling depends on the series.

Navigation-depth products have limited section coverage, explicitly including sections between Elbe and Oder. Do not present these as a nationwide shipping-depth layer. Separate forecast issue time from valid time and retain uncertainty where provided.

Reuse: official terms specify DL-DE Zero 2.0. The newer HyDAS interface is explicitly beta; the provider recommends the stable REST API for production.

Sources: [REST documentation](https://pegelonline.wsv.de/webservice/dokuRestapi), [reuse terms](https://pegelonline.wsv.de/gast/nutzungsbedingungen), [HyDAS status](https://pegelonline.wsv.de/webservice/hydas).

### 2. State hydrology services: coverage beyond federal waterways

Federal sources do not cover every local river. State providers are necessary to support places currently missing from Droplet.

One concrete example is Lower Saxony's NLWKN service: documented REST access to recent raw observations, with attribution requirements and older/checked records obtained separately. Thuringia's flood centre publishes levels and flows and is a relevant lead for the Erfurt/Gera gap. Its reusable machine access and applicable terms still need checking.

Product implication: assess coverage by river and city rather than promising that every city has a gauge. Retain the upstream operator and identifier to avoid double-counting stations syndicated through multiple services.

Sources: [NLWKN service manual](https://www.pegelonline.nlwkn.niedersachsen.de/pdf/BenutzerhandbuchWebservicePegelonline.pdf), [Thuringia official information on its hydrology services](https://hnz.thueringen.de/hochwasservorsorge/pdf/Behalten_Sie_die_Gefahrensituation_im_Blick.pdf).

### 3. ELWIS: interpreting shipping conditions

ELWIS supplies official navigation context. Its Rhine guidance explains that available channel depth depends on river section and a reference water level. A gauge reading is not river depth or a direct estimate of a vessel's load.

This could support a plain-language explanation of why low water can constrain freight. A recent Bundesbank analysis documents transport disruption and higher transport costs during Rhine low water. Neither establishes a formula from today's gauge to future grocery prices.

Research judgement: useful professional context, but do not invent a freight-risk percentage. Reuse and machine access to notices should be checked independently of PEGELONLINE terms.

Sources: [ELWIS Rhine channel guidance](https://www.elwis.de/DE/Service/Telematikanwendungen/Inland-ECDIS/Allgemeines/ARGO/Fahrrinnensituation/Fahrrinnensituation-node?__forceHttps=1), [Bundesbank, September 2026](https://www.bundesbank.de/de/aufgaben/themen/deutsche-wirtschaft-auf-erholungskurs-1009002).

### 4. Local utilities: drinking-water composition

Berliner Wasserbetriebe publishes analyses by postcode. Hamburg Wasser offers a lookup that can require a street and district because several works can serve a postcode. These demonstrate why the nearest waterworks or city centre is an unreliable supply-area match.

Potential fields include hardness, nitrate, sodium, calcium, magnesium, pH, conductivity, and reported trace substances. Availability must be established per utility. PFAS and microbiological values should appear only where actually reported, with parameter definitions and reporting limits.

Reports can have different sample dates and reporting periods. A frequently checked website does not make an annual analysis a live measurement. Household plumbing can also affect water after supply.

Research judgement: high everyday value; start by assessing a small set of utilities. No standardized national current address-to-analysis API was established in this research. Public display of a report does not establish permission to redistribute its database or document.

Sources: [Berlin postcode analyses](https://www.bwb.de/de/analysedaten-nach-postleitzahlen.php), [Hamburg supply lookup](https://www.hamburgwasser.de/wasser/mein-trinkwasser), [UBA drinking-water data and local information sources](https://www.umweltbundesamt.de/themen/wasser/trinkwasser/trinkwasserqualitaet/daten-zur-trinkwasserqualitaet).

### 5. WasserBLIcK: newly identified national drinking-water archive

A federal government response dated 20 April 2026 describes a downloadable “Trinkwasser” dataset of state-reported data for 2020–2024, supporting EU drinking-water reporting. This is a significant lead for professional research and should be inspected before assuming that all historic collection must start utility by utility.

The response references this [archive download](https://www.wasserblick.net/servlet/is/246968/Trinkwasser.zip?command=downloadContent&filename=Trinkwasser.zip). The archive was not retrievable during the initial web research. A subsequent user-supplied workbook sample reveals an exceedance-reporting structure, described in the follow-up above. Full coverage, completeness, field definitions, and reuse rights still need verification. It cannot be treated as a ready local lookup or current warning feed.

Source: [Bundestag response 21/5463, page 2](https://dserver.bundestag.de/btd/21/054/2105463.pdf).

### 6. EEA/UBA: national bathing-water baseline

The EEA publishes site-level bathing-water classifications and historical data. The 2025-season dataset provides a broad baseline; its metadata records CC BY 4.0. UBA directs users to state services for current-season information.

Use annual classifications as historical context. They generally incorporate multiple seasons of samples and do not establish today's conditions. Coverage concerns designated monitored bathing sites, not every lake shore or river reach.

Everyday view: a named site, dated official assessment, latest known sample and published restrictions. Professional view: history and the underlying sample/classification basis where available. Missing or out-of-season monitoring must remain visible.

Sources: [UBA bathing-water overview](https://www.umweltbundesamt.de/wasserqualitaet-in-badegewaessern), [EEA 2025 dataset metadata](https://sdi.eea.europa.eu/catalogue/datahub/api/records/070d9baa-448d-4168-8514-7dadb3ad876d/formatters/xsl-view?approved=true&language=eng&output=pdf).

### 7. Berlin and Brandenburg: current bathing-site pilots

Berlin's official open-data catalogue lists a CC BY 4.0 WFS for bathing-water quality. Its schema includes site identity, multi-year EU classification, and cyanobacteria/other contextual fields. That schema alone does not establish a current lab-results or closure feed. LAGeSo separately publishes current assessments and laboratory information; its 2026 announcement describes fortnightly sampling during the season.

Brandenburg's official portal separates current assessments from the four-season classification. It documents daily information updates during the bathing season and XML/KML downloads; its open-data portal also lists tabular downloads. Daily publication is not daily sampling. Check export contents and resource-specific terms before choosing an ingestion route.

Research judgement: Berlin/Brandenburg is a useful candidate geography for learning how site identity, samples, warnings, and seasonal status connect. It is not an approved launch-region choice.

Sources: [Berlin official dataset catalogue](https://daten.berlin.de/datensaetze?tags=EU-Badestellen), [Berlin WFS schema](https://gdi.berlin.de/data/badegewaesser/docs/Datenformatbeschreibung_Badegewaesser.pdf), [Berlin sampling announcement](https://www.berlin.de/lageso/service/pressemitteilungen/2026/pressemitteilung.1670804.php), [Brandenburg portal information](https://badestellen.brandenburg.de/pl/informationen), [Brandenburg open data](https://umweltdaten.brandenburg.de/en/open-data/verbraucherschutz).

### 8. BfG Undine and basin/state providers: river chemistry

Undine brings together information on major basins, including water temperature, dissolved oxygen, conductivity, pH, extremes, and long-term developments. It links onward to the responsible monitoring providers. FGG Elbe's information system includes chemical, physical, and biological observations.

Potential everyday explanation: warm water and low oxygen can indicate stress for aquatic life. Professional value: named-parameter histories and event investigations.

Cadence and archive depth depend on the station and parameter. A chart on a portal is not proof of a supported reusable API. Numerical access and original-provider licences require source-by-source examination. Do not infer drinking-water quality or bathing permission from these measurements.

Sources: [Undine Rhine sources and parameters](https://undine.bafg.de/rhein/rheingebiet.html), [FGG Elbe information system](https://www.fgg-elbe.de/fachinformationssystem.html).

### 9. EEA Waterbase/WISE: chemical and ecological research

The current Water Quality ICM release is labelled **2026**, published 7 July 2026, with overall temporal coverage through 2025. Its metadata lists nutrients, organic matter, hazardous substances, pesticides, site references, individual samples, and aggregates; these are not interchangeable tables. It provides CSV/SQLite downloads and Discodata access, under CC BY 4.0.

This is a strong professional research candidate. Actual German coverage, per-parameter record depth, reporting limits, and valid geographic joins still need a sample audit. Dataset-wide temporal coverage does not mean that every site has that history. Annual publication also means it is unsuitable as a current local incident detector.

Sources: [current Waterbase collection](https://www.eea.europa.eu/en/datahub/datahubitem-view/fbf3717c-cd7b-4785-933a-d0cf510542e1), [2026 release metadata and licence](https://sdi.eea.europa.eu/catalogue/datahub/api/records/82e194cc-2506-411c-b341-9eb50b6ad5e0/formatters/xsl-view?approved=true&language=eng&output=pdf).

### 10. BGR GRUVO and state services: groundwater

GRUVO presents measured groundwater information alongside model-based forecasts and projections. Its download page provides national and state forecast bundles under DL-DE BY 2.0, but explicitly says it cannot distribute the underlying state measurements. These must come from state providers. It also links a historical German groundwater research dataset.

Everyday value: dated local groundwater context. Professional value: trends and clearly labelled forecast/scenario comparisons. Long-term projections cannot be interpreted as predictions of individual weeks.

Research judgement: worthwhile, with separate research tracks for measured state data and BGR model products. Do not treat groundwater level, soil moisture, and household water availability as one metric.

Sources: [GRUVO](https://gruvo.bgr.de/website/), [downloads, rights, and observation limitations](https://gruvo.bgr.de/website/download).

### 11. UFZ Drought Monitor: soil moisture

UFZ publishes daily Germany-wide model-based soil-moisture/drought products. The current method was updated in June 2025; its reference period and averaging differ from older descriptions. Preserve method/version metadata when comparing history.

Useful explanations include dry topsoil, plant-available water, and longer-lived deeper-soil deficits. These are model results, not a sensor at each map point.

Rights need care: the page expressly allows graphics for research/scientific and editorial purposes with attribution. That does not establish unrestricted reuse of the underlying data or use throughout a general app, even one offering free professional accounts. Inspect the downloadable-data terms separately before deciding on integration.

Source: [UFZ Drought Monitor, methods and usage terms](https://www.ufz.de/index.php?de=37937).

### 12. UBA Luftdaten: measured air quality

UBA provides documented APIs for station metadata, pollutant measurements, air-quality assessments, and annual evaluations. Useful initial parameters are PM2.5, PM10, NO2, and ozone; other substances depend on station coverage. Prefer a documented source index over reviving Droplet's previous custom risk score.

The official catalogue describes measurements from 2016 onward and identifies current-year data as provisional, with final data published the following year. It lists DL-DE BY 2.0. This is stronger evidence than inconsistent licence claims on third-party sites.

A roadside station and an urban-background station describe different settings. Choose representative sources deliberately, show station type and distance, and do not relabel a nearby station as a citywide measurement. Pollutants require their own averaging periods and availability states.

Sources: [UBA air-data entry point and API documentation](https://luftdaten.umweltbundesamt.de/), [official dataset catalogue and reuse metadata](https://data.gov.de/suche/daten/luftdaten-deutschland-api-air-data-germany-api?ids=9af90d3c-5cfa-41b9-af4e-c0a6000a83a0).

### 13. DWD: observations, forecasts, warnings, and rainfall grids

DWD offers open downloads without registration. Its CDC archive extends the station-rainfall foundation already in Droplet to temperature and other weather/climate observations, with product-specific station histories and quality documentation. CDC terms explicitly specify CC BY 4.0.

MOSMIX provides point forecasts; its short and long products have different issue schedules. CAP provides machine-readable official warnings. These need distinct records from measurements, including issue time, valid period, warning updates/cancellations, and affected geography. Confirm current weather-product terms separately from the CDC licence.

RADOLAN is a later candidate for spatial rainfall layers. Product choice determines time resolution, calibration, and suitability. Radar-derived precipitation is an estimate and must be distinguished from a rain-gauge observation.

Sources: [DWD access notes](https://opendata.dwd.de/README.txt), [CDC licence](https://opendata.dwd.de/climate_environment/CDC/Nutzungsbedingungen_German.pdf), [MOSMIX documentation](https://www.dwd.de/DE/leistungen/met_verfahren_mosmix/mosmix_verfahrenbeschreibung_gesamt.pdf?__blob=publicationFile&v=5), [CAP warning directory](https://opendata.dwd.de/weather/alerts/cap/), [RADOLAN product specifications](https://www.dwd.de/DE/leistungen/radolan/produktuebersicht/radolan_produktuebersicht_pdf.pdf?__blob=publicationFile&v=12).

### 14. Open-Meteo and Copernicus: convenient models and climate history

Open-Meteo is a convenient candidate for weather/model access and appears in the old integration code. Its hosted free API is for non-commercial use; commercial hosted access requires a subscription. Free professional accounts in Droplet do not by themselves settle provider eligibility. Assess against the actual project and applicable terms rather than assuming that a professional role requires payment. The underlying data licence and hosted-service terms are separate.

Copernicus ERA5/ERA5-Land provide long-term reanalysis suitable for climate context. Reanalysis combines models and observations; it is not a local station measurement. Its delayed updates also distinguish it from a live feed. The inspected ERA5 dataset lists a CC-BY licence. Storage, subset retrieval, baselines, and spatial resolution are the main research concerns.

Sources: [Open-Meteo access terms and plans](https://open-meteo.com/en/pricing), [Copernicus reanalysis explanation](https://climate.copernicus.eu/climate-reanalysis), [ERA5 dataset and licence](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-complete?tab=overview).

### 15. Official geographic layers: cities, water bodies, and hazard context

BKG GN250 provides names and coordinates for settlements, rivers, lakes, and other features. The current documentation inspected is dated 25 August 2026, with data status December 2024. It is suitable for researching city/water-body discovery; it is not an address-level utility-supply map. Postal-code fields have additional restrictions in the documented offering, so public postcode coverage must not be assumed. Check the exact delivery bundle's rights.

Water-DE is an official discovery portal for water-framework and flood-risk products. Official flood hazard maps describe scenarios and possible inundation, not a forecast of current flooding. Feature geometry and current warnings require different sources and validation.

Sources: [current BKG GN250 documentation](https://sgx.geodatenzentrum.de/public/gdz/dokumentation/deu/gn250.pdf), [Water-DE discovery guidance](https://www.wasserblick.net/servlet/is/185273/), [official explanation of flood hazard maps](https://www.hochwasser.baden-wuerttemberg.de/hochwassergefahrenkarten-und-hochwasserrisikokarten).

### 16. OpenStreetMap ecosystem: map context and place search

OSM-derived geography can support rivers, lakes, settlement labels, and contextual maps. Geographic features do not certify water conditions or establish monitoring coverage.

Data rights and hosted-service policies are separate. The public Nominatim server forbids autocomplete and has a maximum of one request per second across an application. Public OSM raster tiles are best-effort, require attribution/caching, and prohibit bulk downloading. For a future interactive map, evaluate a suitable hosted provider or self-hosted services; no provider is selected here.

Sources: [OSMF geocoding policy](https://operations.osmfoundation.org/policies/nominatim/), [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/).

## What the map research implies

Cities can become the entry point while measurements retain their true geography. Proposed examples for later brainstorming:

| Selected topic | Appropriate geographic object | What a city summary should explain |
| --- | --- | --- |
| Drinking water | Verified utility/supply area | Which analysis applies, and how the location was matched |
| Bathing water | Official monitored bathing site | Site assessment, sample date, restriction status, and monitoring season |
| River quantity | Gauge and relevant river reach | Gauge identity, observation time, reference conditions |
| Air quality | Representative station or labelled model cell | Station setting/distance or model resolution |
| Weather | Weather station, forecast point, or grid cell | Measurement versus forecast and represented location |
| Drought | Model grid and soil-depth definition | Model date, method, reference period, and resolution |

This supports city labels, topic layers, compact data snippets, and deeper station details without pretending that all topics share one observation location. A city with partial coverage should show that explicitly. Do not paint an entire city or state with one gauge's condition.

## Implications for the three free tiers

These are hypotheses for the later brainstorming stage, not approved feature gates.

| Tier | Potential purpose |
| --- | --- |
| Guest | Understand a place: current summaries, basic trends, source dates, coverage, and published warnings |
| Signed-in | Return to places: saved/default locations and personal preferences |
| Professional, also free | Investigate: extended charts, parameter tables, comparisons, reproducible downloads, and citation-ready source records |

Professional credibility is likely to depend on useful evidence workflows rather than account exclusivity. Candidate benefits include exportable chart data, recorded query/date ranges, original-source identifiers, versioned methods, and clear provisional/final status. Exact admission rules, history boundaries, and feature allocation remain open. No billing work is implied.

## Trust requirements suggested by the sources

These are product/research conclusions, not an implementation specification:

- Record sample/observation time, publication or forecast issue time, and Droplet retrieval time separately.
- Preserve source IDs, units, averaging windows, spatial scope, quality flags, and original links.
- Keep measurements, models, forecasts, annual classifications, and official restrictions visibly distinct.
- Preserve detection limits: “below reporting limit” is not zero. Unmeasured is not compliant.
- Apply reference values only with their definition, averaging period, jurisdiction, and effective date. Do not copy old hard-coded thresholds into a new release.
- Treat no report, stale report, off-season monitoring, and no published restriction as different states.
- Professional exports should identify the extraction/version and indicate revisions or gaps.
- Assess climate anomalies against a declared baseline; a recent trend alone does not establish a climate trend or attribute an event to climate change.
- Explain low-water logistics as a documented mechanism. Price effects need additional economic evidence and cannot be inferred from a gauge alone.

## Research priorities for the next discussion

This is a shortlist of investigations, not a build sequence or implementation commitment.

1. **Strong national foundation:** expanded river coverage, UBA air observations, DWD weather. These have documented access and clear utility.
2. **Everyday water pilots:** a small number of drinking-water supply areas and one state's current bathing-site data. These test the hardest location and interpretation problems.
3. **Professional evidence:** inspect Waterbase's German subset and the national drinking-water archive. Establish whether their records support useful, reproducible comparisons.
4. **Additional context:** groundwater, river chemistry, drought, navigation, and climate baselines after their particular coverage and rights questions are answered.

Before choosing the first feature, compare candidate pilot places using actual source coverage and sample records. A focused region with several trustworthy topics may be more useful than a national map full of unsupported detail.

## Verification limits and unresolved questions

This was a documentation/metadata review plus repository inspection. It was not a complete audit of every state's services or every utility. Direct HTTP sample checks from the local shell failed at DNS resolution in the restricted environment; no raw API response counts or archive schemas are claimed as tested. The browser research tool could read official documentation and catalogues, but could not inspect the WasserBLIcK archive. DWD's general legal-notice page also returned 403; CDC's specific licence was readable.

Remaining source work includes: sample-response validation, identifiers and geometry matching, actual German coverage, historical completeness, revision handling, provider limits, exact resource licences, and operational reliability. There are no supported effort or hosting-cost estimates yet.

There is enough evidence to brainstorm a useful expanded product. There is not yet enough evidence to promise nationwide current drinking-water lookup, universal swimming suitability, a complete shipping-risk model, or uniformly deep historical charts across every topic.
