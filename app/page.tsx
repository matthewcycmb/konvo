import { MobileLanding } from "@/components/mobile-landing";

// One responsive design keeps the mobile and desktop homepages in sync.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ mobile?: string }>;
}) {
  return <MobileLanding mobilePreview={(await searchParams).mobile === "1"} />;
}
