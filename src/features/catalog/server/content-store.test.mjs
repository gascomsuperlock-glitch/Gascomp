import assert from "node:assert/strict";
import { test, after } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// All database writes run in disposable PostgreSQL; Storage is mocked.
const db = new PGlite();
await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
const schema = (await readFile(new URL("../../../../supabase/migrations/202609100001_catalog.sql", import.meta.url), "utf8")).split("alter table public.products enable")[0].replace("begin;", "");
await db.exec(schema);
await db.exec("alter table tutorial_videos add column video_url text, add column storage_path text, add column thumbnail_url text, add column thumbnail_storage_path text;");
await db.exec(await readFile(new URL("../../../../supabase/migrations/202609180001_catalog_save_snapshot.sql", import.meta.url), "utf8"));
const tables = ["products", "site_settings", "product_variations", "product_images", "tutorial_videos", "product_issues", "faq_items"];
const columns = {};
for (const table of tables) columns[table] = (await db.query("select column_name,data_type from information_schema.columns where table_name=$1", [table])).rows;
let failRead = false;
const removedPaths = [];
const quote = value => '"' + value.replaceAll('"', '""') + '"';
async function insert(table, rows, upsert = false) {
  for (const row of rows) {
    const names = Object.keys(row).filter(key => columns[table].some(column => column.column_name === key));
    const values = names.map(key => columns[table].find(column => column.column_name === key).data_type === "jsonb" ? JSON.stringify(row[key]) : row[key]);
    const conflict = upsert ? "on conflict (id) do update set " + names.filter(key => key !== "id").map(key => `${quote(key)}=excluded.${quote(key)}`).join(",") : "";
    await db.query(`insert into ${quote(table)} (${names.map(quote)}) values (${values.map((_, index) => "$" + (index + 1))}) ${conflict}`, values);
  }
}
const operations = [];
class Query {
  constructor(table) {
    this.table = table;
    this.op = "select";
    this.fields = "*";
    this.filters = [];
    this.params = [];
  }
  select(fields) { this.fields = fields; return this; }
  order() { return this; }
  limit(value) { this.limitValue = value; return this; }
  maybeSingle() { this.single = true; return this; }
  eq(key, value) {
    this.params.push(value);
    this.filters.push(`${quote(key)}=$${this.params.length}`);
    return this;
  }
  in(key, values) {
    const placeholders = values.map(value => { this.params.push(value); return "$" + this.params.length; });
    this.filters.push(`${quote(key)} in (${placeholders.join(",")})`);
    return this;
  }
  upsert(rows) { this.op = "upsert"; this.rows = Array.isArray(rows) ? rows : [rows]; return this; }
  insert(rows) { this.op = "insert"; this.rows = Array.isArray(rows) ? rows : [rows]; return this; }
  update(row) { this.op = "update"; this.row = row; return this; }
  delete() { this.op = "delete"; return this; }
  async run() {
    operations.push({ table: this.table, op: this.op, rows: this.rows, params: [...this.params] });
    try {
      if (failRead && this.op === "select") throw new Error("Read unavailable");
      if (this.op === "update") {
        const assignments = Object.keys(this.row).map((key, index) => quote(key) + "=$" + (this.params.length + index + 1));
        await db.query(`update ${quote(this.table)} set ${assignments.join(",")} where ${this.filters.join(" and ")}`, [...this.params, ...Object.values(this.row)]);
        return { error: null };
      }
      if (this.op === "insert" || this.op === "upsert") {
        await insert(this.table, this.rows, this.op === "upsert");
        return { data: null, error: null };
      }
      const where = this.filters.length ? " where " + this.filters.join(" and ") : "";
      const limit = this.limitValue !== undefined ? " limit " + this.limitValue : "";
      const result = await db.query(`${this.op === "select" ? "select " + this.fields : "delete"} from ${quote(this.table)}${where}${limit}`, this.params);
      return { data: this.single ? result.rows[0] ?? null : result.rows, error: null };
    } catch (error) { return { error }; }
  }
  then(fulfilled, rejected) { return this.run().then(fulfilled, rejected); }
}
globalThis.catalogDiagnosticClient = {
  from: table => new Query(table),
  rpc: async name => {
    operations.push({ table: name, op: "select", params: [] });
    if (failRead) return { error: new Error("Read unavailable") };
    try {
      const result = await db.query(`select public.${name}() as snapshot`);
      return { data: result.rows[0].snapshot, error: null };
    } catch (error) { return { error }; }
  },
  storage: { from: () => ({
    upload: async () => ({ error: null }),
    getPublicUrl: path => ({ data: { publicUrl: "https://example.test/" + path } }),
    remove: async paths => { removedPaths.push(...paths); return { error: null }; },
  }) },
};
const mock = code => ({ url: "data:text/javascript," + encodeURIComponent(code), shortCircuit: true });
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "server-only") return mock("export {};");
  if (specifier.endsWith("/integrations/supabase/server")) return mock(`
    export const createAdminSupabaseClient = () => globalThis.catalogDiagnosticClient;
    export const createPublicSupabaseClient = createAdminSupabaseClient;
    export const isSupabaseConfigured = () => true;
  `);
  if (specifier.endsWith("/model/default-content")) return mock('export const DEFAULT_CONTENT = {products:[],whatsappNumber:"",supportHours:""};');
  if (specifier.startsWith("@/")) return { url: pathToFileURL(resolve("src", specifier.slice(2) + ".ts")).href, shortCircuit: true };
  if (specifier.startsWith(".") && !/\.[a-z]+$/.test(specifier)) return next(specifier + ".ts", context);
  return next(specifier, context);
} });
const { loadFromSupabase, persistSiteContent } = await import("./content-store.ts");
hooks.deregister();
after(async () => { delete globalThis.catalogDiagnosticClient; await db.close(); });

