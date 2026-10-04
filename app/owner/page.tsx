import Link from "next/link";

export default function OwnerPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Owner dashboard: new orders will appear here</h1>
      <Link
        className="inline-flex min-h-11 items-center rounded-md bg-[#236443] px-4 text-sm font-semibold text-white hover:bg-[#194f34]"
        href="/owner/services"
      >
        Manage services
      </Link>
    </div>
  );
}