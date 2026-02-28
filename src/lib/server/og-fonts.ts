import fs from "fs";
import path from "path";

export function loadOgFont(relPathFromSrcApp: string): ArrayBuffer {
  const p = path.join(process.cwd(), "src", "app", relPathFromSrcApp);
  const buf = fs.readFileSync(p);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}
