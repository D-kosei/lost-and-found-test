// src/app/admin/page.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import AdminNewItemForm from "@/components/AdminNewItemForm"
import AdminMasterEditor from "@/components/AdminMasterEditor"

export default function AdminPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [profile, setProfile] = useState<{ email?: string } | null>(null)

  // 起動時にセッション確認
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setProfile({ email: data.session?.user.email })
      setSessionReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setProfile({ email: s?.user?.email })
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setStatus("sending")
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/admin` },
    })
    if (error) {
      setStatus("error")
      setError(error.message)
      return
    }
    setStatus("sent")
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault()
    setStatus("sending")
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setStatus("error")
      setError(error.message)
      return
    }
    setStatus("idle")
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  if (!sessionReady) return <main className="p-6">読み込み中…</main>

  // 未ログイン → ログインフォーム（メールリンク＋開発用パスワード）
  if (!profile?.email) {
    return (
      <main className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">職員ログイン</h1>

        {/* メールリンク方式（SMTP設定済みなら使える） */}
        <form onSubmit={sendMagicLink} className="space-y-3 max-w-sm">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">職員メールアドレス</span>
            <input
              className="border rounded p-2"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
            />
          </label>
          <button className="border rounded px-4 py-2" disabled={status === "sending"}>
            {status === "sending" ? "送信中…" : "ログインリンクを送る"}
          </button>
          {status === "sent" && (
            <p className="text-green-700">メールを送信しました。届いたリンクを開いてください。</p>
          )}
          {status === "error" && <p className="text-red-700">エラー: {error}</p>}
        </form>

        {/* 開発用：パスワードログイン */}
        <form onSubmit={signInWithPassword} className="space-y-3 max-w-sm border-t pt-4">
          <div className="text-sm text-gray-600">（開発用）パスワードでログイン</div>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">職員メールアドレス</span>
            <input
              className="border rounded p-2"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-600">パスワード</span>
            <input
              className="border rounded p-2"
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="border rounded px-4 py-2" disabled={status === "sending"}>
            ログイン
          </button>
          {status === "error" && <p className="text-red-700">エラー: {error}</p>}
        </form>
      </main>
    )
  }

  // ログイン済み → 簡易ダッシュボード
  // ログイン済み → 簡易ダッシュボード
    return (
    <main className="p-6 space-y-6">
        <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">職員ダッシュボード</h1>
        <div className="text-sm">
            {profile.email}
            <button className="underline" onClick={signOut}>ログアウト</button>
        </div>
        </div>

        {/* マスタ編集（カテゴリ／色） */}
        <AdminMasterEditor />

        {/* 新規登録フォーム & 一覧 */}
        <AdminNewItemForm onCreated={() => location.reload()} />
        <ItemListForStaff />
    </main>
    )

}

function ItemListForStaff() {
  type Row = {
    id: string
    title: string
    status: "stored" | "claim_pending" | "returned" | "discarded"
    is_public: boolean
    registered_at: string
    storage_deadline: string
    storage_location: string
  }

  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // 一覧を取得（分離して再利用）
  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    const { data, error } = await supabase
      .from("lost_items")
      .select("id,title,status,is_public,registered_at,storage_deadline,storage_location")
      .order("registered_at", { ascending: false })
    if (error) setErr(error.message)
    setRows((data as Row[]) ?? [])
    setLoading(false)
  }, [])

  // 初回ロード＋Realtime購読
  useEffect(() => {
    load()
    const ch = supabase
      .channel("lost_items_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lost_items" },
        (payload) => {
          if (!rows) return
          if (payload.eventType === "UPDATE") {
            const newRow = payload.new as Partial<Row> & { id: string }
            setRows((prev) =>
              (prev ?? []).map((r) => (r.id === newRow.id ? { ...r, ...newRow } as Row : r))
            )
          } else {
            // 追加・削除は全件取り直しで簡潔に
            load()
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [load])

  if (loading) return <p>読み込み中…</p>
  if (err) return <p className="text-red-700">エラー：{err}</p>
  if (!rows?.length) return <p>データがありません。</p>

  return (
    <div className="border rounded p-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">タイトル</th>
            <th className="py-2">状態</th>
            <th className="py-2">操作</th>
            <th className="py-2">公開</th>
            <th className="py-2">登録日</th>
            <th className="py-2">保管場所</th>
          </tr>
        </thead>
        <tbody>
          {rows!.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="py-2">{r.title}</td>
              <td className="py-2">{r.status}</td>
              <td className="py-2">
                <button
                  className="underline text-blue-700"
                  onClick={async () => {
                    try {
                      const newStatus: Row["status"] = r.status === "stored" ? "returned" : "stored"
                      const newIsPublic = newStatus === "stored" ? true : false
                      if (!confirm(`状態を ${newStatus} に変更しますか？`)) return

                      // 楽観更新（UI先行）
                      setRows((prev) =>
                        (prev ?? []).map((row) =>
                          row.id === r.id ? { ...row, status: newStatus, is_public: newIsPublic } : row
                        )
                      )

                      const res = await fetch("/api/items/update", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          id: r.id,
                          status: newStatus,
                          // サーバ側でも同じロジックで上書きする
                          makePrivate: newStatus === "returned",
                          setReturnedAt: false,
                        }),
                      })

                      const json = await res.json().catch(() => ({}))
                      if (!res.ok) {
                        // ロールバック
                        setRows((prev) =>
                          (prev ?? []).map((row) =>
                            row.id === r.id ? { ...row, status: r.status, is_public: r.is_public } : row
                          )
                        )
                        alert(`更新に失敗しました［${res.status}］：${json?.error ?? res.statusText}`)
                        return
                      }

                      // サーバ確定値で最終上書き
                      setRows((prev) =>
                        (prev ?? []).map((row) =>
                          row.id === r.id ? { ...row, ...(json?.data ?? {}), is_public: newIsPublic } : row
                        )
                      )
                    } catch (e: any) {
                      // 想定外エラーもロールバック
                      setRows((prev) =>
                        (prev ?? []).map((row) =>
                          row.id === r.id ? { ...row, status: r.status, is_public: r.is_public } : row
                        )
                      )
                      alert("想定外のエラー：" + (e?.message ?? String(e)))
                    }
                  }}
                >
                  {r.status === "stored" ? "返却済みにする" : "保管中に戻す"}
                </button>
              </td>
              <td className="py-2">{String(r.is_public)}</td>
              <td className="py-2">{r.registered_at}</td>
              <td className="py-2">{r.storage_location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
