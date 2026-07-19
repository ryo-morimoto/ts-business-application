import { OrderDetail } from "@/components/order-detail";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ actor?: string }>;
};

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  return <OrderDetail id={id} initialActor={sp.actor ?? "operator"} />;
}
