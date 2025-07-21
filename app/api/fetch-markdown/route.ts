import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const url = searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
  }

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const content = await response.text()

    // Extract filename from URL
    const urlParts = url.split("/")
    const filename = urlParts[urlParts.length - 1]?.replace(/\.(md|markdown)$/i, "") || "fetched-markdown"

    return NextResponse.json({
      content,
      filename,
    })
  } catch (error) {
    console.error("Error fetching markdown:", error)
    return NextResponse.json({ error: "Failed to fetch markdown from URL" }, { status: 500 })
  }
}
