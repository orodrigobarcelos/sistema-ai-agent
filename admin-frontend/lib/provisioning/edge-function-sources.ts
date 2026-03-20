import { readFileSync } from "fs";
import { join } from "path";

const sourcesDir = join(process.cwd(), "lib", "provisioning", "sources");

export function getEdgeFunctionSource(name: string): string {
  try {
    return readFileSync(join(sourcesDir, `${name}.txt`), "utf-8");
  } catch {
    throw new Error(`Edge function source not found: ${name}`);
  }
}
