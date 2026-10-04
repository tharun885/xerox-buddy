"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type ServiceActionResult = {
  ok: boolean;
  message?: string;
};

const categories = [
  "PRINTING",
  "COPYING",
  "BINDING",
  "FINISHING",
  "PHOTO",
  "PROMOTIONAL",
] as const;
const priceUnits = ["PER_PAGE", "PER_ITEM"] as const;

type ServiceFields = {
  service_name: string;
  category: (typeof categories)[number];
  price_unit: (typeof priceUnits)[number];
  price: number;
};

function readServiceFields(
  formData: FormData,
): { value: ServiceFields } | { error: string } {
  const serviceName = formData.get("service_name");
  const category = formData.get("category");
  const priceUnit = formData.get("price_unit");
  const priceValue = formData.get("price");

  if (typeof serviceName !== "string") {
    return { error: "Enter a service name." };
  }

  const name = serviceName.trim();
  if (name.length < 2 || name.length > 60) {
    return { error: "Service name must be 2 to 60 characters." };
  }
  if (typeof category !== "string" || !categories.includes(category as (typeof categories)[number])) {
    return { error: "Choose a valid service category." };
  }
  if (typeof priceUnit !== "string" || !priceUnits.includes(priceUnit as (typeof priceUnits)[number])) {
    return { error: "Choose a valid price unit." };
  }
  if (typeof priceValue !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(priceValue.trim())) {
    return { error: "Enter a price with no more than 2 decimal places." };
  }

  const price = Number(priceValue);
  if (!Number.isFinite(price) || price < 0 || price > 100000) {
    return { error: "Price must be between ₹0 and ₹100,000." };
  }

  return {
    value: {
      service_name: name,
      category: category as (typeof categories)[number],
      price_unit: priceUnit as (typeof priceUnits)[number],
      price,
    },
  };
}

async function getOwnerShopId(ownerId: string) {
  const supabase = await createClient();
  const { data: shop, error } = await supabase
    .from("shops")
    .select("shop_id")
    .eq("owner_id", ownerId)
    .single();

  if (error || !shop) return null;
  return { supabase, shopId: shop.shop_id };
}

function readServiceId(formData: FormData) {
  const serviceId = formData.get("service_id");
  if (typeof serviceId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceId)) {
    return null;
  }
  return serviceId;
}

function mutationError(error: { code?: string } | null): ServiceActionResult {
  if (error?.code === "23505") {
    return { ok: false, message: "You already have a service with this name." };
  }
  return { ok: false, message: "The service could not be saved. Please try again." };
}

export async function addService(formData: FormData): Promise<ServiceActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") {
    return { ok: false, message: "You are not authorized to manage services." };
  }

  const ownerShop = await getOwnerShopId(user.id);
  if (!ownerShop) {
    return { ok: false, message: "Your shop could not be found." };
  }

  const fields = readServiceFields(formData);
  if ("error" in fields) return { ok: false, message: fields.error };

  const { error } = await ownerShop.supabase.from("services").insert({
    ...fields.value,
    shop_id: ownerShop.shopId,
  });
  if (error) return mutationError(error);

  revalidatePath("/owner/services");
  return { ok: true, message: "Service added." };
}

export async function updateService(formData: FormData): Promise<ServiceActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") {
    return { ok: false, message: "You are not authorized to manage services." };
  }

  const ownerShop = await getOwnerShopId(user.id);
  if (!ownerShop) {
    return { ok: false, message: "Your shop could not be found." };
  }

  const serviceId = readServiceId(formData);
  if (!serviceId) return { ok: false, message: "Choose a valid service." };

  const fields = readServiceFields(formData);
  if ("error" in fields) return { ok: false, message: fields.error };

  const { data, error } = await ownerShop.supabase
    .from("services")
    .update(fields.value)
    .eq("service_id", serviceId)
    .eq("shop_id", ownerShop.shopId)
    .select("service_id")
    .maybeSingle();
  if (error) return mutationError(error);
  if (!data) return { ok: false, message: "The service could not be found." };

  revalidatePath("/owner/services");
  return { ok: true, message: "Service updated." };
}

export async function setServiceActive(formData: FormData): Promise<ServiceActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") {
    return { ok: false, message: "You are not authorized to manage services." };
  }

  const ownerShop = await getOwnerShopId(user.id);
  if (!ownerShop) {
    return { ok: false, message: "Your shop could not be found." };
  }

  const serviceId = readServiceId(formData);
  if (!serviceId) return { ok: false, message: "Choose a valid service." };

  const activeValue = formData.get("active");
  if (activeValue !== "true" && activeValue !== "false") {
    return { ok: false, message: "Choose a valid service status." };
  }

  const { data, error } = await ownerShop.supabase
    .from("services")
    .update({ active: activeValue === "true" })
    .eq("service_id", serviceId)
    .eq("shop_id", ownerShop.shopId)
    .select("service_id")
    .maybeSingle();
  if (error) return mutationError(error);
  if (!data) return { ok: false, message: "The service could not be found." };

  revalidatePath("/owner/services");
  return { ok: true, message: "Service status updated." };
}
