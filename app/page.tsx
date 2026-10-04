import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  switch (user.role) {
    case "STUDENT":
      redirect("/student");
    case "OWNER":
      redirect("/owner");
    case "ADMIN":
      redirect("/admin");
    default:
      redirect("/login");
  }
}
