// src/app/api/claim/route.ts
import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient()

    const body = await req.json()
    const itemId = String(body.itemId ?? "").trim()
    const name = String(body.name ?? "").trim()
    const contact = String(body.contact ?? "").trim()
    const message = String(body.message ?? "").trim()

    if (!itemId || !name || !contact) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 })
    }

    const { error } = await supabase
      .from("claim_requests")
      .insert([{ item_id: itemId, name, contact, message }])

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "不正なリクエストです" }, { status: 400 })
  }
}
