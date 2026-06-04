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
      background: #f6f2ea;
      color: #261f18;
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
      color: #5f564c;
    }
    button {
      border: 1px solid #241f18;
      border-radius: 6px;
      background: #241f18;
      color: #fff;
      cursor: pointer;
      font: inherit;
      min-height: 40px;
      padding: 8px 12px;
    }
    button.secondary {
      background: #fff;
      color: #241f18;
    }
    button.danger {
      background: #8b2f24;
      border-color: #8b2f24;
    }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    input, select, textarea {
      width: 100%;
      min-width: 0;
      border: 1px solid #c8bfb2;
      border-radius: 6px;
      background: #fff;
      color: #261f18;
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
      color: #51483f;
      font-size: 13px;
      font-weight: 650;
    }
    .toolbar {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 18px 0;
    }
    .status, .review-card {
      border: 1px solid #d6cdc0;
      border-radius: 8px;
      background: #fffdfa;
      padding: 16px;
    }
    .status {
      display: grid;
      gap: 8px;
      margin-bottom: 16px;
    }
    .status strong {
      color: #241f18;
    }
    .status ul {
      margin: 0;
      padding-left: 20px;
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
    .raw-item {
      min-width: 0;
    }
    .raw-item span {
      color: #6f6559;
      display: block;
      font-size: 12px;
      font-weight: 700;
    }
    .raw-item code {
      color: #2f2922;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
    .full {
      grid-column: 1 / -1;
    }
    .muted {
      color: #6f6559;
      font-size: 13px;
    }
    .success {
      color: #17633a;
    }
    .error {
      color: #8b2f24;
    }
    @media (max-width: 640px) {
      main { padding: 16px; }
      h1 { font-size: 23px; }
      .toolbar button { flex: 1 1 100%; }
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
      <button id="dry-run">Process dry run</button>
      <button class="danger" id="confirm" disabled>Confirm import</button>
    </section>
    <section class="status" id="status">Loading...</section>
    <section class="rows" id="rows"></section>
  </main>
  <script>
    const token = new URLSearchParams(location.search).get("token") || "";
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
        ? '<p class="success"><strong>Production data was updated.</strong></p>'
        : "";
      const draftText = payload.draftWrittenPath
        ? '<p><strong>Draft written:</strong> <code>' + escapeHtml(payload.draftWrittenPath) + '</code></p>'
        : "";

      document.getElementById("confirm").disabled = !result.canWrite;
      document.getElementById("status").innerHTML = [
        '<p><strong>Input:</strong> <code>' + escapeHtml(state.inputPath || "none") + '</code></p>',
        '<p><strong>Rows:</strong> ' + escapeHtml(result.summary.rowsConverted) + '</p>',
        '<p><strong>Production write ready:</strong> ' + (result.canWrite ? '<span class="success">yes</span>' : '<span class="error">no</span>') + '</p>',
        draftText,
        writeText,
        warnings.length ? '<div><strong>Warnings</strong><ul>' + warnings.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul></div>' : "",
        blockers.length ? '<div><strong>Blockers</strong><ul>' + blockers.map((item) => '<li>' + escapeHtml(item) + '</li>').join("") + '</ul></div>' : "",
      ].join("");
    }

    function rawItem(label, value) {
      return '<div class="raw-item"><span>' + escapeHtml(label) + '</span><code>' + escapeHtml(value || "") + '</code></div>';
    }

    function input(label, field, value, extra = "") {
      return '<label>' + escapeHtml(label) + '<input data-field="' + escapeHtml(field) + '" value="' + escapeHtml(value || "") + '" ' + extra + '></label>';
    }

    function textarea(label, field, value) {
      return '<label class="full">' + escapeHtml(label) + '<textarea data-field="' + escapeHtml(field) + '">' + escapeHtml(value || "") + '</textarea></label>';
    }

    function select(label, field, value, options) {
      return '<label>' + escapeHtml(label) + '<select data-field="' + escapeHtml(field) + '">' + options.map((option) => {
        const selected = option === value ? " selected" : "";
        return '<option value="' + escapeHtml(option) + '"' + selected + '>' + escapeHtml(option || "blank") + '</option>';
      }).join("") + '</select></label>';
    }

    function renderRows(state) {
      document.getElementById("rows").innerHTML = state.rows.map((row) => {
        const override = row.override;
        const reviewed = row.reviewed;
        const rawEntries = Object.entries(row.raw || {});
        return '<article class="review-card" data-review-row>' +
          '<h2>Row ' + escapeHtml(row.rowNumber) + '</h2>' +
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
            select("Approved", "approved", override.approved, ["", "yes", "no"]) +
            textarea("Public-safe notes", "notes", override.notes) +
          '</div>' +
          '<p class="muted">Address is the local matching key for this v1 tool. Correct raw address mistakes in the form export before review.</p>' +
        '</article>';
      }).join("");
    }

    function collectRows() {
      return [...document.querySelectorAll("[data-review-row]")].map((card) => {
        const row = {};
        card.querySelectorAll("[data-field]").forEach((field) => {
          row[field.dataset.field] = field.value;
        });
        return row;
      });
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
    document.getElementById("dry-run").addEventListener("click", () => process(false).catch(showError));
    document.getElementById("confirm").addEventListener("click", () => {
      if (latestState?.result?.canWrite && confirm("Write reviewed rows to production data files?")) {
        process(true).catch(showError);
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
