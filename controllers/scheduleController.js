const mongoose = require("mongoose");
const ScheduledNotification = require("../models/ScheduledNotification");
const Notification = require("../models/Notifications");

exports.scheduleNotification = async (req, res) => {
  const { topic, title, body, screen, eventId, sendAt } = req.body;

  // In development, use a dev-specific topic to avoid sending to production users
  const isDev = process.env.NODE_ENV !== "production";
  const effectiveTopic = isDev ? `${topic}_dev` : topic;

  if (isDev) {
    console.log(`[DEV] Scheduling notification to dev topic "${effectiveTopic}": ${title}`);
  }

  const newSendAt = sendAt || new Date();

  try {
    if (eventId && eventId !== "null") {
      // --- Event-based notification: use atomic upsert to prevent race conditions ---

      // First, check if already sent (in Notification collection)
      const alreadySent = await Notification.findOne({ eventId, status: "sent" });
      if (alreadySent) {
        const sendAtChanged = Math.abs(
          new Date(alreadySent.sendAt).getTime() - new Date(newSendAt).getTime()
        ) > 60000;

        if (!sendAtChanged) {
          return res.status(200).json({ success: true, message: "Notification already sent." });
        }
        // Event rescheduled — remove old sent record so it can be re-scheduled
        await Notification.deleteOne({ _id: alreadySent._id });
      }

      // Atomic upsert: find by eventId, update or create in one operation
      // This prevents race conditions where two requests both find nothing
      await ScheduledNotification.findOneAndUpdate(
        { eventId },
        {
          $set: {
            topic: effectiveTopic,
            title,
            body,
            screen,
            sendAt: newSendAt,
            status: "pending",
          },
          $setOnInsert: {
            eventId,
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      console.log(`[Notification] Upserted notification for event ${eventId}: "${title}"`);
    } else {
      // --- Non-event notification (sheikh messages, etc): dedup by title+body window ---
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const existing = await ScheduledNotification.findOne({
        title,
        body,
        createdAt: { $gte: fiveMinutesAgo },
      });

      if (existing) {
        return res.status(200).json({ success: true, message: "Duplicate notification skipped." });
      }

      await ScheduledNotification.create({
        topic: effectiveTopic,
        title,
        body,
        screen,
        eventId: null,
        sendAt: newSendAt,
        createdAt: new Date(),
        status: "pending",
      });

      console.log(`[Notification] Scheduled new notification: "${title}"`);
    }

    res.status(200).json({ success: true, message: "Notification scheduled successfully." });
  } catch (error) {
    console.error("Error scheduling notification:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  const { id } = req.params;

  console.log(id);

  try {
    const deletedNotification = await ScheduledNotification.findOne({
      eventId: id,
    });

    if (!deletedNotification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    res.status(200).json({ message: "Notification successfully deleted." });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ message: error.message });
  }
};
