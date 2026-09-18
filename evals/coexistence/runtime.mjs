import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { buildSync } from "esbuild";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

// Bundle the real pure document helpers into the isolated VM, rather than
// passing host callbacks or reimplementing their transformation semantics.
const helperBundle = buildSync({
  stdin: {
    contents:
      'export * from "datocms-structured-text-utils"; export {parse, serialize} from "datocms-structured-text-dastdown"; export {buildBlockRecord, ApiError, TimeoutError} from "@datocms/cma-client";',
    resolveDir: fileURLToPath(new URL("../../", import.meta.url)),
  },
  bundle: true,
  format: "iife",
  globalName: "fixtureUtilities",
  platform: "browser",
  write: false,
  minify: true,
}).outputFiles[0].text;

export const declarations = `
interface Span { type: 'span'; value: string; marks?: string[] }
interface Paragraph { type: 'paragraph'; children: Inline[] }
interface Link { type: 'link'; url: string; meta?: { id: string; value: string }[]; children: Span[] }
interface Block { type: 'block'; item: { id: string; type: 'item'; __itemTypeId: string; attributes: { caption: string; image: null } } }
type Inline = Span | Link;
type Node = Paragraph | Block;
interface Root { type: 'root'; children: Node[] }
type GenericNode = Inline | Node | Root;
interface Dast { schema: 'dast'; document: { type: 'root'; children: Node[] } }
declare namespace Schema {
  interface Article { title: string; untouched: string; body: { en: Dast | null; it: Dast | null } }
  interface ImageBlock { caption: string; image: null }
  const Article: { ID: 'article'; REF: { type: 'item_type'; id: 'article' } };
  const ImageBlock: { ID: 'image-block'; REF: { type: 'item_type'; id: 'image-block' } };
}
interface ItemMeta { current_version: string; status: 'draft' | 'updated' | 'published' }
type Item<T> = T & { id: string; meta: ItemMeta };
type FieldValueInRequest<T, K extends keyof T> = T[K];
type BlockInNestedResponse<T> = { id: string; type: 'item'; __itemTypeId: string; attributes: T };
declare namespace ApiTypes { type Item<T> = T & {id: string; meta: ItemMeta}; type ItemInNestedResponse<T> = Item<T>; type ItemUpdateSchema<T> = Partial<T>; }
declare const client: { items: {
  find<T = Schema.Article>(id: string, options?: { nested?: boolean; version?: 'current' | 'published' }): Promise<Item<T>>;
  update<T = Schema.Article>(id: string, values: Partial<T> & { meta?: { current_version: string } }): Promise<Item<T>>;
} };
declare function isSpan(node: GenericNode): node is Span;
declare function isParagraph(node: GenericNode): node is Paragraph;
declare function isLink(node: GenericNode): node is Link;
declare function isBlock(node: GenericNode): node is Block;
declare function isBlockWithItemOfType(id: string, node: GenericNode): node is Block;
declare function isBlockWithItemOfType(id: string): (node: GenericNode) => node is Block;
declare function mapNodes<T extends Dast | GenericNode>(content: T, mapper: (node: GenericNode) => GenericNode | GenericNode[] | null | undefined): T;
declare function findFirstNode(content: Dast | GenericNode, predicate: (node: GenericNode) => boolean): {node: GenericNode} | undefined;
declare function serialize(content: Dast | null): string;
declare function parse(text: string, original: Dast): Dast;
declare function parse(text: string): Dast;
declare function buildBlockRecord<T>(attributes: Partial<T> & {id?: string; item_type?: {type: 'item_type'; id: string}}): BlockInNestedResponse<T>;
declare const console: { log(...values: (object | string | number | boolean | null | undefined)[]): void };
declare function structuredClone<T>(value: T): T;
`;