const newProduct = (id) => ({ id, slug: id, sku: id.toUpperCase(), name: "New product", model: "", description: "", tone: "orange", published: false, archived: false, everPublished: false, variations: [], images: [], videos: [], issues: [], faqs: [] });
const mutations = () => operations.filter(item => item.op !== "select");

test("catalog save snapshot is denied to public roles and readable by the service role", async () => {
  try {
    await db.exec("set role anon;");
    await assert.rejects(() => db.query("select public.catalog_admin_save_snapshot()"), /permission denied/i);
  } finally {
    await db.exec("reset role;");
  }
  try {
    await db.exec("set role service_role;");
    const result = await db.query("select public.catalog_admin_save_snapshot() as snapshot");
    assert.deepEqual(result.rows[0].snapshot.products, []);
  } finally {
    await db.exec("reset role;");
  }
});

async function reset() {
  failRead = false;
  await db.exec("truncate products, site_settings cascade;");
  removedPaths.length = 0;
  await insert("site_settings", [{id:true,whatsapp_number:"123",support_hours:"Monday"}]);
  await insert("products", [{id:"existing",slug:"existing",sku:"EXISTING",name:"Existing product",status:"published",ever_published:true}]);
  await insert("product_variations", [{id:"variation",product_id:"existing",name:"Standard",sku:"EXISTING-1"}]);
  await insert("product_images", [{id:"image",product_id:"existing",variation_id:"variation",storage_path:"products/existing/photo.png",public_url:"https://example.test/photo.png",is_primary:true}]);
  await insert("tutorial_videos", [{id:"video",product_id:"existing",title:"Guide",youtube_url:"https://www.youtube.com/watch?v=dQw4w9WgXcQ",thumbnail_storage_path:"tutorial-thumbnails/existing/photo.png",thumbnail_url:"https://example.test/thumbnail.png"}]);
  await insert("product_issues", [{id:"issue",product_id:"existing",title:"Issue",steps:["Check the guide"]}]);
  await insert("faq_items", [{id:"faq",product_id:"existing",question:"How?",answer:"Follow the guide."}]);
  operations.length = 0;
  return JSON.parse(JSON.stringify(await loadFromSupabase(true)));
}
async function snapshotExisting() {
  const result = {};
  for (const table of tables.filter(table => table !== "site_settings")) {
    result[table] = (await db.query(`select * from ${quote(table)} where ${table === "products" ? "id" : "product_id"}='existing'`)).rows;
  }
  return result;
}

test("adding a product without photos performs one write and preserves existing guides exactly", async () => {
  const original = await reset();
  const before = await snapshotExisting();
  const input = {...original, products:[...original.products,newProduct("new")]};
  operations.length = 0;
  const saved = await persistSiteContent(input);
  assert.deepEqual(operations.filter(item => item.op === "select").map(item => item.table), ["catalog_admin_save_snapshot"]);
  assert.deepEqual(mutations().map(item => [item.table,item.op,item.rows.map(row=>row.id)]), [["products","upsert",["new"]]]);
  assert.deepEqual(await snapshotExisting(), before);
  assert.deepEqual(removedPaths, []);
  assert.equal((await loadFromSupabase(true)).products.find(p=>p.id==="new").name,"New product");
  operations.length = 0;
  // The browser has omitted undefined fields; a newly saved draft has no attributes key.
  const reordered = JSON.parse(JSON.stringify(saved));
  reordered.products = reordered.products.map(p=>Object.fromEntries(Object.entries(p).reverse()));
  await persistSiteContent(reordered);
  assert.deepEqual(mutations(), []);
});

test("new product help content is inserted without deleting or rewriting another product", async () => {
  const original = await reset();
  const before = await snapshotExisting();
  const added = {...newProduct("with-help"), variations:[{id:"new-variant",name:"Standard",sku:"NEW"}], images:[{id:"new-image",name:"photo.png",alt:"Photo",variationId:"new-variant",isPrimary:true,dataUrl:"data:image/png;base64,AQID"}], faqs:[{id:"new-faq",question:"How?",answer:"Read the guide."}]};
  operations.length = 0;
  const saved = await persistSiteContent({...original,products:[...original.products,added]});
  assert.ok(mutations().every(item => item.op !== "delete"));
  assert.deepEqual(await snapshotExisting(), before);
  const loaded = (await loadFromSupabase(true)).products.find(p=>p.id==="with-help");
  assert.equal(loaded.images[0].variationId,"new-variant");
  assert.equal(loaded.faqs[0].answer,"Read the guide.");
  assert.equal(saved.products[1].images[0].dataUrl,undefined);
});

