#!/usr/bin/env python3
"""Run deterministic routing checks for the datocms-setup router."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

DEFAULT_FIXTURE = "evals/fixtures/router/datocms-setup.json"
DEFAULT_ROUTER_PATH = "skills/datocms-setup/references/router.md"
DEFAULT_MANIFEST_PATH = "skills/datocms-setup/references/recipe-manifest.json"
ALLOWED_STAGE_B = (
    "none",
    "visual-editing",
    "vercel-overlay-conflict",
    "site-search",
    "graphql-types",
    "migrations",
)

VISUAL_EDITING_PATTERNS = (
    "full visual editing",
    "preview and editor workflows",
    "preview/editor workflows",
    "side-by-side editing",
    "visual mode",
    "live preview workflow",
)
WEBSITE_ONLY_PATTERNS = (
    "website click-to-edit only",
    "website click to edit only",
)
WEB_PREVIEWS_PATTERNS = (
    "preview-links",
    "preview links",
    "record-to-url",
    "record to url",
    "web previews",
)
DRAFT_MODE_PATTERNS = (
    "enable and disable endpoints",
    "enable/disable",
    "dual-token executequery",
    "draft mode",
    "preview mode",
)
REALTIME_PATTERNS = (
    "real-time",
    "realtime",
    "live preview updates",
    "instant updates",
    "over sse",
    "sse",
)
NEGATIVE_PATTERNS = (
    "patch the current renderer only",
    "patch my existing preview-links route handler only",
    "wire @vercel/toolbar",
    "graphql query and page component for blog posts",
)
ORDERED_RECIPE_IDS = (
    "build-triggers",
    "cache-tags",
    "cda-client",
    "cli-profiles",
    "cma-types",
    "content-link",
    "contentful-import",
    "draft-mode",
    "graphql-types",
    "migration-autogenerate",
    "migration-release-workflow",
    "migrations",
    "realtime",
    "responsive-images",
    "robots-sitemaps",
    "sandbox-iteration",
    "seo",
    "site-search",
    "structured-text",
    "video-player",
    "visual-editing",
    "web-previews",
    "webhooks",
    "wordpress-import",
    "blueprint-sync",
)
EXTRA_ALIASES: dict[str, tuple[str, ...]] = {
    "build-triggers": ("build trigger", "build triggers"),
    "cache-tags": ("cache invalidation", "cache tags", "revalidatetag", "purge"),
    "cda-client": ("@datocms/cda-client", "published cda token", "shared query utility", "cda client"),
    "cli-profiles": ("staging and production profiles", "per-profile token", "named profiles"),
    "cma-types": ("generate-cma-types", "cma-types.ts", "schema types"),
    "content-link": ("click-to-edit", "click to edit", "stega", "content link"),
    "contentful-import": ("contentful import", "contentful import plugin"),
    "draft-mode": ("draft site", "draft content", "preview reads"),
    "graphql-types": ("gql.tada", "typed graphql", ".graphql documents", "graphql code generator", "code generator"),
    "migration-autogenerate": ("migrations:new --autogenerate", "autogenerate"),
    "migration-release-workflow": ("release helper", "maintenance mode", "promotion"),
    "migrations": ("migrations folder", "baseline scripts", "shared migrations directory", "set up datocms migrations"),
    "responsive-images": ("dato image wrapper", "responsive image", "real image field", "srcset"),
    "robots-sitemaps": ("robots.txt", "sitemap", "sitemaps"),
    "sandbox-iteration": ("destroys and reforks", "reforks a datocms sandbox", "iterate locally", "sandbox reset", "reruns migrations in place"),
    "seo": ("_seometatags", "favicon meta tags", "canonical url", "seo"),
    "site-search": ("site search", "search route", "search indexes", "search index", "/blog and /docs", "/blog, /docs, and /help"),
    "structured-text": ("structured text", "shared renderer", "dato structured text"),
    "video-player": ("mux video", "video wrapper", "dato video field", "video player"),
    "webhooks": ("webhook config", "webhook receiver", "sync helper", "webhooks"),
    "wordpress-import": ("wordpress import", "wordpress import support", "wordpress import plugin"),
    "blueprint-sync": ("blueprint sync", "entity ids aligned", "shared migration history"),
}


@dataclass(frozen=True)
class RecipeDefinition:
    recipe_id: str
    prerequisites: list[str]
    triggers: list[str]


@dataclass(frozen=True)
class RouterEvalCase:
    query: str
    should_route: bool
    expected_recipes: list[str]
    expected_stage_a: bool
    expected_stage_b: str
    notes: str


@dataclass(frozen=True)
class RouterEvalResult:
    query: str
    should_route: bool
    predicted_should_route: bool
    expected_recipes: list[str]
    predicted_recipes: list[str]
    expected_stage_a: bool
    predicted_stage_a: bool
    expected_stage_b: str
    predicted_stage_b: str
    pass_result: bool
    notes: str


def _normalize(text: str) -> str:
    return " ".join(text.lower().split())


def _contains_any(text: str, patterns: tuple[str, ...] | list[str]) -> bool:
    return any(pattern in text for pattern in patterns)


def _load_manifest(path: Path) -> dict[str, RecipeDefinition]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    recipes = payload.get("recipes", [])
    if not isinstance(recipes, list):
        raise ValueError(f"{path}: manifest must include a recipes array")

    definitions: dict[str, RecipeDefinition] = {}
    for recipe in recipes:
        if not isinstance(recipe, dict):
            continue
        recipe_id = recipe.get("id")
        if not isinstance(recipe_id, str) or not recipe_id.strip():
            continue
        prerequisites = recipe.get("prerequisites", [])
        triggers = recipe.get("triggers", [])
        definitions[recipe_id] = RecipeDefinition(
            recipe_id=recipe_id,
            prerequisites=[item for item in prerequisites if isinstance(item, str)],
            triggers=[item.lower() for item in triggers if isinstance(item, str)],
        )
    return definitions


def _load_fixture(path: Path) -> list[RouterEvalCase]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError(f"{path}: expected JSON array")

    cases: list[RouterEvalCase] = []
    for index, row in enumerate(payload):
        if not isinstance(row, dict):
            raise ValueError(f"{path}: case {index} must be an object")

        query = row.get("query")
        should_route = row.get("should_route")
        expected_recipes = row.get("expected_recipes", [])
        expected_stage_a = row.get("expected_stage_a")
        expected_stage_b = row.get("expected_stage_b")
        notes = row.get("notes", "")

        if not isinstance(query, str) or not query.strip():
            raise ValueError(f"{path}: case {index} must include non-empty query")
        if not isinstance(should_route, bool):
            raise ValueError(f"{path}: case {index} must include boolean should_route")
        if not isinstance(expected_recipes, list) or any(
            not isinstance(item, str) or not item.strip() for item in expected_recipes
        ):
            raise ValueError(f"{path}: case {index} must include string array expected_recipes")
        if not isinstance(expected_stage_a, bool):
            raise ValueError(f"{path}: case {index} must include boolean expected_stage_a")
        if expected_stage_b not in ALLOWED_STAGE_B:
            allowed = ", ".join(ALLOWED_STAGE_B)
            raise ValueError(
                f"{path}: case {index} has invalid expected_stage_b; expected one of {allowed}"
            )
        if not isinstance(notes, str):
            raise ValueError(f"{path}: case {index} notes must be a string when present")

        cases.append(
            RouterEvalCase(
                query=query,
                should_route=should_route,
                expected_recipes=list(expected_recipes),
                expected_stage_a=expected_stage_a,
                expected_stage_b=expected_stage_b,
                notes=notes,
            )
        )
    return cases


def _load_router_stage_b_labels(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8")
    labels: list[str] = []
    for needle in (
        "visual-editing",
        "Vercel overlay conflict",
        "site-search",
        "graphql-types",
        "migrations",
    ):
        if needle in text:
            labels.append(needle)
    return labels


def _is_negative_patch_only(query: str) -> bool:
    normalized = _normalize(query)
    return _contains_any(normalized, NEGATIVE_PATTERNS)


def _should_route(query: str, matched_recipe_ids: list[str]) -> bool:
    normalized = _normalize(query)
    if _is_negative_patch_only(normalized):
        return False
    if "datocms-setup" in normalized:
        return True
    return bool(matched_recipe_ids)


def _predict_stage_b(query: str) -> str:
    normalized = _normalize(query)
    if not normalized:
        return "none"
    if "vercel" in normalized and (
        "edit mode" in normalized
        or "content link" in normalized
        or "overlay" in normalized
        or "overlays" in normalized
    ):
        return "vercel-overlay-conflict"
    if "preview and editor workflows" in normalized or "preview/editor workflows" in normalized:
        return "visual-editing"
    if "site search" in normalized and "/blog" in normalized and "/docs" in normalized and "separate indexes" not in normalized:
        return "site-search"
    if "graphql code generator" in normalized or "code generator" in normalized or ".graphql documents" in normalized:
        return "graphql-types"
    if (
        "set up datocms migrations" in normalized
        and "have not decided yet" in normalized
    ) or "haven't decided yet" in normalized:
        return "migrations"
    return "none"


def _predict_stage_a(query: str, stage_b: str) -> bool:
    normalized = _normalize(query)
    if stage_b == "visual-editing" and "preview and editor workflows" in normalized:
        return True
    if "set up datocms for this project" in normalized:
        return True
    return False


def _match_base_recipes(query: str, definitions: dict[str, RecipeDefinition]) -> list[str]:
    normalized = _normalize(query)
    matched: list[str] = []

    def add(recipe_id: str) -> None:
        if recipe_id in definitions and recipe_id not in matched:
            matched.append(recipe_id)

    if (
        "set up datocms migrations" in normalized
        and ("have not decided yet" in normalized or "haven't decided yet" in normalized)
    ):
        add("migrations")
        return matched

    if _contains_any(normalized, WEBSITE_ONLY_PATTERNS):
        add("content-link")
    elif _contains_any(normalized, VISUAL_EDITING_PATTERNS):
        add("visual-editing")
    elif _contains_any(normalized, WEB_PREVIEWS_PATTERNS):
        add("web-previews")

    if _contains_any(normalized, DRAFT_MODE_PATTERNS):
        add("draft-mode")
    if _contains_any(normalized, REALTIME_PATTERNS):
        add("realtime")

    for recipe_id in ORDERED_RECIPE_IDS:
        if recipe_id in {"visual-editing", "content-link", "web-previews", "draft-mode", "realtime"}:
            continue
        recipe = definitions.get(recipe_id)
        if recipe is None:
            continue
        trigger_patterns = tuple(recipe.triggers) + EXTRA_ALIASES.get(recipe_id, ())
        if trigger_patterns and _contains_any(normalized, trigger_patterns):
            add(recipe_id)

    if "set up datocms migrations" in normalized and "migrations" not in matched:
        add("migrations")

    return matched


def _expand_recipes(
    base_recipe_ids: list[str],
    query: str,
    definitions: dict[str, RecipeDefinition],
) -> list[str]:
    normalized = _normalize(query)
    ordered: list[str] = []
    seen: set[str] = set()

    def add(recipe_id: str) -> None:
        if recipe_id in seen:
            return
        recipe = definitions.get(recipe_id)
        if recipe is None:
            return
        for prerequisite in recipe.prerequisites:
            add(prerequisite)
        seen.add(recipe_id)
        ordered.append(recipe_id)

    for recipe_id in base_recipe_ids:
        if recipe_id == "visual-editing":
            add("draft-mode")
            add("content-link")
            if not _contains_any(normalized, WEBSITE_ONLY_PATTERNS):
                add("web-previews")
            if _contains_any(normalized, REALTIME_PATTERNS) and "keep realtime off" not in normalized:
                add("realtime")
            continue
        add(recipe_id)

    return ordered


def _evaluate_case(
    case: RouterEvalCase,
    definitions: dict[str, RecipeDefinition],
) -> RouterEvalResult:
    matched = _match_base_recipes(case.query, definitions)
    predicted_should_route = _should_route(case.query, matched)

    if predicted_should_route:
        predicted_stage_b = _predict_stage_b(case.query)
        predicted_stage_a = _predict_stage_a(case.query, predicted_stage_b)
        predicted_recipes = _expand_recipes(matched, case.query, definitions)
    else:
        predicted_stage_b = "none"
        predicted_stage_a = False
        predicted_recipes = []

    pass_result = (
        predicted_should_route == case.should_route
        and predicted_recipes == case.expected_recipes
        and predicted_stage_a == case.expected_stage_a
        and predicted_stage_b == case.expected_stage_b
    )

    return RouterEvalResult(
        query=case.query,
        should_route=case.should_route,
        predicted_should_route=predicted_should_route,
        expected_recipes=case.expected_recipes,
        predicted_recipes=predicted_recipes,
        expected_stage_a=case.expected_stage_a,
        predicted_stage_a=predicted_stage_a,
        expected_stage_b=case.expected_stage_b,
        predicted_stage_b=predicted_stage_b,
        pass_result=pass_result,
        notes=case.notes,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run datocms-setup router eval cases")
    parser.add_argument("--repo-root", default=".", help="Repository root (default: .)")
    parser.add_argument(
        "--fixture",
        default=DEFAULT_FIXTURE,
        help=f"Router eval fixture path relative to repo root (default: {DEFAULT_FIXTURE})",
    )
    parser.add_argument(
        "--output-json",
        help="Optional path for writing the scored JSON result",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()
    fixture_path = repo_root / args.fixture
    manifest_path = repo_root / DEFAULT_MANIFEST_PATH
    router_path = repo_root / DEFAULT_ROUTER_PATH

    definitions = _load_manifest(manifest_path)
    cases = _load_fixture(fixture_path)
    stage_b_labels = _load_router_stage_b_labels(router_path)

    results = [_evaluate_case(case, definitions) for case in cases]
    passed = sum(1 for result in results if result.pass_result)
    failed = len(results) - passed

    payload: dict[str, Any] = {
        "fixture": fixture_path.relative_to(repo_root).as_posix(),
        "router_source": router_path.relative_to(repo_root).as_posix(),
        "manifest_source": manifest_path.relative_to(repo_root).as_posix(),
        "router_stage_b_labels": stage_b_labels,
        "summary": {
            "total": len(results),
            "passed": passed,
            "failed": failed,
        },
        "results": [
            {
                **asdict(result),
                "pass": result.pass_result,
            }
            for result in results
        ],
    }

    rendered = json.dumps(payload, indent=2) + "\n"
    if args.output_json:
        output_path = (repo_root / args.output_json).resolve()
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
