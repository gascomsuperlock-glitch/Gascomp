export function validateLead(body) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("Invalid form");
  const field = (key, min, max) => {
    const value = body[key];
    if (
      typeof value !== "string" ||
      value.trim().length < min ||
      value.trim().length > max ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)
    )
      throw new Error(`Invalid ${key}`);
    return value.trim();
  };
  const name = field("name", 2, 120);
  const email = field("email", 3, 254).toLowerCase();
  const phone = field("phone", 7, 30);
  const message = field("message", 10, 4000);
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !/^\+?[0-9 ()-]{7,30}$/.test(phone)
  )
    throw new Error("Invalid contact details");
  if (
    !["contact", "reseller"].includes(body.kind) ||
    body.consent !== true ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      body.id || "",
    )
  )
    throw new Error("Invalid submission");
  return { id: body.id, kind: body.kind, name, email, phone, message };
}
