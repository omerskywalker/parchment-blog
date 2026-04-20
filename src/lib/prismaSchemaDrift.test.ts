import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Static drift detector for prisma/schema.prisma vs prisma/migrations/.
 *
 * The bug this catches:
 *   - Someone adds a field to a model in schema.prisma
 *   - Runs `prisma generate` (so types compile and the dev server boots
 *     against a freshly-pushed dev DB)
 *   - Forgets to run `prisma migrate dev` to generate a migration file
 *   - Code that reads/writes the new column 500s in production with
 *     PrismaClientKnownRequestError because prod has been migrated only
 *     up to the last committed migration.
 *
 * What we check (intentionally lightweight, no DB required):
 *   For every scalar field in every model in schema.prisma, assert that
 *   the column name appears (quoted) somewhere in the concatenated
 *   migration SQL — which means SOME migration creates or alters the
 *   table to include it.
 *
 * What we don't check:
 *   Renames, type changes, drops, indexes, relation tables. Those are
 *   rarer and harder to static-check. The common "added a column,
 *   forgot the migration" case is the one we want to catch in dev.
 */

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SCHEMA_PATH = path.join(REPO_ROOT, "prisma", "schema.prisma");
const MIGRATIONS_DIR = path.join(REPO_ROOT, "prisma", "migrations");

interface ModelField {
  model: string;
  field: string;
}

/**
 * Parse model definitions from schema.prisma.
 * Returns the list of (model, scalar field) pairs that map to DB columns.
 *
 * We deliberately skip:
 *   - Relation fields (their type starts with an uppercase model name AND
 *     they have an `@relation` attribute or are an array of a model). The
 *     foreign key column ends up in the schema as a separate scalar field
 *     (e.g. `authorId`), which is what we actually want to verify.
 *   - Lines without a name+type pair (block attributes like `@@index`,
 *     comments, blank lines).
 */
function parseScalarFields(schema: string): ModelField[] {
  const out: ModelField[] = [];

  // Split on top-level model blocks. We only care about `model X { ... }`.
  const modelBlockRe = /\bmodel\s+(\w+)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = modelBlockRe.exec(schema)) !== null) {
    const modelName = match[1];
    const body = match[2];

    for (const rawLine of body.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//") || line.startsWith("@@")) continue;

      // Field declaration looks like:  name  Type[?]  @attr...
      const m = line.match(/^(\w+)\s+(\w+)(\??|\[\])(?:\s+(.*))?$/);
      if (!m) continue;
      const [, fieldName, fieldType, , attrs = ""] = m;

      // Skip relation fields. A relation field is one whose type matches
      // another model (uppercase first letter) and is either:
      //   - an array of that model (one-to-many side),         e.g. `posts Post[]`
      //   - has an @relation attribute (FK-owning side),        e.g. `author User @relation(...)`
      //   - or is an optional singular of a model (back-side    e.g. `audio PostAudio?`
      //     of a one-to-one where the FK lives on the other     — Prisma allows omitting
      //     model).                                              @relation here)
      // The scalar FK columns (e.g. `authorId String`) are
      // captured separately and verified against migrations.
      const isLikelyModelType = /^[A-Z]/.test(fieldType);
      const hasRelationAttr = /@relation\b/.test(attrs);
      const isList = rawLine.includes("[]");
      const isOptional = rawLine.includes("?");
      if (isLikelyModelType && (hasRelationAttr || isList || isOptional)) continue;

      out.push({ model: modelName, field: fieldName });
    }
  }

  return out;
}

function readAllMigrationSql(): string {
  const entries = fs.readdirSync(MIGRATIONS_DIR, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  return dirs
    .map((d) => {
      const p = path.join(MIGRATIONS_DIR, d.name, "migration.sql");
      return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
    })
    .join("\n");
}

describe("Prisma schema vs migrations drift", () => {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  const sql = readAllMigrationSql();
  const fields = parseScalarFields(schema);

  it("parses at least the Post model fields it expects", () => {
    // Sanity check on the parser itself — if this fails, the parser is
    // broken and the rest of the drift checks are meaningless.
    const postFields = fields.filter((f) => f.model === "Post").map((f) => f.field);
    expect(postFields).toContain("id");
    expect(postFields).toContain("title");
    expect(postFields).toContain("slug");
  });

  it.each(parseScalarFields(fs.readFileSync(SCHEMA_PATH, "utf8")))(
    "every scalar column in schema must appear in some migration: $model.$field",
    ({ model, field }) => {
      // Most migrations reference columns as quoted identifiers, e.g.
      //   "excerpt" TEXT
      //   ADD COLUMN "excerpt" TEXT
      // We accept any quoted occurrence of the column name. To reduce
      // false positives from same-named columns on other tables, we ALSO
      // accept the table-qualified form `"Model"."field"`.
      const quotedCol = `"${field}"`;
      const tableQualified = `"${model}"."${field}"`;
      const found = sql.includes(quotedCol) || sql.includes(tableQualified);

      if (!found) {
        throw new Error(
          `Schema declares ${model}.${field} but no migration creates or alters ` +
            `the "${model}" table to include "${field}".\n\n` +
            `Run \`pnpm prisma migrate dev --name add_${model.toLowerCase()}_${field}\` ` +
            `to generate the missing migration, then commit it.`,
        );
      }
      expect(found).toBe(true);
    },
  );
});
