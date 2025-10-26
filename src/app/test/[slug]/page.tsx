// src/app/test/[slug]/page.tsx
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;
export const runtime = "nodejs";

export default async function DebugTest({ params }: { params: { slug?: string } }) {
  return (
    <pre style={{ padding: 16 }}>
{JSON.stringify({ here: "server", params, typeofSlug: typeof params?.slug }, null, 2)}
    </pre>
  );
}
