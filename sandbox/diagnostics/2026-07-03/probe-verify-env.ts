// Stand-alone probe: mirror exactly what verify-database-target.ts does,
// without throwing or exiting — print every derived value so we can see
// what the verifier actually sees. No DB connection. No mutations.
import { config } from "dotenv";
config({ path: ".env" });

console.log("=== probe-verify-env ===");
console.log("DATABASE_URL present?", Boolean(process.env.DATABASE_URL));
console.log("DIRECT_URL present?", Boolean(process.env.DIRECT_URL));
console.log("BEVERO_DB_TARGET =", JSON.stringify(process.env.BEVERO_DB_TARGET));
console.log("BEVERO_EXPECTED_SUPABASE_REF =", JSON.stringify(process.env.BEVERO_EXPECTED_SUPABASE_REF));

for (const [k, v] of [["DATABASE_URL", process.env.DATABASE_URL], ["DIRECT_URL", process.env.DIRECT_URL]]) {
  if (!v) continue;
  let url: URL;
  try {
    url = new URL(v);
  } catch (e: any) {
    console.log(`${k}: URL_PARSE_ERROR ${e.message}`);
    continue;
  }
  const usernameRaw = url.username;
  const usernameDecoded = decodeURIComponent(url.username);
  const userMatch = usernameDecoded.match(/^postgres\.([a-z0-9]+)$/i);
  const hostMatch = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  const derivedRef = (userMatch && userMatch[1]) || (hostMatch && hostMatch[1]) || null;
  console.log(`${k}:`);
  console.log(`  hostname=${url.hostname}`);
  console.log(`  port=${url.port}`);
  console.log(`  username_raw=${JSON.stringify(usernameRaw)}`);
  console.log(`  username_decoded=${JSON.stringify(usernameDecoded)}`);
  console.log(`  derived_ref=${derivedRef}`);
  console.log(`  password_len=${url.password.length}`);
}
console.log("=== end probe ===");