// Match the currently exposed MCP contract: only client and Schema are implicit.
// Compile against the installed SDK/helper declarations instead of invented unions.
export const mcpDeclarations = `
import type { Client, ItemTypeDefinition } from '@datocms/cma-client-node';
declare global {
  namespace Schema {
    type ImageBlock = ItemTypeDefinition<{locales: 'en' | 'it'}, 'image-block', {
      caption: {type: 'string'}; image: {type: 'file'};
    }>;
    type Article = ItemTypeDefinition<{locales: 'en' | 'it'}, 'article', {
      title: {type: 'string'}; untouched: {type: 'string'};
      body: {type: 'structured_text'; localized: true; blocks: ImageBlock};
    }>;
    type AnyModel = Article | ImageBlock;
    const Article: { ID: 'article'; REF: { type: 'item_type'; id: 'article' } };
    const ImageBlock: { ID: 'image-block'; REF: { type: 'item_type'; id: 'image-block' } };
  }
  const client: Pick<Client, 'items'>;
  const console: { log(...values: (object | string | number | boolean | null | undefined)[]): void };
  function structuredClone<T>(value: T): T;
}
`;
const resolvePackage = createRequire(import.meta.url);
const packages = [
  "@datocms/cma-client-node",
  "datocms-structured-text-utils",
  "datocms-structured-text-dastdown",
];
const typePaths = Object.fromEntries(
  packages.map((name) => {
    const metadata = resolvePackage.resolve(name + "/package.json");
    const info = JSON.parse(readFileSync(metadata, "utf8"));
    return [name, [resolve(dirname(metadata), info.types ?? info.typings)]];
  }),
);
// The hosted sandbox is Node.js, so pure built-ins are also valid. Keep this
// test double restricted to the JSON-value comparator needed by these tasks.
typePaths["node:util"] = [resolve(dirname(resolvePackage.resolve("@types/node/package.json")), "util.d.ts")];
const importablePackages = [...packages, "node:util"];
const sdkRoot = dirname(
  resolvePackage.resolve("@datocms/cma-client/package.json"),
);
const apiTypeFile = ts.createSourceFile(
  "ApiTypes.d.ts",
  readFileSync(join(sdkRoot, "dist/types/generated/ApiTypes.d.ts"), "utf8"),
  ts.ScriptTarget.Latest,
  true,
);
export const mcpMethodTypes = apiTypeFile.statements
  .find(
    (statement) =>
      ts.isTypeAliasDeclaration(statement) &&
      statement.name.text === "ItemMeta",
  )
  .getText(apiTypeFile);

function importedBindings(source) {
  const file = ts.createSourceFile(
    "script.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const bindings = [];
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const clause = statement.importClause;
    if (!clause || clause.isTypeOnly) continue;
    const namespace = statement.moduleSpecifier.text;
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const element of clause.namedBindings.elements) {
        if (!element.isTypeOnly)
          bindings.push({
            package: namespace,
            imported: element.propertyName?.text ?? element.name.text,
            local: element.name.text,
          });
      }
    } else if (
      clause.namedBindings &&
      ts.isNamespaceImport(clause.namedBindings)
    ) {
      bindings.push({
        package: namespace,
        local: clause.namedBindings.name.text,
      });
    }
  }
  return bindings;
}

