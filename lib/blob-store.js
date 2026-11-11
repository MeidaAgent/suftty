import { get, put } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";

const CONFIG_PATH = "site-config/ca.json";
const LOCAL_STORAGE_PATH = path.resolve(".ca-local.json");

function hasBlobConfiguration() {
  return (
    Boolean(process.env.BLOB_READ_WRITE_TOKEN) ||
    Boolean(process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
  );
}

export async function readCaAddress() {
  if (!hasBlobConfiguration()) {
    try {
      const data = await fs.readFile(LOCAL_STORAGE_PATH, "utf8");
      const config = JSON.parse(data);
      return typeof config.caAddress === "string" ? config.caAddress : null;
    } catch {
      return null;
    }
  }

  const result = await get(CONFIG_PATH, { access: "private" });
  if (!result || result.statusCode === 404) {
    return null;
  }
  if (result.statusCode !== 200) {
    throw new Error(`Could not read CA configuration (${result.statusCode}).`);
  }

  const text = await new Response(result.stream).text();
  const config = JSON.parse(text);
  return typeof config.caAddress === "string" ? config.caAddress : null;
}

export async function writeCaAddress(caAddress) {
  if (!hasBlobConfiguration()) {
    await fs.writeFile(
      LOCAL_STORAGE_PATH,
      JSON.stringify({ caAddress }),
      "utf8",
    );
    return;
  }

  await put(CONFIG_PATH, JSON.stringify({ caAddress }), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
