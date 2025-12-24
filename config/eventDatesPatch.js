const { MongoClient } = require("mongodb");

async function fixEventDates() {
  const uri = "";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db("your_database"); // Replace with your database name
    const collection = db.collection("your_collection"); // Replace with your collection name

    // Fetch all events with a date field
    const events = await collection.find({ date: { $exists: true } }).toArray();

    for (let event of events) {
      const eventDate = new Date(event.date);
      const eventDateStr = eventDate.toISOString().split("T")[0]; // Extract YYYY-MM-DD

      let updates = {};

      if (event.startDateTime) {
        let startDate = new Date(event.startDateTime);
        let startTimeStr = startDate.toISOString().split("T")[1]; // Extract HH:MM:SS.xxxZ
        let newStartDateTime = new Date(`${eventDateStr}T${startTimeStr}`);

        if (startDate.toISOString().split("T")[0] !== eventDateStr) {
          updates.startDateTime = newStartDateTime;
        }
      }

      if (event.endDateTime) {
        let endDate = new Date(event.endDateTime);
        let endTimeStr = endDate.toISOString().split("T")[1]; // Extract HH:MM:SS.xxxZ
        let newEndDateTime = new Date(`${eventDateStr}T${endTimeStr}`);

        if (endDate.toISOString().split("T")[0] !== eventDateStr) {
          updates.endDateTime = newEndDateTime;
        }
      }

      // Only update if there's a change
      if (Object.keys(updates).length > 0) {
        await collection.updateOne({ _id: event._id }, { $set: updates });
        console.log(`Updated event: ${event.title}`);
      }
    }
    console.log("Date inconsistencies fixed successfully.");
  } finally {
    await client.close();
  }
}

fixEventDates().catch(console.error);
