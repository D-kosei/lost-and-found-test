// 最新を毎回取りに行く
export const revalidate = 0;

// src/app/items/page.tsx
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type Search = { category?: string; color?: string }

export default async function ItemsPage({ searchParams }: { searchParams: Search }) {
  const category = searchParams?.category ?? ""
  const color = searchParams?.color ?? ""

  // プルダウン用マスタ
  const [catRes, colRes] = await Promise.all([
    supabase.from("item_categories").select("id,label,sort_order").order("sort_order", { ascending: true }),
    supabase.from("item_colors").select("id,label,sort_order").order("sort_order", { ascending: true }),
  ])
  const categories = catRes.data ?? []
  const colors = colRes.data ?? []

  // 一覧クエリ（公開のみ）
  let query = supabase
    .from("lost_items")
    .select("id,title,storage_location,status,registered_at,storage_deadline,category_id,color_id,is_public")
    .eq("is_public", true)
    .order("registered_at", { ascending: false })

  if (category) query = query.eq("category_id", Number(category))
  if (color) query = query.eq("color_id", Number(color))

  const { data, error } = await query
  if (error) return <p className="p-6">エラー: {error.message}</p>

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">落とし物一覧</h1>

      {/* フィルタ（GET） */}
      <form method="GET" className="flex gap-3 items-end border p-4 rounded">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">カテゴリ</span>
          <select name="category" defaultValue={category} className="border rounded p-2">
            <option value="">すべて</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-600">色</span>
          <select name="color" defaultValue={color} className="border rounded p-2">
            <option value="">すべて</option>
            {colors.map((c: any) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>

        <button className="border rounded px-4 py-2">絞り込む</button>
        <Link href="/items" className="underline text-sm">条件リセット</Link>
      </form>

      {/* 一覧 */}
      {!data?.length ? (
        <p>該当データがありません。</p>
      ) : (
        <ul className="space-y-4">
          {data.map((item: any) => (
            <li key={item.id} className="border p-4 rounded-md">
              <Link href={`/items/${item.id}`} className="font-semibold underline">
                {item.title}
              </Link>
              <p>保管場所：{item.storage_location}</p>
              <p>登録日：{item.registered_at}</p>
              <p>保管期限：{item.storage_deadline}</p>
              <p>状態：{item.status}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
