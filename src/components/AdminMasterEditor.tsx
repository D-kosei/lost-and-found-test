// src/components/AdminMasterEditor.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Row = { id: number; code: string; label: string; sort_order: number }

type TabKind = "categories" | "colors"
const tableName: Record<TabKind, string> = {
  categories: "item_categories",
  colors: "item_colors",
}

export default function AdminMasterEditor() {
  const [tab, setTab] = useState<TabKind>("categories")
  return (
    <div className="border rounded p-4 space-y-4">
      <div className="flex gap-2">
        <button className={`px-3 py-1 rounded border ${tab==="categories"?"bg-gray-100":""}`}
          onClick={() => setTab("categories")}
        >
          カテゴリ
        </button>
        <button className={`px-3 py-1 rounded border ${tab==="colors"?"bg-gray-100":""}`}
          onClick={() => setTab("colors")}
        >
          色
        </button>
      </div>
      <MasterPane kind={tab} />
    </div>
  )
}

function MasterPane({ kind }: { kind: TabKind }) {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const tname = tableName[kind]
  const title = useMemo(() => (kind === "categories" ? "カテゴリ" : "色"), [kind])

  async function load() {
    setLoading(true); setErr(null)
    const { data, error } = await supabase
      .from(tname)
      .select("id, code, label, sort_order")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true })
    if (error) setErr(error.message)
    setRows((data ?? []) as Row[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind])

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{title}マスタ</h2>

      <NewRowForm kind={kind} onSaved={load} />

      {loading ? (
        <p>読み込み中…</p>
      ) : err ? (
        <p className="text-red-700">エラー: {err}</p>
      ) : !rows.length ? (
        <p>データがありません。</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 w-[6rem]">ID</th>
              <th className="py-2 w-[12rem]">コード</th>
              <th className="py-2">ラベル</th>
              <th className="py-2 w-[8rem]">並び順</th>
              <th className="py-2 w-[12rem]">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <EditableRow key={r.id} kind={kind} row={r} onSaved={load} onDeleted={load} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function NewRowForm({ kind, onSaved }: { kind: TabKind; onSaved: () => void }) {
  const tname = tableName[kind]
  const [code, setCode] = useState("")
  const [label, setLabel] = useState("")
  const [sortOrder, setSortOrder] = useState<number | "">("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(null)
    if (!code.trim() || !label.trim()) {
      setErr("コードとラベルは必須です")
      setBusy(false)
      return
    }
    const payload: Partial<Row> = {
      code: code.trim(),
      label: label.trim(),
      sort_order: sortOrder === "" ? 0 : Number(sortOrder),
    }
    const { error } = await supabase.from(tname).insert([payload])
    setBusy(false)
    if (error) { setErr(error.message); return }
    setCode(""); setLabel(""); setSortOrder("")
    onSaved()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 border p-3 rounded">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">コード（必須・一意）</span>
        <input className="border rounded p-2 w-48" value={code} onChange={e=>setCode(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">ラベル（必須）</span>
        <input className="border rounded p-2 w-64" value={label} onChange={e=>setLabel(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-600">並び順（数値）</span>
        <input className="border rounded p-2 w-28"
          inputMode="numeric"
          value={sortOrder === "" ? "" : String(sortOrder)}
          onChange={(e)=> setSortOrder(e.target.value === "" ? "" : Number(e.target.value))}
        />
      </label>
      <button type="submit" className="border rounded px-4 py-2" disabled={busy}>
        {busy ? "追加中…" : "追加"}
      </button>
      {err && <span className="text-red-700">{err}</span>}
    </form>
  )
}

function EditableRow({
  kind, row, onSaved, onDeleted,
}: {
  kind: TabKind; row: Row; onSaved: () => void; onDeleted: () => void
}) {
  const tname = tableName[kind]
  const [editing, setEditing] = useState(false)
  const [code, setCode] = useState(row.code)
  const [label, setLabel] = useState(row.label)
  const [sortOrder, setSortOrder] = useState<number | "">(row.sort_order)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setBusy(true); setErr(null)
    if (!code.trim() || !label.trim()) {
      setErr("コードとラベルは必須です")
      setBusy(false)
      return
    }
    const { error } = await supabase
      .from(tname)
      .update({
        code: code.trim(),
        label: label.trim(),
        sort_order: sortOrder === "" ? 0 : Number(sortOrder),
      })
      .eq("id", row.id)
    setBusy(false)
    if (error) { setErr(error.message); return }
    setEditing(false)
    onSaved()
  }

  async function remove() {
    if (!confirm("この行を削除します。よろしいですか？")) return
    setBusy(true); setErr(null)
    const { error } = await supabase.from(tname).delete().eq("id", row.id)
    setBusy(false)
    if (error) { setErr(error.message); return }
    onDeleted()
  }

  return (
    <tr className="border-b">
      <td className="py-2 pr-2">{row.id}</td>
      <td className="py-2 pr-2">
        {editing ? (
          <input className="border rounded p-1 w-44" value={code} onChange={e=>setCode(e.target.value)} />
        ) : (
          <span>{row.code}</span>
        )}
      </td>
      <td className="py-2 pr-2">
        {editing ? (
          <input className="border rounded p-1 w-full" value={label} onChange={e=>setLabel(e.target.value)} />
        ) : (
          <span>{row.label}</span>
        )}
      </td>
      <td className="py-2 pr-2">
        {editing ? (
          <input className="border rounded p-1 w-24"
            inputMode="numeric"
            value={sortOrder === "" ? "" : String(sortOrder)}
            onChange={(e)=> setSortOrder(e.target.value === "" ? "" : Number(e.target.value))}
          />
        ) : (
          <span>{row.sort_order}</span>
        )}
      </td>
      <td className="py-2 flex gap-2">
        {!editing ? (
          <>
            <button className="underline" onClick={()=>setEditing(true)}>編集</button>
            <button className="underline text-red-700" onClick={remove} disabled={busy}>削除</button>
          </>
        ) : (
          <>
            <button className="underline" onClick={save} disabled={busy}>{busy ? "保存中…" : "保存"}</button>
            <button className="underline" onClick={() => { setEditing(false); setCode(row.code); setLabel(row.label); setSortOrder(row.sort_order) }}>取消</button>
          </>
        )}
        {err && <span className="text-red-700 ml-2">{err}</span>}
      </td>
    </tr>
  )
}

