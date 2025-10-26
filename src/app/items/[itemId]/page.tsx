// src/app/items/[itemId]/page.tsx
export const dynamicParams = true;
export const revalidate = 0;

import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";
import ClaimForm from "@/components/ClaimForm"

type Props = { params: { itemId?: string } };

export default async function ItemDetailPage({ params }: Props) {
  const itemId = params?.itemId;
  if (!itemId) return notFound(); // 未取得なら即404で守る

  const { data, error } = await supabase
    .from("lost_items")
    .select(`
      id,
      title,
      storage_location,
      status,
      registered_at,
      storage_deadline,
      intake_number,
      owner_name,
      has_personal_info
    `)
    .eq("id", itemId)
    .single();

  if (error?.code === "PGRST116") return notFound();
  if (error) return <p>エラー: {error.message}</p>;
  if (!data) return notFound();

  const mask = (s?: string | null) => {
    if (!s) return "";
    if (s.length <= 2) return s[0] + "＊";
    return s[0] + "＊".repeat(Math.max(1, s.length - 2)) + s[s.length - 1];
  };

  const maskedIntake = data.intake_number
    ? data.intake_number.replace(/.(?=.{4}$)/g, "*")
    : "-";

  return (
    <main className="p-6 space-y-4">
      <Link href={{ pathname: "/items", query: { /* category, color を埋めるならここ */ } }} className="underline">
        ← 一覧に戻る
      </Link>
      <h1 className="text-2xl font-bold">{data.title}</h1>
      <div className="border rounded-md p-4 space-y-2">
        <p>保管場所：{data.storage_location}</p>
        <p>登録日：{data.registered_at}</p>
        <p>保管期限：{data.storage_deadline}</p>
        <p>状態：{data.status}</p>
        <p>受付番号：{maskedIntake}</p>
        <p>持ち主名（マスク）：{mask(data.owner_name) || "-"}</p>
        <p>
          画像：
          {data.has_personal_info ? (
            <span>個人情報を含むため公開しません</span>
          ) : (
            <span>（MVPでは未実装）</span>
          )}
        </p>
      </div>
      <ClaimForm itemId={itemId} />
    </main>
  );
}
