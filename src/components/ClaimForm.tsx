// src/components/ClaimForm.tsx
"use client"

import { useState } from "react"

export default function ClaimForm({ itemId }: { itemId: string }) {
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<null | "ok" | "ng">(null)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setDone(null)
    setErr(null)

    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, name, contact, message }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "送信に失敗しました")
      setDone("ok")
      setName("")
      setContact("")
      setMessage("")
    } catch (e: any) {
      setDone("ng")
      setErr(e.message ?? "送信に失敗しました")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-8 border rounded-md p-4">
      <h2 className="text-xl font-semibold mb-3">受取申請</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">お名前（必須）</label>
          <input
            className="border rounded p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">連絡先（必須：メールか電話）</label>
          <input
            className="border rounded p-2"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">メッセージ（任意）</label>
          <textarea
            className="border rounded p-2"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-md border disabled:opacity-60"
        >
          {busy ? "送信中…" : "申請を送信"}
        </button>
      </form>

      {done === "ok" && (
        <p className="text-green-700 mt-3">申請を受け付けました。担当から連絡します。</p>
      )}
      {done === "ng" && (
        <p className="text-red-700 mt-3">エラー：{err}</p>
      )}
    </div>
  )
}
