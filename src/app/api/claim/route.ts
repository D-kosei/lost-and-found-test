// src/app/api/claim/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const itemId = String(body.itemId || "").trim();
    const name = String(body.name || "").trim();
    const contact = String(body.contact || "").trim();
    const message = (body.message ? String(body.message) : "").trim();

    // 超簡易バリデーション
    if (!itemId || !name || !contact) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    // RLSで anon から INSERT を許可しているので、そのまま挿入できる
    const { error } = await supabase
      .from("claim_requests")
      .insert([{ item_id: itemId, name, contact, message }]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "不正なリクエストです" }, { status: 400 });
  }
}

