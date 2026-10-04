"use client";

import { useActionState } from "react";
import {
  addService,
  setServiceActive,
  updateService,
  type ServiceActionResult,
} from "@/app/owner/services/actions";

type Category =
  | "PRINTING"
  | "COPYING"
  | "BINDING"
  | "FINISHING"
  | "PHOTO"
  | "PROMOTIONAL";
type PriceUnit = "PER_PAGE" | "PER_ITEM";
type Service = {
  service_id: string;
  service_name: string;
  category: Category;
  price: number;
  price_unit: PriceUnit;
  active: boolean;
};

const categories: { value: Category; label: string }[] = [
  { value: "PRINTING", label: "Printing" },
  { value: "COPYING", label: "Copying" },
  { value: "BINDING", label: "Binding" },
  { value: "FINISHING", label: "Finishing" },
  { value: "PHOTO", label: "Photo" },
  { value: "PROMOTIONAL", label: "Promotional" },
];

const fieldClassName =
  "h-11 min-w-0 w-full rounded-md border border-[#cfd7d0] bg-white px-3 text-sm outline-none focus:border-[#49765d] focus:ring-2 focus:ring-[#49765d]/20";
const labelClassName = "mb-1.5 block text-sm font-semibold text-[#34443b]";
const buttonClassName =
  "min-h-11 rounded-md bg-[#236443] px-4 text-sm font-semibold text-white hover:bg-[#194f34] disabled:cursor-wait disabled:opacity-60";

function ActionMessage({ state }: { state: ServiceActionResult }) {
  if (!state.message) return null;
  return (
    <p
      aria-live="polite"
      className={`text-sm ${state.ok ? "text-[#285c3b]" : "text-[#a3311d]"}`}
      role={state.ok ? "status" : "alert"}
    >
      {state.message}
    </p>
  );
}

export function AddServiceForm() {
  const [state, formAction, pending] = useActionState(
    async (_previousState: ServiceActionResult, formData: FormData) =>
      addService(formData),
    { ok: false },
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1.5fr)_minmax(150px,1fr)_minmax(120px,.7fr)_minmax(130px,.8fr)_auto] lg:items-end">
      <div>
        <label className={labelClassName} htmlFor="new-service-name">Name</label>
        <input className={fieldClassName} id="new-service-name" maxLength={60} minLength={2} name="service_name" required />
      </div>
      <div>
        <label className={labelClassName} htmlFor="new-service-category">Category</label>
        <select className={fieldClassName} defaultValue="PRINTING" id="new-service-category" name="category">
          {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClassName} htmlFor="new-service-price">Price (₹)</label>
        <input className={fieldClassName} id="new-service-price" max="100000" min="0" name="price" required step="0.01" type="number" />
      </div>
      <div>
        <label className={labelClassName} htmlFor="new-service-unit">Unit</label>
        <select className={fieldClassName} defaultValue="PER_PAGE" id="new-service-unit" name="price_unit">
          <option value="PER_PAGE">Per page</option>
          <option value="PER_ITEM">Per item</option>
        </select>
      </div>
      <button className={buttonClassName} disabled={pending} type="submit">{pending ? "Adding..." : "Add service"}</button>
      <div className="sm:col-span-2 lg:col-span-5"><ActionMessage state={state} /></div>
    </form>
  );
}

export function ServiceRow({ service }: { service: Service }) {
  const [editState, editAction, editPending] = useActionState(
    async (_previousState: ServiceActionResult, formData: FormData) =>
      updateService(formData),
    { ok: false },
  );
  const [statusState, statusAction, statusPending] = useActionState(
    async (_previousState: ServiceActionResult, formData: FormData) =>
      setServiceActive(formData),
    { ok: false },
  );

  return (
    <article className={`border-t border-[#e1e5e0] py-5 ${service.active ? "" : "text-[#858d88]"}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className={`font-semibold ${service.active ? "text-[#18241f]" : "text-[#737c76]"}`}>{service.service_name}</h3>
          <p className="mt-1 text-sm">
            {categories.find((category) => category.value === service.category)?.label ?? service.category}
            <span aria-hidden="true"> · </span>
            ₹{Number(service.price).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {service.price_unit === "PER_PAGE" ? "per page" : "per item"}
          </p>
        </div>
        <span className={`rounded px-2.5 py-1 text-xs font-bold ${service.active ? "bg-[#e5f2e9] text-[#285c3b]" : "bg-[#eceeec] text-[#69716c]"}`}>
          {service.active ? "ACTIVE" : "INACTIVE"}
        </span>
      </div>

      <form action={editAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(170px,1.5fr)_minmax(140px,1fr)_minmax(115px,.7fr)_minmax(125px,.8fr)_auto] lg:items-end">
        <input name="service_id" type="hidden" value={service.service_id} />
        <div>
          <label className={labelClassName} htmlFor={`service-name-${service.service_id}`}>Name</label>
          <input className={fieldClassName} defaultValue={service.service_name} id={`service-name-${service.service_id}`} maxLength={60} minLength={2} name="service_name" required />
        </div>
        <div>
          <label className={labelClassName} htmlFor={`service-category-${service.service_id}`}>Category</label>
          <select className={fieldClassName} defaultValue={service.category} id={`service-category-${service.service_id}`} name="category">
            {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClassName} htmlFor={`service-price-${service.service_id}`}>Price (₹)</label>
          <input className={fieldClassName} defaultValue={service.price} id={`service-price-${service.service_id}`} max="100000" min="0" name="price" required step="0.01" type="number" />
        </div>
        <div>
          <label className={labelClassName} htmlFor={`service-unit-${service.service_id}`}>Unit</label>
          <select className={fieldClassName} defaultValue={service.price_unit} id={`service-unit-${service.service_id}`} name="price_unit">
            <option value="PER_PAGE">Per page</option>
            <option value="PER_ITEM">Per item</option>
          </select>
        </div>
        <button className={buttonClassName} disabled={editPending} type="submit">{editPending ? "Saving..." : "Save"}</button>
        <div className="sm:col-span-2 lg:col-span-5"><ActionMessage state={editState} /></div>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <form action={statusAction}>
          <input name="service_id" type="hidden" value={service.service_id} />
          <input name="active" type="hidden" value={service.active ? "false" : "true"} />
          <button className="min-h-10 rounded-md border border-[#cfd7d0] px-3 text-sm font-semibold text-[#34443b] hover:bg-[#f2f4ef] disabled:opacity-60" disabled={statusPending} type="submit">
            {statusPending ? "Updating..." : service.active ? "Disable" : "Enable"}
          </button>
        </form>
        <ActionMessage state={statusState} />
      </div>
    </article>
  );
}
