/**
 * previewCalendarSync.js
 * -----------------------
 * Dry-run the Google Calendar -> app pipeline WITHOUT the app and WITHOUT writing
 * to MongoDB. It reads the real IABA events calendar, runs each event through the
 * exact same parser the sync uses (buildEventData / cleanEventDescription), and
 * prints what would be stored plus any formatting problems.
 *
 * Usage:
 *   node previewCalendarSync.js                 # events in the next 7 days
 *   node previewCalendarSync.js --range month   # next ~1 month
 *   node previewCalendarSync.js --range all     # every upcoming event (max 50)
 *   node previewCalendarSync.js --json          # raw JSON of the parsed events
 *
 *   # Offline - just test a description string, no network, no calendar:
 *   node previewCalendarSync.js --desc "Community dinner.
 *   -----
 *   price: Free
 *   RSVP: yes"
 *
 *   node previewCalendarSync.js --file ./my-description.txt
 *
 * Nothing here writes to the database. To run a real sync, use the app's
 * "Sync Google Calendar" button or hit GET /api/google/fetch on the server.
 */

require("dotenv").config();
const fs = require("fs");
const { google } = require("googleapis");

const {
  cleanEventDescription,
  buildEventData,
} = require("./controllers/googleEventsController");

// ---------------------------------------------------------------------------
// tiny arg parser
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const getFlag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? (argv[i + 1] ?? "") : undefined;
};
const hasFlag = (name) => argv.includes(`--${name}`);

const useColor = process.stdout.isTTY;
const c = {
  dim: (s) => (useColor ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s) => (useColor ? `\x1b[1m${s}\x1b[0m` : s),
  green: (s) => (useColor ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s) => (useColor ? `\x1b[33m${s}\x1b[0m` : s),
  red: (s) => (useColor ? `\x1b[31m${s}\x1b[0m` : s),
  cyan: (s) => (useColor ? `\x1b[36m${s}\x1b[0m` : s),
};

const KNOWN_KEYS = [
  "price",
  "registrationLink",
  "location",
  "audience",
  "RSVP",
  "organizers",
  "contact",
];

