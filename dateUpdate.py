from datetime import datetime, timedelta
from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient(
    "mongodb+srv://muhammadmanekia:dbUserPassword@cluster0.xfvhsg6.mongodb.net/"
)
db = client["Momin"]
collection = db["events"]


def convert_to_24hr(time_str):
    """
    Convert 12-hour format time string to 24-hour format
    e.g., "7:00 PM" -> "19:00"
    """
    if not isinstance(time_str, str) or not time_str.strip():
        return None

    try:
        # Parse the 12-hour format time
        parsed_time = datetime.strptime(time_str.strip(), "%I:%M %p")
        # Convert to 24-hour format string
        return parsed_time.strftime("%H:%M")
    except ValueError as e:
        print(f"Error converting time '{time_str}': {e}")
        return None


def parse_time(time_str):
    """
    Parse 24-hour format time string to datetime.time object
    """
    if not time_str:
        return None

    try:
        # Parse the 24-hour format time
        parsed_time = datetime.strptime(time_str, "%H:%M")
        return parsed_time.time()
    except ValueError as e:
        print(f"Error parsing time '{time_str}': {e}")
        return None


# Fetch all documents
for document in collection.find():
    try:
        # Convert date field
        if isinstance(document.get("date"), dict) and "$date" in document["date"]:
            date = datetime.fromisoformat(document["date"]["$date"][:-1])
        elif isinstance(document.get("date"), datetime):
            date = document["date"]
        else:
            print(f"Skipping document {document['_id']}: Invalid date format")
            continue

        # Convert times to 24-hour format first
        start_time_24h = convert_to_24hr(document.get("startTime"))
        end_time_24h = convert_to_24hr(document.get("endTime"))

        # Parse the 24-hour format times
        start_time = parse_time(start_time_24h)
        end_time = parse_time(end_time_24h)

        # Create full datetime objects (in UTC)
        cst_offset = timedelta(hours=6)  # CST is UTC-6

        # Combine date with times and adjust for timezone
        start_datetime = None
        if start_time:
            start_datetime = datetime.combine(date.date(), start_time)
            start_datetime = start_datetime + cst_offset  # Convert to UTC

        end_datetime = None
        if end_time:
            end_datetime = datetime.combine(date.date(), end_time)
            end_datetime = end_datetime + cst_offset  # Convert to UTC

        # Format datetimes as ISO strings with Z suffix for UTC
        start_datetime_str = (
            start_datetime.isoformat() + "Z" if start_datetime else None
        )
        end_datetime_str = end_datetime.isoformat() + "Z" if end_datetime else None

        # Update document in MongoDB
        collection.update_one(
            {"_id": document["_id"]},
            {
                "$set": {
                    "startDateTime": start_datetime_str,
                    "endDateTime": end_datetime_str,
                }
            },
        )

        print(f"Updated document {document['_id']}:")
        print(f"  Original start time: {document.get('startTime')}")
        print(f"  24-hour start time: {start_time_24h}")
        print(f"  Original end time: {document.get('endTime')}")
        print(f"  24-hour end time: {end_time_24h}")
        print(f"  New startDateTime: {start_datetime_str}")
        print(f"  New endDateTime: {end_datetime_str}")
        print("---")

    except Exception as e:
        print(f"Error processing document {document['_id']}: {e}")

print("All documents updated successfully.")
