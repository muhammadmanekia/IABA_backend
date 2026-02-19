const Event = require("../models/Event");
const googleOAuthManager = require("../controllers/googleOAuthManager");
const { google } = require("googleapis");
const cron = require("node-cron");

function cleanEventDescription(description) {
  console.log("Description: ", description);
  if (!description) {
    return {
      description: "",
      imageUrl: "",
      price: "",
      registrationLink: "",
      location: "",
      audience: "",
      requireRSVP: false,
      organizers: "",
      contact: "",
    };
  }

  // 1. Clean HTML tags more intelligently to avoid joining text/URLs
  let cleanDesc = description
    .replace(/<(br|p|div|li|h[1-6])[^>]*>/gi, "\n") // Blocks to split into lines
    .replace(/<[^>]*>/g, " ")                      // Others to spaces

  cleanDesc = cleanDesc
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 2. Extract and remove first image URL
  const imageExtensionRegex = /(https?:\/\/[^\s<"']+\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?)/i;
  const imageMatch = cleanDesc.match(imageExtensionRegex);

  let imageUrl = "";
  if (imageMatch) {
    imageUrl = imageMatch[1].trim();
    cleanDesc = cleanDesc.replace(imageUrl, "");
  }

  // 3. Extract and remove structured fields
  const keywords = ["price", "registrationLink", "location", "audience", "RSVP", "organizers", "contact"];

  const extractField = (fieldName, type = "string") => {
    // Regex: fieldName: {greedy match} but stop before next keyword, comma, or newline
    // Lookahead: (?=\s*(?:price|location|...):|[, \n\r]|$)
    const keywordsPattern = keywords.join("|");
    const regex = new RegExp(`${fieldName}:\\s*(.*?)(?=\\s*(?:${keywordsPattern}):|[\\n\\r]|$)`, "i");

    const match = cleanDesc.match(regex);
    if (match) {
      // Remove the exact matched part from the description
      cleanDesc = cleanDesc.replace(match[0], "");

      let value = match[1].trim();
      // Clean up trailing commas if any
      value = value.replace(/,$/, "").trim();

      if (type === "boolean") {
        return value.toLowerCase() === "true" || value.toLowerCase() === "yes" || value.toLowerCase() === "required";
      }
      return value;
    }
    return type === "boolean" ? null : "";
  };

  const fields = {
    price: extractField("price"),
    registrationLink: extractField("registrationLink"),
    location: extractField("location"),
    audience: extractField("audience"),
    requireRSVP: extractField("RSVP", "boolean"),
    organizers: extractField("organizers"),
    contact: extractField("contact"),
  };

  // Clean up the description
  let finalDesc = cleanDesc
    .split(/-{5,}/)[0]                 // Split on five or more dashes
    .replace(/,\s*,/g, ",")            // Remove double commas
    .replace(/[ \t]+/g, " ")           // Collapse horizontal whitespace
    .replace(/[ \t]*\n[ \t]*/g, "\n\n")  // Remove horizontal whitespace around newlines
    .replace(/\n+/g, "\n\n")             // Collapse multiple newlines into one
    .trim()
    .replace(/^[, ]+|[, ]+$/g, "");    // Remove leading/trailing commas or spaces

  return {
    description: finalDesc,
    imageUrl,
    ...fields,
  };
}

function formatTime(timeString) {
  const date = new Date(timeString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

async function syncEvents(timeMin, timeMax) {
  try {
    // Initialize OAuth client
    await googleOAuthManager.initializeAuth();
    const oauth2Client = googleOAuthManager.getClient();

    // Create Google Calendar API client
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const tokens = googleOAuthManager.loadTokens();
    if (!tokens) {
      console.error("Sync failed: Authentication required (no tokens found)");
      return { success: false, message: "Authentication required" };
    }

    // Fetch events from primary calendar
    const params = {
      calendarId: process.env.CALENDAR_ID,
      timeMin: timeMin || new Date().toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: "startTime",
    };

    if (timeMax) {
      params.timeMax = timeMax;
    }

    const response = await calendar.events.list(params);

    const events = response.data.items;
    const syncResults = await Promise.all(
      events.map(async (event) => {
        const extractedData = cleanEventDescription(event.description || "");

        const eventData = {
          title: event.summary,
          description: extractedData.description || "",
          date: new Date(event.start.dateTime || event.start.date),
          startTime:
            formatTime(event.start.dateTime) || formatTime(event.start.date),
          endTime: formatTime(event.end.dateTime) || formatTime(event.end.date),
          location: extractedData.location || event.location || "",
          imageUrl: extractedData.imageUrl || "",
          price: extractedData.price || "",
          organizers: extractedData.organizers || "IABA",
          registrationLink: extractedData.registrationLink || "",
          contact: extractedData.contact || "",
          requireRSVP: extractedData.requireRSVP !== null ? extractedData.requireRSVP : false,
          audience: extractedData.audience || "",
          googleId: event.id,
          startDateTime: event.start.dateTime || event.start.date,
          endDateTime: event.end.dateTime || event.end.date,
        };

        const existingEvent = await Event.findOne({ googleId: event.id });
        if (existingEvent) {
          // Update existing event
          return await Event.findOneAndUpdate({ googleId: event.id }, eventData, {
            new: true,
          });
        } else {
          // Create new event
          const newEvent = new Event(eventData);
          return await newEvent.save();
        }
      })
    );

    console.log(`Synced ${syncResults.length} events from Google Calendar.`);
    return { success: true, count: syncResults.length, events: syncResults };
  } catch (error) {
    console.error("Error syncing events:", error);
    return { success: false, error: error.message };
  }
}

exports.fetchAndSaveEvents = async (req, res) => {
  const { timeMin, timeMax } = req.query;
  const result = await syncEvents(timeMin, timeMax);

  if (result.success) {
    res.status(200).json({
      message: "Events fetched and saved successfully",
      eventCount: result.count,
      events: result.events,
    });
  } else {
    if (result.message === "Authentication required") {
      return res.status(401).json({
        message: result.message,
        authUrl: googleOAuthManager.generateAuthUrl(),
      });
    }
    res.status(500).json({
      message: "Error fetching or saving events",
      error: result.error,
    });
  }
};

// Cron job: Every Sunday at 8:00 PM CST
// Cron Format: minute hour dayOfMonth month dayOfWeek
// 0 20 * * 0 is Sunday at 8 PM
cron.schedule("0 20 * * 0", async () => {
  console.log("Running scheduled Google Calendar sync (Sunday 8 PM)...");

  const syncRange = process.env.SYNC_RANGE || "week";
  const now = new Date();

  // timeMin: Next Monday 00:00:00
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + 1);
  nextMonday.setHours(0, 0, 0, 0);

  let timeMax = null;

  if (syncRange === "week") {
    // Next Sunday 23:59:59
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);
    nextSunday.setHours(23, 59, 59, 999);
    timeMax = nextSunday.toISOString();
  } else if (syncRange === "month") {
    // End of next month
    const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    endOfNextMonth.setHours(23, 59, 59, 999);
    timeMax = endOfNextMonth.toISOString();
  } else if (syncRange === "unlimited") {
    timeMax = null;
  }

  console.log(`Syncing events (Range: ${syncRange}) from ${nextMonday.toISOString()} to ${timeMax || "Unlimited"}`);

  await syncEvents(nextMonday.toISOString(), timeMax);
}, {
  timezone: "America/Chicago"
});

exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ start: 1 });
    res.status(200).json(events);
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving events",
      error: error.message,
    });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({
      message: "Error retrieving event",
      error: error.message,
    });
  }
};
