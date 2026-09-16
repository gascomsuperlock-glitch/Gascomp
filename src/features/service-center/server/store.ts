import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createAdminSupabaseClient } from "@/shared/integrations/supabase/server";
import { isServiceCenterId, validateServiceCenterInput } from "../model/input";
import type { ServiceCenter, ServiceCenterInput } from "../model/types";

const columns = "id,name,province_code,city,address,phone,whatsapp,hours,maps_url,latitude,longitude,active";
const localPath = path.join(process.cwd(), ".data", "service-centers.json");
const unavailable = "Service centers are unavailable. Please try again later.";
const migrationRequired = "Service center storage is not ready. Apply the service center database migration before managing locations.";
let localWriteQueue: Promise<unknown> = Promise.resolve();

function database() {
  const client = createAdminSupabaseClient();
  if (!client && ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"].some(key => process.env[key]?.trim())) {
    throw new Error("Service center database configuration is incomplete.");
  }
  return client;
}

function fromRow(row: Record<string, unknown>): ServiceCenter {
  const parsed = validateServiceCenterInput({
    id: row.id, name: row.name, provinceCode: row.province_code, city: row.city,
    address: row.address, phone: row.phone, whatsapp: row.whatsapp, hours: row.hours,
    mapsUrl: row.maps_url, latitude: row.latitude, longitude: row.longitude, active: row.active,
  });
  if (!parsed.value?.id) throw new Error("Invalid stored service center.");
  return parsed.value as ServiceCenter;
}

async function readLocal(): Promise<ServiceCenter[]> {
  let contents: string;
  try { contents = await readFile(localPath, "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const parsed: unknown = JSON.parse(contents);
  if (!Array.isArray(parsed)) throw new Error("Invalid stored service centers.");
  return parsed.map(item => {
    const validated = validateServiceCenterInput(item);
    if (!validated.value?.id) throw new Error("Invalid stored service center.");
    return validated.value as ServiceCenter;
  });
}

async function writeLocal(centers: ServiceCenter[]) {
  await mkdir(path.dirname(localPath), { recursive: true });
  const temporaryPath = `${localPath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, JSON.stringify(centers, null, 2), { encoding: "utf8", mode: 0o600 });
    await rename(temporaryPath, localPath);
  } finally { await unlink(temporaryPath).catch(() => undefined); }
}

export async function loadServiceCenters(activeOnly = false): Promise<{ centers: ServiceCenter[]; error?: string }> {
  try {
    const db = database();
    if (!db) return { centers: (await readLocal()).filter(center => !activeOnly || center.active).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)) };
    const centers: ServiceCenter[] = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      let query = db.from("service_centers").select(columns).order("id").range(offset, offset + pageSize - 1);
      if (activeOnly) query = query.eq("active", true);
      const { data, error } = await query;
      if (error) throw new Error(["42P01", "PGRST205"].includes(error.code) ? migrationRequired : "Service center database read failed.");
      const batch = (data ?? []).map(fromRow);
      centers.push(...batch.filter(center => !activeOnly || center.active));
      if (batch.length < pageSize) break;
    }
    return { centers: centers.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)) };
  } catch (error) {
    return { centers: [], error: !activeOnly && error instanceof Error && error.message === migrationRequired ? migrationRequired : unavailable };
  }
}

export async function loadPublicServiceCenters(): Promise<{ centers: ServiceCenter[]; error?: string }> {
  return loadServiceCenters(true);
}

export async function saveServiceCenter(input: ServiceCenterInput): Promise<{ center?: ServiceCenter; error?: string }> {
  const validation = validateServiceCenterInput(input);
  if (!validation.value) return { error: validation.error };
  const value = validation.value;
  try {
    const db = database();
    if (db) {
      const row = { name: value.name, province_code: value.provinceCode, city: value.city, address: value.address,
        phone: value.phone, whatsapp: value.whatsapp, hours: value.hours, maps_url: value.mapsUrl,
        latitude: value.latitude, longitude: value.longitude, active: value.active };
      const query = value.id ? db.from("service_centers").update(row).eq("id", value.id) : db.from("service_centers").insert(row);
      const { data, error } = await query.select(columns).maybeSingle();
      if (error) return { error: ["42P01", "PGRST205"].includes(error.code) ? migrationRequired : "The service center could not be saved. Please try again later." };
      if (!data) return { error: "This service center no longer exists. Reload the list and try again." };
      return { center: fromRow(data) };
    }
    const operation = localWriteQueue.then(async () => {
      const centers = await readLocal();
      const index = value.id ? centers.findIndex(center => center.id === value.id) : -1;
      if (value.id && index < 0) return { error: "This service center no longer exists. Reload the list and try again." };
      const center: ServiceCenter = { ...value, id: value.id ?? randomUUID() };
      if (index < 0) centers.push(center); else centers[index] = center;
      await writeLocal(centers);
      return { center };
    });
    localWriteQueue = operation.catch(() => undefined);
    return await operation;
  } catch { return { error: "The service center could not be saved. Please try again later." }; }
}

export async function deleteServiceCenter(id: string): Promise<{ deletedId?: string; error?: string }> {
  if (!isServiceCenterId(id)) return { error: "Invalid service center identifier." };
  try {
    const db = database();
    if (db) {
      const { error } = await db.from("service_centers").delete().eq("id", id);
      if (error) return { error: ["42P01", "PGRST205"].includes(error.code) ? migrationRequired : "The service center could not be deleted. Please try again later." };
      // Retrying an already-completed deletion confirms the location is absent.
      return { deletedId: id };
    }
    const operation = localWriteQueue.then(async () => {
      const centers = await readLocal();
      const remaining = centers.filter(center => center.id.toLowerCase() !== id.toLowerCase());
      if (remaining.length !== centers.length) await writeLocal(remaining);
      return { deletedId: id };
    });
    localWriteQueue = operation.catch(() => undefined);
    return await operation;
  } catch { return { error: "The service center could not be deleted. Please try again later." }; }
}
