// Isolated Cloudflare Workers + D1 emulator smoke. No remote account/DB/secret use.
// Runs only on CI localhost with temporary configuration and data.
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { addCalendarMonths } from "../src/commercial-entitlements.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const wrangler = resolve(root, "node_modules", ".bin", "wrangler");
const temp = mkdtempSync(join(tmpdir(), "everest-precifica-p0-qa-"));
const persistence = join(temp, "local-d1");
const config = join(temp, "wrangler-qa.toml");
const oldSchema = resolve(root, "test", "fixtures", "schema_pre_p0.sql");
const migration = resolve(root, "migrations", "0002_commercial_entitlements.sql");
const token = "ever-p0-local-only-not-a-credential-0123456789012";
const tokenHash = createHash("sha256").update("activation:" + token).digest("hex");
const rawEmail = "synthetic@example.invalid";
const emailHash = createHash("sha256").update("email:" + rawEmail).digest("hex");
const approved = "2026-10-15 13:00:00";
const expires = addCalendarMonths(approved);
const port = 18791;
let proc;

writeFileSync(config, [
  'name = "ever-precifica-qa-disposable"',
  'main = "' + resolve(root, "src", "index.js") + '"',
  'compatibility_date = "2026-09-25"',
  '',
  '[vars]',
  'ENVIRONMENT = "qa-local-disposable"',
  'SITE_URL = "https://qa.invalid"',
  '',
  '[[d1_databases]]',
  'binding = "DB"',
  'database_name = "ever_precifica_disposable_qa"',
  'database_id = "11111111-1111-4111-8111-111111111111"',
  ''
].join("\n"));

function localD1(args) {
  const command = ["d1","execute","ever_precifica_disposable_qa",
    "--local", "--config",config,"--persist-to",persistence,...args];
  const out = execFileSync(wrangler,command,{cwd:root,encoding:"utf8",timeout:60000,
    env:{...process.env,WRANGLER_SEND_METRICS:"false"}});
  return out;
}
function escapeSql(v) { return String(v).replaceAll("'","''"); }
function rest(ms){return new Promise(r=>setTimeout(r,ms));}
try {
  if (process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN) {
    throw new Error("QA must run without Cloudflare API credentials");
  }
  // Actual Miniflare D1 local engine: initialize legacy state, then apply migration.
  localD1(["--file",oldSchema]);
  localD1(["--file",migration]);
  const seed = join(temp,"seed.sql");
  writeFileSync(seed, [
    "INSERT INTO orders (id,provider,provider_order_id,product_code,status,email_hash,approved_at) VALUES (1,'kiwify','qa-local-no-payment','ever_precifica','approved','" + escapeSql(emailHash) + "','" + approved + "');",
    "INSERT INTO access_accounts (id,product_code,email_hash) VALUES (1,'ever_precifica','" + escapeSql(emailHash) + "');",
    "INSERT INTO access_grants (account_id,order_id,product_code,approved_at,starts_at,ends_at,status) VALUES (1,1,'ever_precifica','" + approved + "','" + approved + "','" + expires + "','approved');",
    "INSERT INTO access_activation_tokens (token_hash,order_id,email_hash,product_code,expires_at) VALUES ('" + escapeSql(tokenHash) + "',1,'" + escapeSql(emailHash) + "','ever_precifica',datetime('now','+30 minutes'));"
  ].join("\n"));
  localD1(["--file",seed]);

  proc = spawn(wrangler,["dev","--local","--ip","127.0.0.1",
    "--port",String(port),"--config",config,"--persist-to",persistence],{
    cwd:root,env:{...process.env,WRANGLER_SEND_METRICS:"false"},stdio:["ignore","pipe","pipe"]
  });
  let errorOut = "";
  for (const stream of [proc.stdout,proc.stderr]) {
    stream.on("data",x=>{errorOut=(errorOut+String(x)).slice(-4500);});
  }
  let isReady = false;
  for(let n=0;n<65;n++) {
    if (proc.exitCode !== null) throw new Error("Wrangler exited early: "+errorOut);
    try {
      const res = await fetch("http://127.0.0.1:"+port+"/health");
      if(res.status===200 && (await res.json()).database==="connected") {
        isReady=true;break;
      }
    } catch { /* wait for isolated local dev server */ }
    await rest(250);
  }
  assert.ok(isReady,"Worker+D1 emulator did not become ready: "+errorOut);
  async function post(path, data,headers={}) {
    const resp=await fetch("http://127.0.0.1:"+port+path,{
      method:"POST",headers:{"content-type":"application/json",...headers},
      body:JSON.stringify(data)
    });
    return {status:resp.status,body:await resp.json()};
  }
  const act = await post("/access/activate",{token});
  assert.equal(act.status,200,"Activation failed against real local Worker/D1: "+JSON.stringify(act.body));
  assert.equal(act.body.commercial_expires_at,expires);
  const jwt=act.body.access_token;
  assert.ok(jwt && jwt.length>20);
  const reused = await post("/access/activate",{token});
  assert.equal(reused.status,401);
  const valid=await post("/access/validate",{}, {authorization:"Bearer "+jwt});
  assert.equal(valid.status,200,"Validation failed against Worker+D1: "+JSON.stringify(valid.body));
  assert.equal(valid.body.valid,true);
  assert.equal(valid.body.commercial_expires_at,expires);
  const noAccess=await post("/access/validate",{}, {authorization:"Bearer no-valid-token"});
  assert.equal(noAccess.status,401);
  process.stdout.write("PASS isolated Cloudflare Worker+D1: legacy migration, activation, one-time link, session, expiry metadata, unauthorized token\n");
} finally {
  if(proc && proc.exitCode===null) proc.kill("SIGTERM");
  rmSync(temp,{recursive:true,force:true});
}
