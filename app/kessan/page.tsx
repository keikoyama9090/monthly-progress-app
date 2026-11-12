import { KessanClient } from "@/components/kessan-client";
import { fetchKessanCards } from "@/lib/kessan-db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "決算 | 月次進捗管理",
};

export default async function KessanPage() {
  const cards = await fetchKessanCards();
  return <KessanClient initialCards={JSON.parse(JSON.stringify(cards))} />;
}
