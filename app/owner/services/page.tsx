import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { AddServiceForm, ServiceRow } from "./service-forms";

type Service = {
  service_id: string;
  service_name: string;
  category: "PRINTING" | "COPYING" | "BINDING" | "FINISHING" | "PHOTO" | "PROMOTIONAL";
  price: number;
  price_unit: "PER_PAGE" | "PER_ITEM";
  active: boolean;
};

export default async function OwnerServicesPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") redirect("/");

  const supabase = await createClient();
  const { data: shop, error: shopError } = await supabase
    .from("shops")
    .select("shop_id, shop_name")
    .eq("owner_id", user.id)
    .single();

  if (shopError || !shop) {
    return (
      <section className="space-y-2">
        <h1 className="text-2xl font-bold">My Services</h1>
        <p className="text-[#65716b]">Your shop could not be found.</p>
      </section>
    );
  }

  const { data: serviceData, error: serviceError } = await supabase
    .from("services")
    .select("service_id, service_name, category, price, price_unit, active")
    .eq("shop_id", shop.shop_id)
    .order("category", { ascending: true })
    .order("service_name", { ascending: true });

  const services = (serviceData ?? []) as Service[];

  return (
    <div className="space-y-8">
      <header className="border-b border-[#d9dfd8] pb-5">
        <p className="text-sm font-medium text-[#65716b]">{shop.shop_name}</p>
        <h1 className="mt-1 text-2xl font-bold">My Services</h1>
      </header>

      <section aria-labelledby="add-service-heading" className="space-y-4">
        <h2 className="text-lg font-bold" id="add-service-heading">Add service</h2>
        <AddServiceForm />
      </section>

      <section aria-labelledby="services-heading" className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#d9dfd8] pb-3">
          <h2 className="text-lg font-bold" id="services-heading">Services</h2>
          <p className="text-sm text-[#65716b]">{services.length} total</p>
        </div>
        {serviceError ? (
          <p className="py-4 text-sm text-[#a3311d]" role="alert">Services could not be loaded. Please try again.</p>
        ) : services.length > 0 ? (
          services.map((service) => <ServiceRow key={service.service_id} service={service} />)
        ) : (
          <p className="py-4 text-sm text-[#65716b]">No services yet.</p>
        )}
      </section>
    </div>
  );
}
