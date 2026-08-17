import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { Validator } from "@seriousme/openapi-schema-validator";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

// The gate on the published Provider contract, which is a machine-readable artefact rather than
// prose: docs/provider-contract/v1/openapi.yaml. The argument for every shape asserted here is
// docs/adr/0021-the-provider-contract.md, and what the contract has to carry at all is
// ADR-0014 -> Extended: the capability endpoint carries five things it was never sized for.
//
// **Why a test rather than a `check-docs` check.** Every check in that script compares a document
// against a source that can be unreachable, so each one can report SKIP and a skip must not fail
// the build. This compares a file against a JSON Schema shipped inside a dependency: it can never
// skip, and a failure is never transient. It also has to be red on a laptop before the branch
// exists, which the gates list makes true of `pnpm -r test` and not of the documents check.
//
// **And why it reads the real tree**, where `check-docs.test.ts` deliberately runs against a
// fixture: the file below *is* the thing under test. There is no unrelated prose to drift, and a
// spec that stops meeting the assertions here is exactly the failure this file exists to catch.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The one place the major version is written in this file; everything else derives from it. */
const MAJOR = "v1";
const SPEC = join("docs", "provider-contract", MAJOR, "openapi.yaml");

const source = readFileSync(join(ROOT, SPEC), "utf8");
const document = parse(source) as OpenApiDocument;

type Schema = { $ref?: string; enum?: string[]; [key: string]: unknown };
type MediaType = { schema?: Schema; examples?: Record<string, { value: unknown }> };
type Response = { $ref?: string; content?: Record<string, MediaType> };
type Operation = { operationId?: string; responses?: Record<string, Response> };
type OpenApiDocument = {
  openapi: string;
  info: { version: string };
  servers: { url: string }[];
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, Schema>; responses: Record<string, Response> };
};

/** Every operation in the document, with the path and method that reach it. */
function* operations(): Generator<{ path: string; method: string; operation: Operation }> {
  for (const [path, item] of Object.entries(document.paths)) {
    for (const [method, operation] of Object.entries(item)) {
      yield { path, method, operation };
    }
  }
}

/**
 * Every response body in the document: one entry per (operation, status, media type).
 *
 * The shared error responses are `$ref`s into `components/responses`, so following one is what
 * keeps the assertions below from passing vacuously on every error the contract declares.
 */
function* bodies(): Generator<{
  where: string;
  status: string;
  mediaType: string;
  content: MediaType;
}> {
  for (const { path, method, operation } of operations()) {
    for (const [status, declared] of Object.entries(operation.responses ?? {})) {
      const response = declared.$ref
        ? document.components.responses[declared.$ref.split("/").pop()!]
        : declared;

      for (const [mediaType, content] of Object.entries(response.content ?? {})) {
        yield { where: `${method.toUpperCase()} ${path}`, status, mediaType, content };
      }
    }
  }
}

/**
 * The document, registered with a JSON Schema validator so an example can be checked against the
 * schema it illustrates. `strict` is off because OpenAPI's own keywords — `discriminator`,
 * `example`, `paths` — are not JSON Schema keywords, and `validateSchema` because the enclosing
 * document is an OpenAPI specification rather than a schema: the check that it is a well-formed
 * one is the first test below, against the real meta-schema.
 */
function validatorFor(schema: string) {
  const ajv = new Ajv({ strict: false, validateSchema: false });
  addFormats(ajv);
  ajv.addSchema(document, "openapi.yaml");
  return ajv.compile({ $ref: `openapi.yaml#/components/schemas/${schema}` });
}

/** A conformant capability declaration, as the minimum every case below varies from. */
const capabilities = {
  source: { id: "example", name: "An example Source", url: "https://example.invalid" },
  retention: "indefinite",
  licence: {
    spdx: "CC0-1.0",
    name: "CC0 1.0 Universal",
    url: "https://example.invalid/licence",
    shareAlike: false,
  },
  attribution: { required: false },
};

test("the published contract is a valid OpenAPI document", async () => {
  const validator = new Validator();
  const result = await validator.validate(join(ROOT, SPEC));

  assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
  assert.equal(validator.version, "3.1");
});

test("the major version is in the URI, and the directory and the document agree with it", () => {
  assert.equal(basename(dirname(SPEC)), MAJOR);

  // One server, and it is a template: what a person pastes is a base URL, and the version is
  // what this contract appends to it. ADR-0007's surviving criticism of Audiobookshelf is that
  // its contract carries no version anywhere in the URI at all.
  assert.equal(document.servers.length, 1);
  assert.match(document.servers[0].url, new RegExp(`/${MAJOR}$`));

  // `info.version` is the document's own revision, which moves additively within the major. Its
  // major has to be the one in the URI, or an implementor cannot tell which contract they built
  // against.
  assert.equal(document.info.version.split(".")[0], MAJOR.replace("v", ""));
});

