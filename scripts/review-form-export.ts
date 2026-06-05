import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { join, resolve } from "node:path";
import {
  buildBerlinOfficialWfsUrl,
  buildNominatimSearchUrl,
  canQueryBerlinOfficialAddress,
  GEOCODE_CACHE_DIR,
  type GeocodeLookupResult,
  type GeocodeProvider,
  getGeocodeCacheKey,
  getNominatimDelayMs,
  NOMINATIM_USER_AGENT,
  parseBerlinAddress,
  parseBerlinOfficialFeatureCollection,
  parseNominatimResults,
} from "../src/lib/data/form-geocoding";
import {
  buildReviewToolState,
  FORM_SUBMISSION_DIR,
  type FormExportOverrideHeader,
  formatOverrideRows,
  getDraftOutputPath,
  isAuthorizedReviewRequest,
  parseReviewToolArgs,
  REVIEW_OVERRIDES_DIR,
  REVIEW_OVERRIDES_PATH,
  REVIEWED_IMPORTS_DIR,
  type ReviewToolState,
  resolveReviewToolInputPath,
  runReviewToolPipeline,
} from "../src/lib/data/form-review-tool";
import { formatPriceRecordsCsv } from "../src/lib/data/import-reviewed-data";
import { loadDataSet } from "../src/lib/data/load-data";

type ClientState = {
  draftOutputPath?: string;
  inputPath?: string;
  result: {
    blockers: string[];
    canWrite: boolean;
    summary: {
      rowsConverted: number;
    };
    warnings: string[];
  };
  rows: ReviewToolState["rows"];
};

function printUsage() {
  console.log(
    "Usage: pnpm review:form-export [-- <raw-google-export.csv>] [--port 4317] [--host 127.0.0.1]",
  );
}

function ensureLocalDirectories() {
  mkdirSync(FORM_SUBMISSION_DIR, { recursive: true });
  mkdirSync(GEOCODE_CACHE_DIR, { recursive: true });
  mkdirSync(REVIEWED_IMPORTS_DIR, { recursive: true });
  mkdirSync(REVIEW_OVERRIDES_DIR, { recursive: true });
}

function findInputPath(requestedInputPath: string | undefined) {
  const candidates = readdirSync(FORM_SUBMISSION_DIR).map((fileName) => {
    const path = join(FORM_SUBMISSION_DIR, fileName);

    return {
      mtimeMs: statSync(path).mtimeMs,
      path,
    };
  });

  return resolveReviewToolInputPath({ candidates, requestedInputPath });
}

function readOverrideCsv() {
  return existsSync(REVIEW_OVERRIDES_PATH)
    ? readFileSync(REVIEW_OVERRIDES_PATH, "utf8")
    : undefined;
}

function getGeocodeCachePath(provider: GeocodeProvider, address: string) {
  return join(GEOCODE_CACHE_DIR, getGeocodeCacheKey({ address, provider }));
}

function readGeocodeCache(provider: GeocodeProvider, address: string) {
  const cachePath = getGeocodeCachePath(provider, address);

  if (!existsSync(cachePath)) {
    return undefined;
  }

  return {
    ...(JSON.parse(readFileSync(cachePath, "utf8")) as GeocodeLookupResult),
    cached: true,
  };
}

function writeGeocodeCache(result: GeocodeLookupResult, address: string) {
  writeFileSync(
    getGeocodeCachePath(result.provider, address),
    `${JSON.stringify({ ...result, cached: false }, null, 2)}\n`,
  );
}

function toClientState(state: ReviewToolState): ClientState {
  return {
    draftOutputPath: state.draftOutputPath,
    inputPath: state.inputPath,
    result: {
      blockers: state.result.blockers,
      canWrite: state.result.canWrite,
      summary: state.result.summary,
      warnings: state.result.warnings,
    },
    rows: state.rows,
  };
}

