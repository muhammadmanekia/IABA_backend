function cleanEventDescription(description) {
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
        .replace(/<[^>]*>/g, " ");                      // Others to spaces

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
        .replace(/\s+/g, " ")             // Collapse whitespace
        .trim()
        .replace(/^[, ]+|[, ]+$/g, "");    // Remove leading/trailing commas or spaces

    return {
        description: finalDesc,
        imageUrl,
        ...fields,
    };
}

const testCases = [
    {
        name: "User Reported Case (Joined text and comma separators)",
        input: `https://www.techsmith.com/wp-content/uploads/2023/08/What-are-High-Resolution-Images.pngI have implemented and verified the structured field extraction logic. All tests passed, confirming that fields like price and contact are correctly extracted and removed from the description. I am now updating the walkthrough and cleaning up. https://www.google.com/mapsImplementation plan to update Google Calendar event image extraction logic. Instead of finding <img> tags, it will now identify image URLs by their extensions.price: $20, registrationLink: https://www.google.com,location: "IABA",audience: "people"RSVP: true organizers: IABA contact: 291-492-3242`,
        expected: {
            imageUrl: "https://www.techsmith.com/wp-content/uploads/2023/08/What-are-High-Resolution-Images.png",
            price: "$20",
            registrationLink: "https://www.google.com",
            location: '"IABA"',
            audience: '"people"',
            requireRSVP: true,
            organizers: "IABA",
            contact: "291-492-3242"
        }
    },
    {
        name: "HTML Case with <br>",
        input: `https://example.com/pic.jpg<br>Description text<br>price: Free<br>RSVP: Yes`,
        expected: {
            imageUrl: "https://example.com/pic.jpg",
            description: "Description text",
            price: "Free",
            requireRSVP: true
        }
    }
];

testCases.forEach(tc => {
    const result = cleanEventDescription(tc.input);
    let pass = true;

    if (tc.expected.description && result.description !== tc.expected.description) {
        console.log(`❌ [FAIL] ${tc.name} - Description mismatch`);
        console.log(`   Expected: "${tc.expected.description}"`);
        console.log(`   Got:      "${result.description}"`);
        pass = false;
    }

    for (const field in tc.expected) {
        if (field === 'description') continue;
        if (result[field] !== tc.expected[field]) {
            console.log(`❌ [FAIL] ${tc.name} - Field ${field} mismatch`);
            console.log(`   Expected: ${tc.expected[field]}`);
            console.log(`   Got:      ${result[field]}`);
            pass = false;
        }

        // Check if the extracted values are REMOVED from the description
        if (result[field] && typeof result[field] === 'string' && result.description.includes(result[field]) && field !== 'description') {
            // Only if it's a unique string, price $20 is a good check
            if (field === 'price' || (field === 'contact' && result[field].length > 5) || (field === 'registrationLink' && result[field].length > 10)) {
                console.log(`❌ [FAIL] ${tc.name} - Field ${field} value ("${result[field]}") still present in description!`);
                pass = false;
            }
        }
    }

    if (pass) console.log(`✅ [PASS] ${tc.name}`);
});
