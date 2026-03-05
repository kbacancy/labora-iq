import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const idx = trimmed.indexOf("=");
    if (idx === -1) {
      continue;
    }
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const seedPassword = process.env.SEED_USER_PASSWORD || "Admin@123";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const seedUsers = [
  { email: "admin@laboraiq.com", full_name: "System Admin", role: "admin" },
  { email: "reception@laboraiq.com", full_name: "Front Desk User", role: "receptionist" },
  { email: "tech@laboraiq.com", full_name: "Lab Technician", role: "technician" },
];

const listAllUsers = async () => {
  const all = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw new Error(error.message);
    }
    const rows = data?.users ?? [];
    all.push(...rows);
    if (rows.length < 200) {
      break;
    }
    page += 1;
  }
  return all;
};

const ensureUser = async (seed, existingUsers) => {
  const existing = existingUsers.find((user) => user.email?.toLowerCase() === seed.email.toLowerCase());

  if (existing) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: seedPassword,
      email_confirm: true,
      user_metadata: { full_name: seed.full_name },
    });
    if (updateError) {
      throw new Error(`Failed to update ${seed.email}: ${updateError.message}`);
    }
    return existing.id;
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: seed.email,
    password: seedPassword,
    email_confirm: true,
    user_metadata: { full_name: seed.full_name },
  });

  if (createError || !created?.user?.id) {
    throw new Error(`Failed to create ${seed.email}: ${createError?.message ?? "unknown error"}`);
  }

  return created.user.id;
};

const run = async () => {
  const existingUsers = await listAllUsers();

  for (const seed of seedUsers) {
    const userId = await ensureUser(seed, existingUsers);

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: seed.full_name,
        role: seed.role,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      throw new Error(`Failed to upsert profile for ${seed.email}: ${profileError.message}`);
    }

    console.log(`Seeded ${seed.email} (${seed.role})`);
  }

  console.log("Done. Seed users can now log in.");
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
