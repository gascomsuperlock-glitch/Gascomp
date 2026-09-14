import "server-only";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WarrantyEvidence, WarrantyTicket, WarrantyTicketStatus } from "../model/types";
import type { WarrantyTicketInput } from "../model/input";
import { allowedExtension, evidenceInputs } from "../model/evidence";
import { normalizeLocalTicket } from "../model/ticket-mappers";

const TICKET_ROOT = path.join(process.cwd(), ".data", "warranty-tickets");

export async function saveLocalTicket(input: WarrantyTicketInput, ticketId: string, submittedAt: string) {
  const ticketDirectory = path.join(TICKET_ROOT, ticketId);
  await mkdir(TICKET_ROOT, { recursive: true });
  await mkdir(ticketDirectory, { recursive: false });
  try {
    const evidence: WarrantyEvidence[] = [];
    for (const item of evidenceInputs(input)) {
      const storedName = `${item.id}${allowedExtension(item.file, item.kind)}`;
      await writeFile(path.join(ticketDirectory, storedName), Buffer.from(await item.file.arrayBuffer()), { flag: "wx" });
      evidence.push({ id: item.id, kind: item.kind, originalName: path.basename(item.file.name), storedName, mimeType: item.file.type, size: item.file.size });
    }
    const ticket: WarrantyTicket = {
      ticketId,
      status: "new",
      submittedAt,
      updatedAt: submittedAt,
      customer: { name: input.name, email: input.email, whatsapp: input.whatsapp },
      product: { name: input.product, sku: input.sku },
      purchase: { store: input.store, date: input.purchaseDate, orderNumber: input.orderNumber, price: input.purchasePrice },
      problem: input.problem,
      evidence,
    };
    await writeFile(path.join(ticketDirectory, "ticket.json"), JSON.stringify({ schemaVersion: 2, ...ticket }, null, 2), { encoding: "utf8", flag: "wx" });
    return ticket;
  } catch (error) {
    await rm(ticketDirectory, { recursive: true, force: true });
    throw error;
  }
}

export async function listLocalTickets() {
  let directories: string[] = [];
  try { directories = await readdir(TICKET_ROOT); } catch { return []; }
  const tickets = await Promise.all(directories.map(async (directory) => {
    try {
      const value = JSON.parse(await readFile(path.join(TICKET_ROOT, directory, "ticket.json"), "utf8")) as Record<string, unknown>;
      return normalizeLocalTicket(value);
    } catch { return null; }
  }));
  return tickets.filter((ticket): ticket is WarrantyTicket => Boolean(ticket)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function updateLocalTicketStatus(ticketId: string, status: WarrantyTicketStatus) {
  const ticketPath = path.join(TICKET_ROOT, ticketId, "ticket.json");
  const value = JSON.parse(await readFile(ticketPath, "utf8")) as Record<string, unknown>;
  const updatedAt = new Date().toISOString();
  value.status = status;
  value.updatedAt = updatedAt;
  await writeFile(ticketPath, JSON.stringify(value, null, 2), "utf8");
  return updatedAt;
}

export async function readLocalEvidence(ticketId: string, evidenceId: string) {
  const tickets = await listLocalTickets();
  const evidence = tickets.find((item) => item.ticketId === ticketId)?.evidence.find((item) => item.id === evidenceId);
  if (!evidence?.storedName) return null;
  return { bytes: await readFile(path.join(TICKET_ROOT, ticketId, path.basename(evidence.storedName))), name: evidence.originalName, mimeType: evidence.mimeType };
}
