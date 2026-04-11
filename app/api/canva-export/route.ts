import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json();

    // Generate CSV for Canva Bulk Create
    const headers = ["text", "caption", "hashtags", "platform"];
    const csvRows = [
      headers.join(","),
      ...rows.map((row: any) =>
        headers.map(h => `"${(row[h] || "").replace(/"/g, '""')}"`).join(",")
      )
    ];

    const csv = csvRows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="dainamic-canva-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
