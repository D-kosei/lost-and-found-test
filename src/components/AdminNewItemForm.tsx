// src/components/AdminNewItemForm.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Opt = { id: number; label: string }

export default function AdminNewItemForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [storageLocation, setStorageLocation] = useState("")
  const [categoryId, setCategoryId] = useState<number | "">("")
  const [colorId, setColorId] = useState<number | "">("")
  const [intakeNumber, setIntakeNumber] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [hasPII, setHasPII] = useState(false)
  const [cats, setCats] = useState<Opt[]>([])
  const [cols, setCols] = useState<Opt[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // マスタ取得（authenticated なら読める）
  useEffect(() => {
    ;(async () => {
      const [c1, c2] = await Promise.all([
        supabase.from("item_categories").select("id,label,sort_order").order("sort_order", { ascending: true }),
        supabase.from("item_colors").select("id,label,sort_order").order("sort_order", { ascending: true }),
      ])
      setCats((c1.data ?? []) as any)
      setCols((c2.data ?? []) as any)
    })()
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(null)

    // 必須チェック（最小）
    if (!title || !storageLocation || !categoryId) {
      setErr("必須項目が足りません（タイトル・保管場所・カテゴリ）")
      setBusy(false)
      return
    }

    const payload = {
      title,
      storage_location: storageLocation,
      category_id: Number(categoryId),
      color_id: colorId === "" ? null : Number(colorId),
      intake_number: intakeNumber || null,
      owner_name: ownerName || null,
      has_personal_info: hasPII,
      // registered_at はDBのdefault（today）に任せる
      // is_public はデフォルトtrue、statusはstored
    }

    const { data, error } = await supabase
      .from("lost_items")
      .insert([payload])
      .select("id")
      .single()

    setBusy(false)

    if (error) { setErr(error.message); return }

    // 完了：詳細へ飛ぶ or コールバック
    const id = data?.id as string
    if (onCreated) onCreated()
    if (id) router.push(`/items/${id}`)
  }

  return (
    <div className="border rounded p-4 space-y-3">
      <h2 className="text-lg font-semibold">落とし物を追加</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">タイトル（必須）</span>
          <input className="border rounded p-2" value={title} onChange={e=>setTitle(e.target.value)} required />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">カテゴリ（必須）</span>
                <select
                className="border rounded p-2"
                value={categoryId === "" ? "" : String(categoryId)}
                onChange={(e) =>
                    setCategoryId(e.target.value === "" ? "" : Number(e.target.value))
                }
                required
                >
                <option value="">選択してください</option>
                {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                    {c.label}
                    </option>
                ))}
                </select>
            </label>

            <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-600">色（任意）</span>
                <select
                className="border rounded p-2"
                value={colorId === "" ? "" : String(colorId)}
                onChange={(e) =>
                    setColorId(e.target.value === "" ? "" : Number(e.target.value))
                }
                >
                <option value="">未指定</option>
                {cols.map((c) => (
                    <option key={c.id} value={c.id}>
                    {c.label}
                    </option>
                ))}
                </select>
            </label>
            </div>


        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">保管場所（必須）</span>
          <input className="border rounded p-2" value={storageLocation} onChange={e=>setStorageLocation(e.target.value)} required />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">受付番号（任意・一意）</span>
            <input className="border rounded p-2" value={intakeNumber} onChange={e=>setIntakeNumber(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">持ち主名（任意）</span>
            <input className="border rounded p-2" value={ownerName} onChange={e=>setOwnerName(e.target.value)} />
          </label>
        </div>

        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={hasPII} onChange={(e)=>setHasPII(e.target.checked)} />
          <span className="text-sm">個人情報を含む</span>
        </label>

        <button type="submit" className="border rounded px-4 py-2" disabled={busy}>
          {busy ? "登録中…" : "登録する"}
        </button>

        {err && <p className="text-red-700">エラー: {err}</p>}
      </form>
    </div>
  )
}

