// src/app/api/items/update/route.ts
import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ALLOWED = new Set(["stored", "claim_pending", "returned", "discarded"] as const)

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient()

    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const id = String(body?.id ?? "").trim()
    const status = String(body?.status ?? "").trim()
    const setReturnedAt = Boolean(body?.setReturnedAt)

    if (!id || !status) {
      return NextResponse.json({ error: "id と status は必須です" }, { status: 400 })
    }
    if (!ALLOWED.has(status as any)) {
      return NextResponse.json({ error: "status が不正です" }, { status: 422 })
    }

    // 状態と公開を常にリンク
    const patch: Record<string, any> = {
      status,
      is_public: status === "stored",
      updated_at: new Date().toISOString(),
    }
    // returned_at 列がある場合のみ使う
    // if (setReturnedAt && status === "returned") {
    //   patch.returned_at = new Date().toISOString()
    // }

    const { data, error } = await supabase
      .from("lost_items")
      .update(patch)
      .eq("id", id)
      .select("id, status, is_public, updated_at")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    console.error("[/api/items/update] error:", e)
    return NextResponse.json({ error: e?.message ?? "bad request" }, { status: 400 })
  }
}