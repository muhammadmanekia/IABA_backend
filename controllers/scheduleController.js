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

  try {
    // Check if a scheduled notification for this event ID already exists
    let existingNotification;
    if (eventId && eventId !== "null") {
      existingNotification = await ScheduledNotification.findOne({
        eventId,
      });

      // Also check if this notification was already sent (lives in Notification collection)
      if (!existingNotification) {
        const alreadySent = await Notification.findOne({
          eventId,
          status: "sent",
        });
        if (alreadySent) {
          // Check if the sendAt time changed (event rescheduled)
          const newSendAt = sendAt || new Date();
          const sendAtChanged = Math.abs(
            new Date(alreadySent.sendAt).getTime() - new Date(newSendAt).getTime()
          ) > 60000;

          if (!sendAtChanged) {
            // Already sent and not rescheduled — skip
            return res
              .status(200)
              .json({ success: true, message: "Notification already sent." });
          }
          // Event was rescheduled — delete old sent record and allow re-scheduling
          await Notification.deleteOne({ _id: alreadySent._id });
        }
      }
    } else {
      // Dedup window: prevent duplicate notifications with the same title+body
      // within a 5-minute window (handles cases like sheikh messages with no eventId)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      existingNotification = await ScheduledNotification.findOne({
        title,
        body,
        createdAt: { $gte: fiveMinutesAgo },
      });
    }

    if (existingNotification) {
      // Only re-schedule if sendAt time actually changed (event was rescheduled)
      // or if it's still pending. Don't reset already-sent notifications.
      const newSendAt = sendAt || new Date();
      const sendAtChanged = Math.abs(
        new Date(existingNotification.sendAt).getTime() - new Date(newSendAt).getTime()
      ) > 60000; // More than 1 minute difference

      if (existingNotification.status === "sent" && !sendAtChanged) {
        // Already sent and schedule hasn't changed — skip
        return res
          .status(200)
          .json({ success: true, message: "Notification already sent." });
      }

      existingNotification.sendAt = newSendAt;
      existingNotification.status = "pending";
      existingNotification.title = title;
      existingNotification.body = body;
      existingNotification.screen = screen;
      existingNotification.topic = effectiveTopic;
      await existingNotification.save();
      console.log(`[Notification] Updated existing notification: "${title}"`);
    } else {
      // Create a new scheduled notification
      const newScheduledNotification = new ScheduledNotification({
        topic: effectiveTopic,
        title,
        body,
        screen,
        eventId: eventId && eventId !== "null" ? eventId : null,
        sendAt: sendAt || new Date(),
        createdAt: new Date(),
        status: "pending",
      });
      await newScheduledNotification.save();
      console.log(`[Notification] Scheduled new notification: "${title}"`);
    }

    res
      .status(200)
      .json({ success: true, message: "Notification scheduled successfully." });
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