test("the contract is read-only, so a Provider is never asked to hold anything", () => {
  for (const { path, method } of operations()) {
    assert.equal(method, "get", `${path} declares a ${method.toUpperCase()}`);
  }
});

test("every response body names a component schema, so a consumer can generate types for it", () => {
  for (const { where, status, mediaType, content } of bodies()) {
    assert.match(
      content.schema?.$ref ?? "",
      /^#\/components\/schemas\/\w+$/,
      `${where} ${status} ${mediaType} answers with an inline schema`,
    );
  }
});

test("every example validates against the schema it illustrates", () => {
  for (const { where, status, content } of bodies()) {
    const schema = content.schema!.$ref!.split("/").pop()!;
    const validate = validatorFor(schema);

    for (const [name, example] of Object.entries(content.examples ?? {})) {
      assert.equal(
        validate(example.value),
        true,
        `${where} ${status} example "${name}" does not match ${schema}: ${JSON.stringify(validate.errors, null, 2)}`,
      );
    }
  }
});

test("every answer this contract can give is shown, not only described", () => {
  // Audiobookshelf's contract drifted from its own specification — the spec declares two query
  // parameters and its client sends four (docs/research/audiobookshelf-provider-contract.md).
  // An example is what an implementor copies, so a response with none is where that drift starts,
  // and one that nothing validates is worse than none at all. The test above is what makes an
  // example evidence rather than decoration; this is what makes it compulsory.
  for (const { where, status, content } of bodies()) {
    assert.ok(
      Object.keys(content.examples ?? {}).length > 0,
      `${where} answers ${status} with no example`,
    );
  }
});

test("an error is always RFC 9457 problem details", () => {
  for (const { where, status, mediaType } of bodies()) {
    if (Number(status) < 400) continue;
    assert.equal(mediaType, "application/problem+json", `${where} answers ${status} with ${mediaType}`);
  }
});

test("the closed vocabularies are the ones CONTEXT.md defines", () => {
  const { schemas } = document.components;

  // Liveness: "What a Source is currently saying about a record it used to have: present,
  // missing, or gone." A fourth value is a change to the glossary before it is a change here.
  assert.deepEqual(schemas.Liveness.enum, ["present", "missing", "gone"]);

  // Rank: "How strongly a Placement is held: preferred, ordinary, or discredited."
  assert.deepEqual(schemas.Rank.enum, ["preferred", "ordinary", "discredited"]);

  // Two levels and no third: ADR-0001. The type discriminator is the first thing ADR-0007 says
  // Audiobookshelf's schema has no answer for.
  assert.deepEqual(schemas.RecordType.enum, ["story", "version"]);
});

test("the capability declaration carries the five things the application cannot know otherwise", () => {
  const { properties, required } = document.components.schemas.Capabilities as {
    properties: Record<string, unknown>;
    required: string[];
  };

  // ADR-0014 -> Extended: the capability endpoint carries five things it was never sized for.
  // 1. retention policy; 2. required attribution, with its licence identity; 3. usage
  // restrictions; 4. content classification; 5. a source-scoped external identifier with
  // liveness semantics, which is `Record.id` plus this declaration of what `gone` can mean here.
  for (const declaration of [
    "retention",
    "attribution",
    "licence",
    "restrictions",
    "classification",
    "liveness",
    "orderings",
  ]) {
    assert.ok(declaration in properties, `the declaration carries no ${declaration}`);
  }

  // Absence is refusal rather than permission (CAN-104 Read a Provider's capability declaration,
  // and refuse what it does not serve), so the two that would otherwise be read as a permissive
  // default are the two a conformant Provider must state.
  assert.ok(required.includes("retention"));
  assert.ok(required.includes("attribution"));
});

test("a declaration may state that no attribution is required at all", () => {
  // Open Library and MusicBrainz core are CC0, which requires no attribution: the obligation has
  // to be able to say none (ADR-0014 -> Decision 9). A schema that made the notice mandatory
  // would force every Provider to invent one.
  assert.equal(validatorFor("Capabilities")(capabilities), true);
});

test("an attribution obligation carries the notice it obliges", () => {
  const validate = validatorFor("Capabilities");

  assert.equal(validate({ ...capabilities, attribution: { required: true } }), false);
  assert.equal(
    validate({
      ...capabilities,
      attribution: { required: true, notice: "Data from Somewhere", link: "https://example.invalid" },
    }),
    true,
  );
});

test("a Provider that declares no retention has not declared indefinite retention", () => {
  const { retention, ...withoutRetention } = capabilities;
  void retention;

  assert.equal(validatorFor("Capabilities")(withoutRetention), false);
  assert.equal(validatorFor("Capabilities")({ ...capabilities, retention: "P6M" }), true);
  assert.equal(validatorFor("Capabilities")({ ...capabilities, retention: "6 months" }), false);
});
