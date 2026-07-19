import { RequestDetail } from "@/components/request-detail";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ actor?: string }>;
};

export default async function RequestPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  return <RequestDetail id={id} initialActor={sp.actor ?? "author"} />;
}