function writeDraftCsv(state: ReviewToolState) {
  if (!state.inputPath) {
    return undefined;
  }

  const outputPath = getDraftOutputPath(state.inputPath);
  writeFileSync(outputPath, state.result.draftCsv);

  return outputPath;
}

function loadRawCsv(inputPath: string) {
  if (!existsSync(inputPath)) {
    throw new Error(`Raw CSV export not found: ${inputPath}`);
  }

  return readFileSync(resolve(inputPath), "utf8");
}

function loadState(inputPath: string) {
  return toClientState(
    buildReviewToolState({
      currentDataSet: loadDataSet(),
      overrideCsv: readOverrideCsv(),
      rawCsv: loadRawCsv(inputPath),
      selectedInputPath: inputPath,
    }),
  );
}

function runPipeline(inputPath: string, writeRequested: boolean) {
  const result = runReviewToolPipeline({
    currentDataSet: loadDataSet(),
    overrideCsv: readOverrideCsv(),
    rawCsv: loadRawCsv(inputPath),
    selectedInputPath: inputPath,
    writeRequested,
  });
  const draftWrittenPath = writeDraftCsv(result.state);

  if (result.dataSetToWrite) {
    writeFileSync(
      join(process.cwd(), "data", "shops.json"),
      `${JSON.stringify(result.dataSetToWrite.shops, null, 2)}\n`,
    );
    writeFileSync(
      join(process.cwd(), "data", "price-records.csv"),
      formatPriceRecordsCsv(result.dataSetToWrite.priceRecords),
    );
  }

  return {
    draftWrittenPath,
    state: toClientState(result.state),
    wroteProduction: result.wroteProduction,
  };
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

function sendHtml(response: ServerResponse, statusCode: number, body: string) {
  response.writeHead(statusCode, {
    "content-type": "text/html; charset=utf-8",
    "x-content-type-options": "nosniff",
  });
  response.end(body);
}

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolveBody, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        request.destroy(new Error("Request body is too large."));
      }
    });
    request.on("end", () => resolveBody(body));
    request.on("error", reject);
  });
}