test("editing a guide replaces only that guide and preserves child ordering", async () => {
  const original = await reset();
  await persistSiteContent({...original,products:[...original.products,newProduct("other")]});
  const input = await loadFromSupabase(true);
  input.products[1].faqs = [{id:"second",question:"Second?",answer:"Second."},{id:"first",question:"First?",answer:"First."}];
  const before = await snapshotExisting();
  operations.length = 0;
  await persistSiteContent(input);
  assert.ok(mutations().filter(item=>item.op==="delete").every(item=>item.params.length===1 && item.params[0]==="other"));
  assert.deepEqual(await snapshotExisting(),before);
  assert.deepEqual((await loadFromSupabase(true)).products[1].faqs.map(f=>f.id),["second","first"]);
});

test("archive retains published media while permanent draft deletion cleans only draft media", async () => {
  const original = await reset();
  await persistSiteContent({...original,products:[...original.products,{...newProduct("draft"),images:[{id:"draft-image",name:"draft.png",alt:"Draft",isPrimary:true,url:"https://example.test/draft.png",storagePath:"products/draft/photo.png"}]}]});
  removedPaths.length = 0;
  await persistSiteContent({...original,products:[]});
  const loaded = await loadFromSupabase(true);
  assert.equal(loaded.products.length,1);
  assert.equal(loaded.products[0].archived,true);
  assert.equal(loaded.products[0].images[0].storagePath,"products/existing/photo.png");
  assert.equal(loaded.products[0].videos[0].thumbnailStoragePath,"tutorial-thumbnails/existing/photo.png");
  assert.deepEqual(removedPaths,["products/draft/photo.png"]);
});

test("settings changes do not rewrite products and failed reads prevent all writes", async () => {
  const original = await reset();
  operations.length = 0;
  await persistSiteContent({...original,supportHours:"Tuesday"});
  assert.deepEqual(mutations().map(item=>item.table),["site_settings"]);
  operations.length = 0;
  failRead = true;
  await assert.rejects(()=>persistSiteContent({...original,products:[...original.products,newProduct("new")]}),/Read unavailable/);
  assert.deepEqual(mutations(),[]);
  failRead = false;
});

test("compact new-product saves use one snapshot and one write while preserving all existing content", async () => {
  await reset();
  const before = await snapshotExisting();
  operations.length = 0;
  const saved = await persistSiteContent({ mode: "changes", products: [newProduct("compact-new")], removedProductIds: [], settings: {} });
  assert.deepEqual(operations.filter(item => item.op === "select").map(item => item.table), ["catalog_admin_save_snapshot"]);
  assert.deepEqual(mutations().map(item => [item.table,item.op]), [["products","upsert"]]);
  assert.deepEqual(await snapshotExisting(), before);
  assert.equal(saved.products.length, 2);
  assert.equal(saved.supportHours, "Monday");
  operations.length = 0;
  await persistSiteContent({ mode: "changes", products: [newProduct("compact-new")], removedProductIds: [], settings: {} });
  assert.deepEqual(mutations(), []);
});

test("compact saves retain unrelated additions and settings and preserve archive/delete semantics", async () => {
  await reset();
  await persistSiteContent({ mode: "changes", products: [newProduct("another-admin"),newProduct("remove-draft")], removedProductIds: [], settings: { whatsappNumber: "456" } });
  await persistSiteContent({ mode: "changes", products: [], removedProductIds: ["existing","remove-draft"], settings: { supportHours: "Tuesday" } });
  const loaded = await loadFromSupabase(true);
  assert.deepEqual(loaded.products.map(p=>p.id).sort(), ["another-admin","existing"]);
  assert.equal(loaded.whatsappNumber, "456");
  assert.equal(loaded.supportHours, "Tuesday");
  assert.equal(loaded.products.find(p=>p.id==="existing").archived, true);
  assert.equal(loaded.products.find(p=>p.id==="existing").images.length, 1);
  assert.deepEqual(removedPaths, []);
});

test("compact changes cannot write over a failed snapshot or introduce duplicate product URLs", async () => {
  await reset();
  operations.length = 0;
  await assert.rejects(() => persistSiteContent({ mode: "changes", products: [{...newProduct("duplicate"),slug:"existing"}], removedProductIds: [], settings: {} }), /duplicated/);
  assert.deepEqual(mutations(), []);
  failRead = true;
  await assert.rejects(() => persistSiteContent({ mode: "changes", products: [newProduct("unread")], removedProductIds: [], settings: {} }), /Read unavailable/);
  assert.deepEqual(mutations(), []);
  failRead = false;
});
