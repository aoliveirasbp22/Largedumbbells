const GHL_API_KEY = process.env.GHL_API_KEY
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID

export async function GET() {
  try {
    let allContacts = []
    let hasMore = true
    let startAfter = null
    let startAfterId = null

    while (hasMore) {
      let url = `https://services.leadconnectorhq.com/contacts/?locationId=${GHL_LOCATION_ID}&limit=100`
      if (startAfter && startAfterId) {
        url += `&startAfter=${startAfter}&startAfterId=${startAfterId}`
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      })

      if (!res.ok) {
        const err = await res.text()
        return Response.json({ error: err }, { status: 400 })
      }

      const data = await res.json()
      const contacts = data.contacts || []
      allContacts = [...allContacts, ...contacts]

      if (contacts.length < 100) {
        hasMore = false
      } else {
        const last = contacts[contacts.length - 1]
        startAfter = last.dateAdded ? new Date(last.dateAdded).getTime() : null
        startAfterId = last.id
        if (!startAfter) hasMore = false
      }
    }

    return Response.json({ contacts: allContacts })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}