export function inspectSource(source, { runtime = "cli" } = {}) {
  const file = ts.createSourceFile(
    "script.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const errors = [];
  const methods = new Set();
  const banned = new Set([
    "process",
    "require",
    "fetch",
    "eval",
    "Function",
    "global",
    "globalThis",
    "setTimeout",
    "setInterval",
    "WebAssembly",
  ]);
  const isOwnPropertyCheck = (node) => {
    // This standard value-comparison idiom stays entirely inside the VM.
    // Permit only its invocation, not arbitrary access to prototype objects.
    const expression = node.parent?.parent?.parent;
    return (
      ts.isIdentifier(node) &&
      node.text === "prototype" &&
      expression &&
      ts.isPropertyAccessExpression(expression) &&
      expression.getText(file) === "Object.prototype.hasOwnProperty.call" &&
      ts.isCallExpression(expression.parent) &&
      expression.parent.expression === expression &&
      expression.parent.arguments.length === 2
    );
  };
  function visit(node) {
    if (
      node.kind === ts.SyntaxKind.AnyKeyword ||
      node.kind === ts.SyntaxKind.UnknownKeyword
    )
      errors.push("Explicit any/unknown is not allowed");
    if (ts.isImportDeclaration(node)) {
      if (runtime !== "mcp")
        errors.push(
          "CLI stdin fixture uses ambient globals; imports are unavailable",
        );
      else if (
        !ts.isStringLiteral(node.moduleSpecifier) ||
        !importablePackages.includes(node.moduleSpecifier.text)
      )
        errors.push("Import outside the bounded fixture's supported modules");
      else if (node.importClause?.name)
        errors.push(
          "The supported packages expose named exports, not default imports",
        );
    }
    if (
      ts.isImportEqualsDeclaration(node) ||
      (ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword)
    )
      errors.push("Only static ESM imports are supported");
    if (ts.isIdentifier(node) && banned.has(node.text))
      errors.push(`Unavailable fixture global: ${node.text}`);
    if (
      (ts.isIdentifier(node) || ts.isStringLiteral(node)) &&
      ["constructor", "prototype", "__proto__"].includes(node.text) &&
      !isOwnPropertyCheck(node)
    )
      errors.push("Prototype access is outside the fixture runtime");
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const text = node.expression.getText(file);
      if (text.startsWith("client."))
        methods.add(text.replace(/^client\./, ""));
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (/@ts-(?:ignore|expect-error|nocheck)/.test(source))
    errors.push("Type-check suppression is not allowed");
  if (/\bas\s+never\b/.test(source))
    errors.push("Casting to never is not allowed");
  return { errors: [...new Set(errors)], methods: [...methods] };
}

export function compile(source, { runtime = "cli" } = {}) {
  const inspected = inspectSource(source, { runtime });
  if (inspected.errors.length) return { ...inspected, javascript: null };
  const directory = mkdtempSync(join(tmpdir(), "skill-script-"));
  try {
    const input = join(directory, "script.ts");
    writeFileSync(input, `export {};\n${source}`);
    const types = join(directory, "fixture.d.ts");
    writeFileSync(types, runtime === "mcp" ? mcpDeclarations : declarations);
    const options = {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      strict: true,
      noEmit: true,
      types: [],
      lib: ["lib.es2022.d.ts"],
      skipLibCheck: true,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      ...(runtime === "mcp" ? { paths: typePaths } : {}),
    };
    const program = ts.createProgram([input, types], options);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    const errors = diagnostics.map((d) =>
      ts.flattenDiagnosticMessageText(d.messageText, "\n"),
    );
    if (errors.length) return { ...inspected, errors, javascript: null };
    const executable =
      runtime === "mcp"
        ? ts.createPrinter().printFile(
            ts.factory.updateSourceFile(
              ts.createSourceFile(
                "script.ts",
                source,
                ts.ScriptTarget.Latest,
                true,
                ts.ScriptKind.TS,
              ),
              ts
                .createSourceFile(
                  "script.ts",
                  source,
                  ts.ScriptTarget.Latest,
                  true,
                  ts.ScriptKind.TS,
                )
                .statements.filter((s) => !ts.isImportDeclaration(s)),
            ),
          )
        : source;
    const javascript = ts
      .transpileModule(executable, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ES2022,
        },
      })
      .outputText.replace(/^export \{\};?\s*$/gm, "");
    return {
      ...inspected,
      errors: [],
      javascript,
      imports: runtime === "mcp" ? importedBindings(source) : [],
    };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function isBlockGuardSource() {
  return `function guard(id, node) {
    if (node === undefined) return candidate => guard(id, candidate);
    return fixtureUtilities.isBlockWithItemOfType(id, node) || (node.type === 'block' && node.item?.__itemTypeId === id);
  }`;
}

// All objects/functions visible to the submitted program are constructed inside
// the VM. There is no host callback, file/network API, token or real CMA client.
// This is a bounded test double, not a sandbox for arbitrary hostile programs.
export function execute(
  source,
  record,
  { writable = false, runtime = "cli" } = {},
) {
  const result = compile(source, { runtime });
  if (result.errors.length) return { ...result, record, calls: [], output: [] };
  const context = vm.createContext(
    {},
    {
      codeGeneration: { strings: false, wasm: false },
      microtaskMode: "afterEvaluate",
    },
  );
  const bootstrap = `
    ${helperBundle}
    const record = ${JSON.stringify(record)};
    const calls = [], output = [];
    const copy = (value) => JSON.parse(JSON.stringify(value));
    // CMS fixtures are JSON values; keep cloning inside the VM, without host callbacks.
    const structuredClone = copy;
    const isDeepStrictEqual = (a, b) => {
      if (Object.is(a, b)) return true;
      if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      const keys = Object.keys(a);
      return keys.length === Object.keys(b).length && keys.every(key =>
        Object.prototype.hasOwnProperty.call(b, key) && isDeepStrictEqual(a[key], b[key]));
    };
    const client = { items: {
      async find(id, options) {
        calls.push({ method: 'items.find', id, options });
        if (id !== record.id) throw Error('Unknown fixture record');
        return copy(record);
      },
      async update(id, values) {
        const call = { method: 'items.update', id, values: copy(values), applied: false };
        calls.push(call);
        if (!${JSON.stringify(writable)}) throw Error('Read-only execution: update denied');
        if (id !== record.id) throw Error('Unknown fixture record');
        if (values.meta && values.meta.current_version !== record.meta.current_version) throw Error('STALE_ITEM_VERSION');
        for (const key of Object.keys(values)) if (!['title', 'body', 'untouched', 'meta'].includes(key)) throw Error('Unknown fixture field: ' + key);
        const patch = copy(values); delete patch.meta;
        const blocks = new Map();
        function collect(value) {
          if (!value || typeof value !== 'object') return;
          if (value.type === 'item' && value.id && value.attributes) blocks.set(value.id, value);
          Object.values(value).forEach(collect);
        }
        function expand(value, key) {
          if (key === 'item' && typeof value === 'string' && blocks.has(value)) return copy(blocks.get(value));
          if (!value || typeof value !== 'object') return value;
          if (value.type === 'item' && value.id && value.attributes && blocks.has(value.id)) {
            const old = blocks.get(value.id); value = {...copy(old), ...value, attributes: {...copy(old.attributes), ...value.attributes}};
          }
          for (const key of Object.keys(value)) value[key] = expand(value[key], key);
          return value;
        }
        collect(record.body); if (patch.body) patch.body = expand(patch.body);
        Object.assign(record, patch);
        record.meta.current_version = String(Number(record.meta.current_version) + 1);
        record.meta.updated_at = '2026-09-18T12:00:00Z';
        call.applied = true;
        return copy(record);
      }
    } };
    const {isSpan, isParagraph, isLink, isBlock, mapNodes, findFirstNode, parse, serialize} = fixtureUtilities;
    // The fixture declares its model discriminator explicitly and omits the
    // redundant JSON:API relationship; adapt the guard at that boundary only.
    const isBlockWithItemOfType = (id, node) => node === undefined ? candidate => isBlockWithItemOfType(id, candidate) :
      fixtureUtilities.isBlockWithItemOfType(id, node) || (node.type === 'block' && node.item?.__itemTypeId === id);
    const Schema = {Article: {ID: 'article', REF: {type: 'item_type', id: 'article'}}, ImageBlock: {ID: 'image-block', REF: {type: 'item_type', id: 'image-block'}}};
    const buildBlockRecord = ({id, item_type, ...attributes}) => ({...(id ? {id} : {}), type: 'item', ...(item_type ? {relationships: {item_type: {data: item_type}}} : {}), attributes});
    const console = { log: (...values) => output.push(values.map(value => typeof value === 'string' ? value : JSON.stringify(value)).join(' ')) };
    let finished = false, failure = null;
    // MCP script scope exposes exactly the documented implicit names. Imports
    // resolve to pure code constructed in this VM; no host callbacks are passed.
    (async () => {
      ${runtime === "mcp" ? "const isSpan=undefined, isParagraph=undefined, isLink=undefined, isBlock=undefined, mapNodes=undefined, findFirstNode=undefined, parse=undefined, serialize=undefined, isBlockWithItemOfType=undefined, buildBlockRecord=undefined;" : ""}
      const packageExports = {
        'node:util': {isDeepStrictEqual},
        'datocms-structured-text-utils': {...fixtureUtilities, isBlockWithItemOfType: (${isBlockGuardSource()})},
        'datocms-structured-text-dastdown': {parse: fixtureUtilities.parse, serialize: fixtureUtilities.serialize},
        '@datocms/cma-client-node': {buildBlockRecord: fixtureUtilities.buildBlockRecord, ApiError: fixtureUtilities.ApiError, TimeoutError: fixtureUtilities.TimeoutError}
      };
      { ${result.imports
        .map((binding) =>
          binding.imported
            ? `const ${binding.local} = packageExports[${JSON.stringify(binding.package)}][${JSON.stringify(binding.imported)}];`
            : `const ${binding.local} = packageExports[${JSON.stringify(binding.package)}];`,
        )
        .join("\n")}
        ${result.javascript}\n
      }
    })().then(() => { finished = true; }, error => { failure = String(error); finished = true; });
  `;
  try {
    new vm.Script(bootstrap).runInContext(context, { timeout: 1500 });
    const serialized = new vm.Script(
      "JSON.stringify({ record, calls, output, finished, failure })",
    ).runInContext(context, { timeout: 500 });
    const outcome = JSON.parse(serialized);
    if (!outcome.finished)
      throw new Error("Fixture script did not finish its microtasks");
    return {
      ...result,
      ...outcome,
      errors: outcome.failure ? [outcome.failure] : [],
    };
  } catch (error) {
    // Real CMA calls already applied before a later failure are not rolled back.
    // Recover the VM's JSON-only effects even if execution hit its time limit.
    let partial = { record, calls: [], output: [] };
    try {
      partial = JSON.parse(
        new vm.Script("JSON.stringify({record, calls, output})").runInContext(
          context,
          { timeout: 100 },
        ),
      );
    } catch {
      /* Original failure remains visible. */
    }
    return { ...result, ...partial, errors: [String(error)] };
  }
}
