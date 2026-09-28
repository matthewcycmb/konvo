import { handleAndroidWaitlist } from "@/lib/android-waitlist";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleAndroidWaitlist(request);
}
