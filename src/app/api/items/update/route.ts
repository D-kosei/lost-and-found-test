// src/app/api/items/update/route.ts
import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabaseServer"

const ALLOWED = new Set(["stored", "claim_pending", "returned", "discarded"] as const)

export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient()

    // 職員ログイン必須
    const { data: { user }, error: userErr } = await supabase.auth.getUser()
    if (userErr || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const id = String(body?.id ?? "").trim()
    const status = String(body?.status ?? "").trim()
    const makePrivate = Boolean(body?.makePrivate)
    const setReturnedAt = Boolean(body?.setReturnedAt)

    if (!id || !status) {
      return NextResponse.json({ error: "id と status は必須です" }, { status: 400 })
    }
    if (!ALLOWED.has(status as any)) {
      return NextResponse.json({ error: "status が不正です" }, { status: 422 })
    }

    // ここで「存在するカラムのみ」更新するパッチを作る
    const patch: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
      is_public: status === "stored" ? true : false,
    }
    if (makePrivate && status === "returned") {
      patch.is_public = false
    }
    // returned_atがDBに無い環境では追加しない（あるなら有効化）
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
     // 確定した最新レコードを返す
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "bad request" }, { status: 400 })
  }
}
