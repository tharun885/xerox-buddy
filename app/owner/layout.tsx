import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function OwnerLayout({ children }: LayoutProps<"/owner">) {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") redirect("/");

  return (
    <div className="min-h-screen bg-[#f2f4ef] text-[#18241f]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#d9dfd8] bg-white px-5 py-4 sm:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#49765d]">XEROX BUDDY</p>
          <p className="mt-1 text-sm font-semibold">{user.name || user.email || "Account"} <span className="font-normal text-[#65716b]">· {user.role}</span></p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="min-h-10 rounded-md border border-[#cfd7d0] px-4 text-sm font-semibold hover:bg-[#f2f4ef]" type="submit">
            Sign out
          </button>
        </form>
      </header>
      <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">{children}</main>
    </div>
  );
}