// ---------------------------------------------------------------------------
// warnings: the same gotchas the client guide calls out
// ---------------------------------------------------------------------------
function collectWarnings({ rawDescription, parsed, event }) {
  const warnings = [];
  const isAllDay = event && event.start && !event.start.dateTime;

  if (isAllDay) {
    warnings.push(
      'All-day event: the app will show "Invalid Date" for the time. Give it a real start and end time.'
    );
  }
  if (parsed.startTime === "Invalid Date" || parsed.endTime === "Invalid Date") {
    warnings.push(
      'Time did not parse ("Invalid Date"). Check the event has a specific start and end time.'
    );
  }
  if (typeof parsed.price === "string" && parsed.price.includes("$")) {
    warnings.push(
      `price contains "$" - the app adds its own, so this shows as "$${parsed.price}". Remove the $ (or use "Free").`
    );
  }

  // detail line left above the ----- (still visible in the blurb)
  const leaked = KNOWN_KEYS.filter((k) =>
    new RegExp(`(^|\\n)\\s*${k}\\s*:`, "i").test(parsed.description || "")
  );
  if (leaked.length) {
    warnings.push(
      `These detail lines are still in the description text members see: ${leaked.join(
        ", "
      )}. Move them below a line of 5+ dashes.`
    );
  }

  // near-miss field labels (typos / spaces) in the raw description
  if (rawDescription) {
    const hints = [
      ["regist", "registrationLink"],
      ["rsvp", "RSVP"],
      ["r.s.v.p", "RSVP"],
      ["price", "price"],
      ["cost", "price"],
      ["audien", "audience"],
      ["organi", "organizers"],
      ["host", "organizers"],
      ["contact", "contact"],
      ["locat", "location"],
    ];
    const lineRe = /(^|\n)\s*([A-Za-z][A-Za-z .\-_]{1,24})\s*:/g;
    let m;
    const flagged = new Set();
    while ((m = lineRe.exec(rawDescription)) !== null) {
      const label = m[2].trim();
      const norm = label.toLowerCase().replace(/[\s.\-_]/g, "");
      const exact = KNOWN_KEYS.some((k) => k.toLowerCase() === norm);
      if (exact) continue;
      const hit = hints.find(([frag]) => norm.includes(frag.replace(/[\s.\-_]/g, "")));
      if (hit && !flagged.has(label)) {
        flagged.add(label);
        warnings.push(
          `"${label}:" is not a recognized label - did you mean "${hit[1]}:"? (labels must be spelled exactly, no spaces)`
        );
      }
    }
  }

  if (parsed.registrationLink && parsed.requireRSVP) {
    warnings.push(
      "Both registrationLink and RSVP are set - the app uses the registration link and ignores RSVP."
    );
  }
  if (!parsed.imageUrl) {
    warnings.push("No image link found - the app will show the default placeholder.");
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// what the app screens will actually render
// ---------------------------------------------------------------------------
function appPreview(parsed) {
  let primaryAction;
  if (parsed.registrationLink) primaryAction = "REGISTER button (opens link, RSVP disabled)";
  else if (parsed.requireRSVP) primaryAction = "RSVP button (collects attendee list)";
  else primaryAction = "Date badge only (no RSVP, no register)";

  let priceRow = "(hidden)";
  if (parsed.price) priceRow = parsed.price === "Free" ? "Free" : `$${parsed.price}`;

  return {
    "Event name": parsed.title || c.red("(missing title)"),
    "Date / time": `${fmtDate(parsed.startDateTime)}  ${parsed.startTime} - ${parsed.endTime}`,
    Location: parsed.location || "(uses app default IABA address)",
    Image: parsed.imageUrl || "placeholder",
    "Price row": priceRow,
    "Audience row": parsed.audience || "(hidden)",
    "Organizer row": parsed.organizers || "IABA",
    Action: primaryAction,
    Description: truncate(parsed.description, 160) || "(empty)",
  };
}

function fmtDate(v) {
  if (!v) return "(no date)";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function truncate(s, n) {
  s = (s || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function printParsed(label, parsed, warnings) {
  console.log(c.bold(c.cyan(`\n${label}`)));
  console.log(c.dim("-".repeat(Math.max(label.length, 40))));
  const preview = appPreview(parsed);
  const width = Math.max(...Object.keys(preview).map((k) => k.length));
  for (const [k, v] of Object.entries(preview)) {
    console.log(`  ${k.padEnd(width)}  ${v}`);
  }
  if (warnings.length) {
    console.log(c.yellow(`\n  ⚠ ${warnings.length} thing(s) to check:`));
    warnings.forEach((w) => console.log(c.yellow(`    - ${w}`)));
  } else {
    console.log(c.green("\n  ✓ no formatting problems detected"));
  }
}

// ---------------------------------------------------------------------------
// offline mode: --desc / --file
// ---------------------------------------------------------------------------
function runOffline(description, sourceLabel) {
  const parsed = cleanEventDescription(description);
  // fill the fields buildEventData would add so appPreview works
  const merged = {
    title: "(from --desc/--file, no calendar event)",
    ...parsed,
    organizers: parsed.organizers || "IABA",
    requireRSVP: parsed.requireRSVP === true,
    startDateTime: null,
    startTime: "-",
    endTime: "-",
  };
  const warnings = collectWarnings({ rawDescription: description, parsed: merged, event: null });

  if (hasFlag("json")) {
    console.log(JSON.stringify(parsed, null, 2));
    return;
  }
  console.log(c.dim(`\nInput (${sourceLabel}):`));
  console.log(c.dim(description.split("\n").map((l) => "  | " + l).join("\n")));
  console.log(c.bold("\nParsed fields:"));
  console.log(parsed);
  printParsed("APP PREVIEW", merged, warnings);
}

// ---------------------------------------------------------------------------
// online mode: read the real calendar
// ---------------------------------------------------------------------------
function rangeToWindow(range) {
  const now = new Date();
  const timeMin = now.toISOString();
  if (range === "all") return { timeMin };
  const end = new Date(now);
  if (range === "month") end.setMonth(end.getMonth() + 1);
  else end.setDate(end.getDate() + 7); // week (default)
  end.setHours(23, 59, 59, 999);
  return { timeMin, timeMax: end.toISOString() };
}

async function runOnline(range) {
  const googleOAuthManager = require("./controllers/googleOAuthManager");

  if (!process.env.CALENDAR_ID) {
    console.error(c.red("CALENDAR_ID is not set in .env"));
    process.exit(1);
  }

  try {
    await googleOAuthManager.initializeAuth();
  } catch (err) {
    console.error(c.red("\nCould not authenticate with Google.\n"));
    console.error(c.dim(err.message));
    console.error(
      "\nThe saved authorization (token.json) is missing or expired. A developer needs to\n" +
        "re-authorize by opening  <server>/api/google/auth  and signing in with the Google\n" +
        "account that has access to the IABA events calendar."
    );
    process.exit(1);
  }

  const calendar = google.calendar({ version: "v3", auth: googleOAuthManager.getClient() });
  const window = rangeToWindow(range);

  console.log(
    c.dim(
      `Calendar : ${process.env.CALENDAR_ID}\n` +
        `Range    : ${range || "week"}  (${window.timeMin} -> ${window.timeMax || "no end"})\n` +
        `Note     : read-only preview, nothing is written to MongoDB`
    )
  );

  const res = await calendar.events.list({
    calendarId: process.env.CALENDAR_ID,
    timeMin: window.timeMin,
    timeMax: window.timeMax,
    maxResults: 50,
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = res.data.items || [];
  if (!events.length) {
    console.log(c.yellow("\nNo events found in that range."));
    return;
  }

  const parsedAll = events.map((event) => {
    const parsed = buildEventData(event);
    const warnings = collectWarnings({
      rawDescription: event.description || "",
      parsed,
      event,
    });
    return { event, parsed, warnings };
  });

  if (hasFlag("json")) {
    console.log(JSON.stringify(parsedAll.map((p) => p.parsed), null, 2));
    return;
  }

  console.log(c.bold(`\nFound ${events.length} event(s):`));
  parsedAll.forEach(({ event, parsed, warnings }, i) => {
    printParsed(`${i + 1}. ${event.summary || "(untitled)"}`, parsed, warnings);
  });

  const withWarnings = parsedAll.filter((p) => p.warnings.length).length;
  console.log(
    c.bold(
      `\n${"=".repeat(50)}\n${events.length} event(s), ${
        withWarnings ? c.yellow(withWarnings + " with things to check") : c.green("all clean")
      }`
    )
  );
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
(async () => {
  if (hasFlag("help") || hasFlag("h")) {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0].replace(/^\/\*+/, ""));
    process.exit(0);
  }

  const desc = getFlag("desc");
  const file = getFlag("file");

  try {
    if (typeof desc === "string" && desc.length) {
      runOffline(desc, "--desc");
    } else if (typeof file === "string" && file.length) {
      runOffline(fs.readFileSync(file, "utf8"), file);
    } else {
      await runOnline(getFlag("range"));
    }
  } catch (err) {
    console.error(c.red("\nError: " + err.message));
    process.exitCode = 1;
  } finally {
    // googleEventsController schedules a cron job on require, which keeps the
    // event loop alive - exit explicitly.
    process.exit(process.exitCode || 0);
  }
})();