async function readJson(request: IncomingMessage) {
  const body = await readBody(request);

  return body ? (JSON.parse(body) as unknown) : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRowsPayload(
  value: unknown,
): Array<Partial<Record<FormExportOverrideHeader, unknown>>> {
  if (!isRecord(value) || !Array.isArray(value.rows)) {
    throw new Error("Request body must include rows.");
  }

  return value.rows.filter(isRecord);
}

function getWriteRequested(value: unknown) {
  return isRecord(value) && value.write === true;
}

function needsGeocoding(
  row: Partial<Record<FormExportOverrideHeader, unknown>>,
) {
  return !row.district || !row.borough || !row.lat || !row.lng;
}

function getAddressPayload(value: unknown) {
  if (!isRecord(value) || typeof value.address !== "string") {
    throw new Error("Request body must include address.");
  }

  const address = value.address.trim();

  if (!address) {
    throw new Error("Address must not be blank.");
  }

  return address;
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Provider request failed with ${response.status}.`);
  }

  return response.json() as Promise<unknown>;
}

async function lookupBerlinOfficialAddress(
  address: string,
): Promise<GeocodeLookupResult> {
  const cached = readGeocodeCache("berlin-official", address);

  if (cached) {
    return cached;
  }

  const parsedAddress = parseBerlinAddress(address);
  const warnings = [...parsedAddress.warnings];

  if (!canQueryBerlinOfficialAddress(parsedAddress)) {
    return {
      cached: false,
      parsedAddress,
      provider: "berlin-official",
      suggestions: [],
      warnings,
    };
  }

  const payload = await fetchJson(buildBerlinOfficialWfsUrl(parsedAddress));
  const suggestions = parseBerlinOfficialFeatureCollection(
    payload as Parameters<typeof parseBerlinOfficialFeatureCollection>[0],
  );

  if (suggestions.length === 0) {
    warnings.push("Official Berlin address lookup returned no candidates.");
  }

  const result: GeocodeLookupResult = {
    cached: false,
    parsedAddress,
    provider: "berlin-official",
    suggestions,
    warnings,
  };
  writeGeocodeCache(result, address);

  return result;
}

let lastNominatimRequestAt = 0;

async function waitForNominatimRateLimit() {
  const delayMs = getNominatimDelayMs({
    lastRequestAt: lastNominatimRequestAt,
    now: Date.now(),
  });

  if (delayMs > 0) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, delayMs));
  }

  lastNominatimRequestAt = Date.now();
}

async function lookupNominatimAddress(
  address: string,
): Promise<GeocodeLookupResult> {
  const cached = readGeocodeCache("nominatim", address);

  if (cached) {
    return cached;
  }

  await waitForNominatimRateLimit();

  const payload = await fetchJson(buildNominatimSearchUrl(address), {
    headers: {
      "user-agent": NOMINATIM_USER_AGENT,
    },
  });
  const suggestions = parseNominatimResults(
    Array.isArray(payload) ? payload : [],
  );
  const warnings =
    suggestions.length === 0
      ? ["Nominatim returned no candidates."]
      : [
          "Nominatim is a manual fallback. Verify coordinates, district, and borough before approval.",
        ];
  const result: GeocodeLookupResult = {
    cached: false,
    provider: "nominatim",
    suggestions,
    warnings,
  };
  writeGeocodeCache(result, address);

  return result;
}

function createPageHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Local Form Review Tool</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f8fafc;
      color: #1f2933;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }
    main {
      width: min(1180px, 100%);
      margin: 0 auto;
      padding: 24px;
    }
    header {
      display: grid;
      gap: 8px;
      margin-bottom: 20px;
    }
    h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.2;
    }
    p {
      margin: 0;
      color: #53606d;
    }
    button {
      border: 1px solid #1f2933;
      border-radius: 6px;
      background: #1f2933;
      color: #fff;
      cursor: pointer;
      font: inherit;
      min-height: 40px;
      padding: 8px 12px;
    }
    button.secondary {
      background: #fff;
      color: #1f2933;
    }
    button.official {
      background: #0f766e;
      border-color: #0f766e;
      color: #fff;
    }
    button.fallback {
      background: #fff7ed;
      border-color: #c2410c;
      color: #9a3412;
      font-weight: 700;
    }
    button.fallback.attention {
      background: #c2410c;
      color: #fff;
    }
    button.danger {
      background: #b42318;
      border-color: #b42318;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    input, select, textarea {
      width: 100%;
      min-width: 0;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      color: #1f2933;
      font: inherit;
      padding: 8px 10px;
    }
    textarea {
      min-height: 74px;
      resize: vertical;
    }
    label {
      display: grid;
      gap: 5px;
      min-width: 0;
      color: #374151;
      font-size: 13px;
      font-weight: 650;
    }
    label.field-alert select,
    label.field-alert input,
    label.field-alert textarea {
      border-color: #dc2626;
      box-shadow: 0 0 0 2px #fee2e2;
    }
    label.field-alert span {
      color: #b42318;
    }
    .toolbar {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 18px 0;
    }
    .status, .review-card {
      border: 1px solid #d9e2ec;
      border-radius: 8px;
      background: #fff;
      padding: 16px;
    }
    .status {
      display: grid;
      gap: 12px;
      margin-bottom: 16px;
    }
    .status strong {
      color: #1f2933;
    }
    .status ul {
      margin: 0;
      padding-left: 20px;
    }
    .status-summary {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
    .status-metric {
      border: 1px solid #e2e8f0;
      border-radius: 7px;
      display: grid;
      gap: 3px;
      padding: 10px;
    }
    .status-metric span {
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .status-metric strong,
    .status-metric code {
      overflow-wrap: anywhere;
    }
    .alert {
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      display: grid;
      gap: 6px;
      padding: 12px;
    }
    .alert.success {
      background: #ecfdf3;
      border-color: #16a34a;
      color: #166534;
    }
    .alert.warning {
      background: #fffbeb;
      border-color: #f59e0b;
      color: #92400e;
    }
    .alert.danger {
      background: #fef2f2;
      border-color: #dc2626;
      color: #991b1b;
    }
    .alert.info {
      background: #eff6ff;
      border-color: #60a5fa;
      color: #1d4ed8;
    }
    .alert strong,
    .alert p {
      color: inherit;
    }
    .rows {
      display: grid;
      gap: 14px;
    }
    .review-card {
      display: grid;
      gap: 14px;
    }
    .review-card h2 {
      margin: 0;
      font-size: 18px;
      line-height: 1.25;
    }
    .raw-grid, .edit-grid, .readonly-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
    .geo-panel {
      border-top: 1px solid #e2e8f0;
      display: grid;
      gap: 10px;
      padding-top: 12px;
    }
    .geo-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .geo-results {
      display: grid;
      gap: 8px;
    }
    .suggestion {
      border: 1px solid #d9e2ec;
      border-radius: 7px;
      display: grid;
      gap: 8px;
      padding: 10px;
    }
    .suggestion strong {
      overflow-wrap: anywhere;
    }
    .raw-item {
      min-width: 0;
    }
    .raw-item span {
      color: #64748b;
      display: block;
      font-size: 12px;
      font-weight: 700;
    }
    .raw-item code {
      color: #1f2933;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    .full {
      grid-column: 1 / -1;
    }
    .muted {
      color: #64748b;
      font-size: 13px;
    }
    .success {
      color: #166534;
    }
    .warning {
      color: #92400e;
    }
    .error {
      color: #991b1b;
    }
    @media (max-width: 640px) {
      main { padding: 16px; }
      h1 { font-size: 23px; }
      .toolbar button { flex: 1 1 100%; }
      .geo-actions button { flex: 1 1 100%; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Local Form Review Tool</h1>
      <p>This page edits local review overrides, runs the same safety gates as process:form-export, and only writes production data after confirmation.</p>
    </header>
    <section class="toolbar">
      <button class="secondary" id="reload">Reload</button>
      <button class="secondary" id="save">Save overrides</button>
      <button class="secondary" id="geocode-missing">Official lookup missing geo fields</button>
      <button id="dry-run">Process dry run</button>
      <button class="danger" id="confirm" disabled>Confirm import</button>
    </section>
    <section class="status" id="status">Loading...</section>
    <section class="rows" id="rows"></section>
  </main>
  <script>
    const token = new URLSearchParams(location.search).get("token") || "";
    const geocodeResultsByRow = new Map();
    let latestState = null;

    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    async function api(path, options = {}) {
      const response = await fetch(path, {
        ...options,
        headers: {
          "content-type": "application/json",
          "x-review-token": token,
          ...(options.headers || {}),
        },
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Request failed.");
      }

      return payload;
    }

    function renderStatus(payload) {
      const state = payload.state || payload;
      const result = state.result;
      const blockers = result.blockers || [];
      const warnings = result.warnings || [];
      const writeText = payload.wroteProduction
        ? '<div class="alert success"><strong>Production data was updated.</strong><p>The reviewed rows were written to production data files.</p></div>'
        : "";
      const draftText = payload.draftWrittenPath
        ? '<div class="alert info"><strong>Draft written</strong><p><code>' + escapeHtml(payload.draftWrittenPath) + '</code></p></div>'
        : "";
      const readinessText = result.canWrite
        ? '<div class="alert success"><strong>Production write ready</strong><p>All current safety gates passed. Confirm import is enabled.</p></div>'
        : '<div class="alert danger"><strong>Production write blocked</strong><p>Fix the blockers below before importing.</p></div>';

      document.getElementById("confirm").disabled = !result.canWrite;
      document.getElementById("status").innerHTML = [
        '<div class="status-summary">' +
          '<div class="status-metric"><span>Input</span><code>' + escapeHtml(state.inputPath || "none") + '</code></div>' +
          '<div class="status-metric"><span>Rows</span><strong>' + escapeHtml(result.summary.rowsConverted) + '</strong></div>' +
          '<div class="status-metric"><span>Write ready</span><strong class="' + (result.canWrite ? "success" : "error") + '">' + (result.canWrite ? "yes" : "no") + '</strong></div>' +
        '</div>',
        readinessText,
        draftText,
        writeText,
        warnings.length ? '<div class="alert warning"><strong>Warnings</strong><ul>' + warnings.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul></div>' : "",
        blockers.length ? '<div class="alert danger"><strong>Blockers</strong><ul>' + blockers.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul></div>' : "",
      ].join("");
    }

    function rawItem(label, value) {
      return '<div class="raw-item"><span>' + escapeHtml(label) + '</span><code>' + escapeHtml(value || "") + '</code></div>';
    }

    function input(label, field, value, extra = "", className = "") {
      return '<label class="' + escapeHtml(className) + '"><span>' + escapeHtml(label) + '</span><input data-field="' + escapeHtml(field) + '" value="' + escapeHtml(value || "") + '" ' + extra + '></label>';
    }

    function textarea(label, field, value, className = "") {
      return '<label class="full ' + escapeHtml(className) + '"><span>' + escapeHtml(label) + '</span><textarea data-field="' + escapeHtml(field) + '">' + escapeHtml(value || "") + '</textarea></label>';
    }

    function select(label, field, value, options, className = "") {
      return '<label class="' + escapeHtml(className) + '"><span>' + escapeHtml(label) + '</span><select data-field="' + escapeHtml(field) + '">' + options.map((option) => {
        const selected = option === value ? " selected" : "";
        return '<option value="' + escapeHtml(option) + '"' + selected + '>' + escapeHtml(option || "blank") + '</option>';
      }).join("") + '</select></label>';
    }

    function rowBlockers(row) {
      const blockers = latestState?.result?.blockers || [];
      const prefix = 'Row ' + row.rowNumber + ' (' + row.reviewed.address;

      return blockers.filter((item) => item.startsWith(prefix));
    }

    function hasApprovalBlocker(row) {
      return rowBlockers(row).some((item) => item.includes("approved=yes"));
    }

    function renderGeocodeResult(rowNumber) {
      const result = geocodeResultsByRow.get(Number(rowNumber));

      if (!result) {
        return '<p class="muted">No lookup has run for this row.</p>';
      }

      const warnings = result.warnings || [];
      const suggestions = result.suggestions || [];
      const warningHtml = warnings.length
        ? '<div class="alert warning"><strong>Lookup notice</strong><ul>' + warnings.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul></div>'
        : "";
      const showFallbackPrompt = result.provider === "berlin-official" && suggestions.length === 0;
      const fallbackPrompt = showFallbackPrompt
        ? '<div class="alert warning"><strong>Official lookup found no candidate.</strong><p>Verify the address spelling, then use the highlighted OSM/Nominatim fallback if needed.</p></div>'
        : "";
      const suggestionHtml = suggestions.length
        ? suggestions.map((suggestion, index) => {
            return '<div class="suggestion">' +
              '<strong>' + escapeHtml(suggestion.label) + '</strong>' +
              '<span class="muted">' + escapeHtml(suggestion.provider) + (result.cached ? " - cached" : "") + '</span>' +
              '<span>District: <strong>' + escapeHtml(suggestion.district || "missing") + '</strong> - Borough: <strong>' + escapeHtml(suggestion.borough || "missing") + '</strong></span>' +
              '<span>Lat/Lng: <code>' + escapeHtml(suggestion.lat) + ', ' + escapeHtml(suggestion.lng) + '</code></span>' +
              '<span class="muted">' + escapeHtml(suggestion.quality || "") + '</span>' +
              '<span class="muted">' + escapeHtml(suggestion.attribution || "") + '</span>' +
              '<button class="secondary" data-apply-geocode="' + escapeHtml(rowNumber) + '" data-suggestion-index="' + escapeHtml(index) + '">Apply suggestion</button>' +
            '</div>';
          }).join("")
        : '<p class="error">No suggestions found.</p>';

      return warningHtml + fallbackPrompt + suggestionHtml;
    }

    function renderRows(state) {
      document.getElementById("rows").innerHTML = state.rows.map((row) => {
        const override = row.override;
        const reviewed = row.reviewed;
        const rawEntries = Object.entries(row.raw || {});
        const blockers = rowBlockers(row);
        const approvalBlocked = hasApprovalBlocker(row);
        const geocodeResult = geocodeResultsByRow.get(Number(row.rowNumber));
        const highlightFallback = geocodeResult?.provider === "berlin-official" && (geocodeResult.suggestions || []).length === 0;
        const rowBlockerHtml = blockers.length
          ? '<div class="alert danger"><strong>Row blockers</strong><ul>' + blockers.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul></div>'
          : "";
        return '<article class="review-card" data-review-row="' + escapeHtml(row.rowNumber) + '">' +
          '<h2>Row ' + escapeHtml(row.rowNumber) + '</h2>' +
          rowBlockerHtml +
          '<div class="raw-grid">' + rawEntries.map(([key, value]) => rawItem(key, value)).join("") + '</div>' +
          '<div class="readonly-grid">' +
            rawItem("Observed at", reviewed.observedAt) +
            rawItem("Price cents", reviewed.priceCents) +
            rawItem("Product type", reviewed.productType) +
            rawItem("Source type", reviewed.sourceType) +
          '</div>' +
          '<div class="edit-grid">' +
            input("Address key", "address", override.address, "readonly") +
            input("Shop ID", "shopId", override.shopId) +
            input("Shop name", "shopName", override.shopName) +
            input("District", "district", override.district) +
            input("Borough", "borough", override.borough) +
            input("Latitude", "lat", override.lat, 'inputmode="decimal"') +
            input("Longitude", "lng", override.lng, 'inputmode="decimal"') +
            select("Status", "status", override.status, ["unknown", "active", "closed"]) +
            input("Confidence", "confidence", override.confidence, 'inputmode="numeric"') +
            input("Source URL", "sourceUrl", override.sourceUrl) +
            select(approvalBlocked ? "Approved (required to import)" : "Approved", "approved", override.approved, ["", "yes", "no"], approvalBlocked ? "field-alert" : "") +
            textarea("Public-safe notes", "notes", override.notes) +
          '</div>' +
          '<div class="geo-panel">' +
            '<div>' +
              '<strong>Geocoding assist</strong>' +
              '<p class="muted">Suggestions fill only district, borough, latitude, and longitude. They do not approve the row.</p>' +
            '</div>' +
            '<div class="geo-actions">' +
              '<button class="official" data-geocode="official">Official Berlin lookup</button>' +
              '<button class="fallback' + (highlightFallback ? " attention" : "") + '" data-geocode="nominatim">OSM/Nominatim fallback</button>' +
            '</div>' +
            '<div class="geo-results" data-geo-results="' + escapeHtml(row.rowNumber) + '">' + renderGeocodeResult(row.rowNumber) + '</div>' +
          '</div>' +
          '<p class="muted">Address is the local matching key for this v1 tool. Correct raw address mistakes in the form export before review.</p>' +
        '</article>';
      }).join("");
    }

    function collectRow(card) {
      const row = {};
      card.querySelectorAll("[data-field]").forEach((field) => {
        row[field.dataset.field] = field.value;
      });
      return row;
    }

    function collectRows() {
      return [...document.querySelectorAll("[data-review-row]")].map(collectRow);
    }

    function refreshGeocodeResult(rowNumber) {
      const target = document.querySelector('[data-geo-results="' + rowNumber + '"]');
      const result = geocodeResultsByRow.get(Number(rowNumber));
      const fallbackButton = document.querySelector('[data-review-row="' + rowNumber + '"] [data-geocode="nominatim"]');

      if (target) {
        target.innerHTML = renderGeocodeResult(rowNumber);
      }

      if (fallbackButton) {
        fallbackButton.classList.toggle(
          "attention",
          result?.provider === "berlin-official" &&
            (result.suggestions || []).length === 0,
        );
      }
    }

    async function lookupGeocode(rowNumber, provider) {
      const card = document.querySelector('[data-review-row="' + rowNumber + '"]');

      if (!card) {
        return;
      }

      const row = collectRow(card);

      if (provider === "nominatim" && !confirm("Send this address to Nominatim/OpenStreetMap for manual fallback lookup?")) {
        return;
      }

      geocodeResultsByRow.set(Number(rowNumber), {
        cached: false,
        provider,
        suggestions: [],
        warnings: ["Lookup in progress..."],
      });
      refreshGeocodeResult(rowNumber);

      const endpoint = provider === "nominatim" ? "/api/geocode/nominatim" : "/api/geocode/official";
      const payload = await api(endpoint, {
        method: "POST",
        body: JSON.stringify({ address: row.address }),
      });
      geocodeResultsByRow.set(Number(rowNumber), payload.result);
      refreshGeocodeResult(rowNumber);
    }

    async function lookupMissingOfficial() {
      const payload = await api("/api/geocode/official/missing", {
        method: "POST",
        body: JSON.stringify({ rows: collectRows() }),
      });

      for (const item of payload.results || []) {
        geocodeResultsByRow.set(Number(item.rowNumber), item.result);
        refreshGeocodeResult(item.rowNumber);
      }
    }

    function applyGeocodeSuggestion(rowNumber, suggestionIndex) {
      const result = geocodeResultsByRow.get(Number(rowNumber));
      const suggestion = result?.suggestions?.[Number(suggestionIndex)];
      const card = document.querySelector('[data-review-row="' + rowNumber + '"]');

      if (!suggestion || !card) {
        return;
      }

      for (const field of ["district", "borough", "lat", "lng"]) {
        const input = card.querySelector('[data-field="' + field + '"]');

        if (input && suggestion[field]) {
          input.value = suggestion[field];
        }
      }
    }

    async function loadState() {
      const payload = await api("/api/state");
      latestState = payload.state;
      renderStatus(payload);
      renderRows(payload.state);
    }

    async function saveOverrides() {
      const payload = await api("/api/overrides", {
        method: "POST",
        body: JSON.stringify({ rows: collectRows() }),
      });
      latestState = payload.state;
      renderStatus(payload);
      renderRows(payload.state);
    }

    async function process(write) {
      const payload = await api("/api/process", {
        method: "POST",
        body: JSON.stringify({ write }),
      });
      latestState = payload.state;
      renderStatus(payload);
      renderRows(payload.state);
    }

    document.getElementById("reload").addEventListener("click", () => loadState().catch(showError));
    document.getElementById("save").addEventListener("click", () => saveOverrides().catch(showError));
    document.getElementById("geocode-missing").addEventListener("click", () => lookupMissingOfficial().catch(showError));
    document.getElementById("dry-run").addEventListener("click", () => process(false).catch(showError));
    document.getElementById("confirm").addEventListener("click", () => {
      if (latestState?.result?.canWrite && confirm("Write reviewed rows to production data files?")) {
        process(true).catch(showError);
      }
    });
    document.getElementById("rows").addEventListener("click", (event) => {
      const geocodeButton = event.target.closest("[data-geocode]");
      const applyButton = event.target.closest("[data-apply-geocode]");

      if (geocodeButton) {
        const card = geocodeButton.closest("[data-review-row]");
        lookupGeocode(card.dataset.reviewRow, geocodeButton.dataset.geocode).catch(showError);
        return;
      }

      if (applyButton) {
        applyGeocodeSuggestion(applyButton.dataset.applyGeocode, applyButton.dataset.suggestionIndex);
      }
    });

    function showError(error) {
      document.getElementById("status").innerHTML = '<p class="error"><strong>Error:</strong> ' + escapeHtml(error.message || error) + '</p>';
    }

    loadState().catch(showError);
  </script>
</body>
</html>`;
}

let args: ReturnType<typeof parseReviewToolArgs>;

try {
  args = parseReviewToolArgs(process.argv.slice(2));
} catch (error) {
  printUsage();

  if (error instanceof Error && error.message !== "help") {
    console.error(error.message);
    process.exitCode = 1;
  }

  process.exit();
}

try {
  ensureLocalDirectories();

  const token = randomBytes(24).toString("hex");
  const inputPath = findInputPath(args.inputPath);

  if (!inputPath) {
    throw new Error(
      `No raw CSV export found in ${FORM_SUBMISSION_DIR}. Add a Google Forms CSV export or pass one explicitly.`,
    );
  }

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://${args.host}:${args.port}`);

    try {
      if (request.method === "GET" && url.pathname === "/") {
        if (url.searchParams.get("token") !== token) {
          sendHtml(response, 401, "<h1>Unauthorized</h1>");
          return;
        }

        sendHtml(response, 200, createPageHtml());
        return;
      }

      if (!url.pathname.startsWith("/api/")) {
        sendJson(response, 404, { error: "Not found." });
        return;
      }

      if (
        !isAuthorizedReviewRequest({
          headers: request.headers,
          token,
          url,
        })
      ) {
        sendJson(response, 401, { error: "Unauthorized." });
        return;
      }

      if (request.method === "GET" && url.pathname === "/api/state") {
        sendJson(response, 200, {
          state: loadState(inputPath),
          wroteProduction: false,
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/overrides") {
        const body = await readJson(request);
        writeFileSync(
          REVIEW_OVERRIDES_PATH,
          formatOverrideRows(getRowsPayload(body)),
        );
        sendJson(response, 200, {
          state: loadState(inputPath),
          wroteProduction: false,
        });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/process") {
        const body = await readJson(request);
        sendJson(
          response,
          200,
          runPipeline(inputPath, getWriteRequested(body)),
        );
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/geocode/official"
      ) {
        const body = await readJson(request);
        sendJson(response, 200, {
          result: await lookupBerlinOfficialAddress(getAddressPayload(body)),
        });
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/geocode/official/missing"
      ) {
        const body = await readJson(request);
        const results = [];

        for (const [index, row] of getRowsPayload(body).entries()) {
          if (typeof row.address === "string" && needsGeocoding(row)) {
            results.push({
              result: await lookupBerlinOfficialAddress(row.address),
              rowNumber: index + 1,
            });
          }
        }

        sendJson(response, 200, { results });
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/api/geocode/nominatim"
      ) {
        const body = await readJson(request);
        sendJson(response, 200, {
          result: await lookupNominatimAddress(getAddressPayload(body)),
        });
        return;
      }

      sendJson(response, 404, { error: "Not found." });
    } catch (error) {
      sendJson(response, 500, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  server.listen(args.port, args.host, () => {
    const displayUrl = `http://${args.host}:${args.port}/?token=${token}`;
    console.log(`Local form review tool running at ${displayUrl}`);
    console.log(`Input CSV: ${inputPath}`);
    console.log("Press Ctrl+C to stop the server.");
  });
} catch (error) {
  console.error("Local form review tool failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
