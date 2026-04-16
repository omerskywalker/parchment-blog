/**
 * Load a font file for use in Next.js ImageResponse (OG images).
 *
 * Uses fetch() with new URL(path, import.meta.url) so Next.js traces the file
 * reference at build time and bundles the font into the serverless function.
 * This avoids the fs.readFileSync + process.cwd() approach which breaks in
 * Vercel production because src/ is not deployed alongside the compiled output.
 *
 * The path is relative to THIS file (src/lib/server/og-fonts.ts).
 * Fonts live at src/app/fonts/ → relative path is ../../app/fonts/<name>.
 */
export async function loadOgFont(filename: string): Promise<ArrayBuffer> {
  const url = new URL(`../../app/fonts/${filename}`, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load OG font "${filename}": ${res.status}`);
  return res.arrayBuffer();
}
