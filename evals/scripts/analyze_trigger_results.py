#!/usr/bin/env python3
"""Analyze skill trigger-eval result files.

Produces a cross-skill summary (gate + unweighted F1 stats + per-skill table)
under `<results-dir>/_summary/<track>/<source>/summary.{json,md}`, and flags
skills without results and results produced for an older description or metadata.

Each result file may be pure JSON or a human-readable preamble followed by JSON
(the format currently used in this repository).
"""

from __future__ import annotations

import argparse
import json
import statistics
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from trigger_eval_common import extract_frontmatter, extract_metadata, iter_skill_files, routing_surface

DEFAULT_QUERY_MODE = "implicit"
KNOWN_QUERY_MODES = ("implicit", "explicit", "overlap")
DEFAULT_RESULTS_DIR = "evals/results/trigger"
DEFAULT_TRACK = "claude"
DEFAULT_SOURCE = "frontmatter"
DEFAULT_TRIGGER_THRESHOLD = 0.5
DEFAULT_F1_THRESHOLD = 0.90
SUMMARY_DIR_NAME = "_summary"


@dataclass
class QueryEvaluation:
    query: str
    should_trigger: bool
    query_mode: str
    boundary_with: list[str]
    trigger_rate: float
    triggers: int
    runs: int
    reported_pass: bool
    threshold_predicted_trigger: bool
    threshold_pass: bool


@dataclass
class QueryModeSummary:
    query_mode: str
    total: int
    reported_passed: int
    reported_accuracy: float
    threshold_accuracy: float
    tp: int
    tn: int
    fp: int
    fn: int
    precision: float
    recall: float
    f1: float
    avg_trigger_rate_true: float
    avg_trigger_rate_false: float


@dataclass
class SkillSummary:
    skill_name: str
    description: str
    routing_surface: Any
    model: str | None
    source_file: str
    total: int
    reported_passed: int
    reported_accuracy: float
    threshold_accuracy: float
    tp: int
    tn: int
    fp: int
    fn: int
    precision: float
    recall: float
    f1: float
    avg_trigger_rate_true: float
    avg_trigger_rate_false: float
    query_modes: list[QueryModeSummary]
    queries: list[QueryEvaluation]


def _safe_div(numerator: float, denominator: float) -> float:
    if denominator == 0:
        return 0.0
    return numerator / denominator


def _mode_sort_key(query_mode: str) -> tuple[int, str]:
    try:
        return (KNOWN_QUERY_MODES.index(query_mode), query_mode)
    except ValueError:
        return (len(KNOWN_QUERY_MODES), query_mode)


def _normalize_query_mode(value: Any) -> str:
    if not isinstance(value, str):
        return DEFAULT_QUERY_MODE
    normalized = value.strip().lower()
    if not normalized:
        return DEFAULT_QUERY_MODE
    return normalized


def _normalize_boundary_with(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    normalized: list[str] = []
    seen: set[str] = set()
    for item in value:
        if not isinstance(item, str):
            continue
        skill_name = item.strip()
        if not skill_name or skill_name in seen:
            continue
        seen.add(skill_name)
        normalized.append(skill_name)
    return normalized


def _extract_json_payload(raw: str, source: Path) -> dict[str, Any]:
    first_brace = raw.find("{")
    if first_brace < 0:
        raise ValueError(f"{source}: no JSON object found")

    decoder = json.JSONDecoder()
    last_error: ValueError | None = None

    cursor = first_brace
    while cursor >= 0:
        try:
            parsed, _end = decoder.raw_decode(raw[cursor:])
            if isinstance(parsed, dict):
                return parsed
            raise ValueError(f"{source}: JSON root is not an object")
        except ValueError as exc:
            last_error = exc
            cursor = raw.find("{", cursor + 1)

    if last_error is not None:
        raise ValueError(f"{source}: could not parse JSON payload") from last_error
    raise ValueError(f"{source}: could not parse JSON payload")


def _load_result_file(path: Path) -> dict[str, Any]:
    raw = path.read_text(encoding="utf-8")
    payload = _extract_json_payload(raw, path)

    required = ("skill_name", "description", "results")
    missing = [key for key in required if key not in payload]
    if missing:
        missing_text = ", ".join(missing)
        raise ValueError(f"{path}: missing required keys: {missing_text}")

    if not isinstance(payload["results"], list):
        raise ValueError(f"{path}: 'results' must be a list")

    return payload


def _summarize_query_items(query_items: list[QueryEvaluation]) -> dict[str, Any]:
    tp = tn = fp = fn = 0
    reported_passed = 0
    true_rates: list[float] = []
    false_rates: list[float] = []

    for item in query_items:
        if item.reported_pass:
            reported_passed += 1

        if item.should_trigger:
            true_rates.append(item.trigger_rate)
            if item.threshold_predicted_trigger:
                tp += 1
            else:
                fn += 1
        else:
            false_rates.append(item.trigger_rate)
            if item.threshold_predicted_trigger:
                fp += 1
            else:
                tn += 1

    total = len(query_items)
    precision = _safe_div(tp, tp + fp)
    recall = _safe_div(tp, tp + fn)

    return {
        "total": total,
        "reported_passed": reported_passed,
        "reported_accuracy": _safe_div(reported_passed, total),
        "threshold_accuracy": _safe_div(tp + tn, total),
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
        "precision": precision,
        "recall": recall,
        "f1": _safe_div(2 * precision * recall, precision + recall),
        "avg_trigger_rate_true": _safe_div(sum(true_rates), len(true_rates)),
        "avg_trigger_rate_false": _safe_div(sum(false_rates), len(false_rates)),
    }


def _build_query_mode_summaries(query_items: list[QueryEvaluation]) -> list[QueryModeSummary]:
    grouped: dict[str, list[QueryEvaluation]] = {}
    for item in query_items:
        grouped.setdefault(item.query_mode, []).append(item)

    mode_summaries: list[QueryModeSummary] = []
    for query_mode in sorted(grouped, key=_mode_sort_key):
        summary = _summarize_query_items(grouped[query_mode])
        mode_summaries.append(
            QueryModeSummary(
                query_mode=query_mode,
                total=summary["total"],
                reported_passed=summary["reported_passed"],
                reported_accuracy=summary["reported_accuracy"],
                threshold_accuracy=summary["threshold_accuracy"],
                tp=summary["tp"],
                tn=summary["tn"],
                fp=summary["fp"],
                fn=summary["fn"],
                precision=summary["precision"],
                recall=summary["recall"],
                f1=summary["f1"],
                avg_trigger_rate_true=summary["avg_trigger_rate_true"],
                avg_trigger_rate_false=summary["avg_trigger_rate_false"],
            )
        )

    return mode_summaries


def _build_skill_summary(payload: dict[str, Any], source_file: Path, threshold: float) -> SkillSummary:
    query_items: list[QueryEvaluation] = []

    for entry in payload["results"]:
        query = str(entry.get("query", "")).strip()
        should_trigger = bool(entry.get("should_trigger", False))
        query_mode = _normalize_query_mode(entry.get("query_mode"))
        boundary_with = _normalize_boundary_with(entry.get("boundary_with"))
        trigger_rate = float(entry.get("trigger_rate", 0.0))
        triggers = int(entry.get("triggers", round(trigger_rate * int(entry.get("runs", 0) or 0))))
        runs = int(entry.get("runs", 0))

        threshold_predicted_trigger = trigger_rate >= threshold
        threshold_pass = threshold_predicted_trigger == should_trigger
        reported_pass = bool(entry["pass"]) if "pass" in entry else threshold_pass

        query_items.append(
            QueryEvaluation(
                query=query,
                should_trigger=should_trigger,
                query_mode=query_mode,
                boundary_with=boundary_with,
                trigger_rate=trigger_rate,
                triggers=triggers,
                runs=runs,
                reported_pass=reported_pass,
                threshold_predicted_trigger=threshold_predicted_trigger,
                threshold_pass=threshold_pass,
            )
        )

    summary = _summarize_query_items(query_items)
    model = payload.get("model")

    return SkillSummary(
        skill_name=str(payload["skill_name"]),
        description=str(payload["description"]),
        routing_surface=payload.get("routing_surface"),
        model=model if isinstance(model, str) and model else None,
        source_file=str(source_file),
        total=summary["total"],
        reported_passed=summary["reported_passed"],
        reported_accuracy=summary["reported_accuracy"],
        threshold_accuracy=summary["threshold_accuracy"],
        tp=summary["tp"],
        tn=summary["tn"],
        fp=summary["fp"],
        fn=summary["fn"],
        precision=summary["precision"],
        recall=summary["recall"],
        f1=summary["f1"],
        avg_trigger_rate_true=summary["avg_trigger_rate_true"],
        avg_trigger_rate_false=summary["avg_trigger_rate_false"],
        query_modes=_build_query_mode_summaries(query_items),
        queries=query_items,
    )


def _compute_gate(skills: list[SkillSummary], f1_threshold: float, missing: list[str]) -> dict[str, Any]:
    below = [
        {"skill_name": skill.skill_name, "f1": skill.f1}
        for skill in skills
        if skill.f1 < f1_threshold
    ]
    below.sort(key=lambda item: (item["f1"], item["skill_name"]))
    return {
        # A skill without results has not passed.
        "passed": not below and not missing,
        "total_skills": len(skills) + len(missing),
        "skills_above_threshold": len(skills) - len(below),
        "skills_below_threshold": below,
        "skills_without_results": missing,
    }


def _current_surfaces(repo_root: Path, source: str) -> dict[str, dict[str, str]]:
    """What each skill's classifier prompt would show today for this source, keyed by skill name."""
    current: dict[str, dict[str, str]] = {}
    for skill_path in iter_skill_files(repo_root):
        name, description = extract_frontmatter(skill_path)
        current[name] = routing_surface(source, description, extract_metadata(skill_path))
    if not current:
        raise ValueError(f"no skills found under {repo_root}/skills; pass --repo-root")
    return current


def _stats(values: list[float]) -> dict[str, float]:
    if not values:
        return {"median": 0.0, "min": 0.0, "max": 0.0, "mean": 0.0}
    return {
        "median": statistics.median(values),
        "min": min(values),
        "max": max(values),
        "mean": statistics.fmean(values),
    }


def _compute_unweighted_stats(skills: list[SkillSummary]) -> dict[str, Any]:
    return {
        "f1": _stats([skill.f1 for skill in skills]),
        "precision": _stats([skill.precision for skill in skills]),
        "recall": _stats([skill.recall for skill in skills]),
        "reported_accuracy": _stats([skill.reported_accuracy for skill in skills]),
    }


def _argmin(skills: list[SkillSummary], key) -> SkillSummary | None:
    if not skills:
        return None
    return min(skills, key=key)


def _argmax(skills: list[SkillSummary], key) -> SkillSummary | None:
    if not skills:
        return None
    return max(skills, key=key)


def _preview(text: str, limit: int = 180) -> str:
    normalized = text.replace("\n", " ").strip()
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[: limit - 3]}..."


def _render_markdown(report: dict[str, Any], skills: list[SkillSummary]) -> str:
    lines: list[str] = []
    lines.append("# Trigger Eval Summary")
    lines.append("")
    lines.append(f"Generated at: {report['generated_at_utc']}")
    lines.append(f"Track / source: `{report['track']}` / `{report['source']}`")
    lines.append(f"Trigger threshold (per-query): `{report['threshold']}`")
    lines.append(f"F1 gate threshold: `{report['threshold_f1']}`")
    lines.append(f"Models: {', '.join(f'`{model}`' for model in report['models'])}")
    lines.append("")

    gate = report["gate"]
    threshold_pct = report["threshold_f1"] * 100
    below = gate["skills_below_threshold"]
    missing = gate["skills_without_results"]
    lines.append("## Gate")
    lines.append("")
    if gate["passed"]:
        lines.append(
            f"PASS — {gate['skills_above_threshold']}/{gate['total_skills']} skills "
            f"at or above F1 {threshold_pct:.1f}%."
        )
    else:
        lines.append(
            f"FAIL — {len(below)}/{gate['total_skills']} skills below F1 {threshold_pct:.1f}%, "
            f"{len(missing)}/{gate['total_skills']} without results."
        )
        if below:
            lines.append("")
            for item in below:
                lines.append(f"- `{item['skill_name']}` — F1 {item['f1']:.1%}")
        if missing:
            lines.append("")
            lines.append(f"No results for: {', '.join(f'`{name}`' for name in missing)}.")
    lines.append("")

    warnings: list[str] = []
    if len(report["models"]) > 1:
        warnings.append("Results come from different models, so their scores are not comparable.")
    if report["stale_descriptions"]:
        stale = ", ".join(f"`{name}`" for name in report["stale_descriptions"])
        warnings.append(f"The description or metadata the prompt shows changed after these results were produced: {stale}. Re-run them before trusting their scores.")
    if warnings:
        lines.append("## Warnings")
        lines.append("")
        lines.extend(f"- {warning}" for warning in warnings)
        lines.append("")

    f1_stats = report["stats_unweighted"]["f1"]
    f1_min_skill = _argmin(skills, key=lambda s: s.f1)
    f1_max_skill = _argmax(skills, key=lambda s: s.f1)
    lines.append("## Unweighted F1 Stats")
    lines.append("")
    lines.append(f"- Median: {f1_stats['median']:.1%}")
    lines.append(f"- Mean: {f1_stats['mean']:.1%}")
    if f1_min_skill is not None:
        lines.append(f"- Min: {f1_stats['min']:.1%} (`{f1_min_skill.skill_name}`)")
    if f1_max_skill is not None:
        lines.append(f"- Max: {f1_stats['max']:.1%} (`{f1_max_skill.skill_name}`)")
    lines.append("")
    lines.append("Each skill counts once. No case-weighted averaging across skills.")
    lines.append("")

    lines.append("## Per-Skill")
    lines.append("")
    lines.append("| Skill | Reported Pass | Precision | Recall | F1 | FN | FP |")
    lines.append("|---|---:|---:|---:|---:|---:|---:|")
    for skill in report["skills"]:
        lines.append(
            "| "
            f"{skill['skill_name']} | "
            f"{skill['reported_passed']}/{skill['total']} ({skill['reported_accuracy']:.1%}) | "
            f"{skill['precision']:.1%} | "
            f"{skill['recall']:.1%} | "
            f"{skill['f1']:.1%} | "
            f"{skill['fn']} | "
            f"{skill['fp']} |"
        )

    mixed_mode_skills = [
        skill
        for skill in report["skills"]
        if len(skill.get("query_modes", [])) > 1
    ]
    if mixed_mode_skills:
        lines.append("")
        lines.append("## Skill Mode Breakdown")
        for skill in mixed_mode_skills:
            lines.append("")
            lines.append(f"### {skill['skill_name']}")
            lines.append("")
            lines.append("| Query Mode | Total | Reported Pass | Precision | Recall | F1 |")
            lines.append("|---|---:|---:|---:|---:|---:|")
            for mode_summary in skill["query_modes"]:
                lines.append(
                    "| "
                    f"{mode_summary['query_mode']} | "
                    f"{mode_summary['total']} | "
                    f"{mode_summary['reported_passed']}/{mode_summary['total']} "
                    f"({mode_summary['reported_accuracy']:.1%}) | "
                    f"{mode_summary['precision']:.1%} | "
                    f"{mode_summary['recall']:.1%} | "
                    f"{mode_summary['f1']:.1%} |"
                )

    # One sample per query, so every rate is 0 or 1: list the misroutes in fixture order.
    for title, expected in (("False Negatives", True), ("False Positives", False)):
        misses = [
            (skill["skill_name"], query)
            for skill in report["skills"]
            for query in skill["queries"]
            if query["should_trigger"] == expected and query["threshold_predicted_trigger"] != expected
        ]
        if not misses:
            continue
        lines.append("")
        lines.append(f"## {title}")
        lines.append("")
        for skill_name, query in misses:
            mode_prefix = ""
            if query.get("query_mode", DEFAULT_QUERY_MODE) != DEFAULT_QUERY_MODE:
                mode_prefix = f"[{query['query_mode']}] "
            lines.append(f"- `{skill_name}` {mode_prefix}{_preview(query['query'])}")

    return "\n".join(lines) + "\n"


def _build_report(
    repo_root: Path,
    result_files: list[Path],
    threshold: float,
    f1_threshold: float,
    track: str,
    source: str,
) -> tuple[dict[str, Any], list[SkillSummary]]:
    skill_summaries = [
        _build_skill_summary(_load_result_file(path), path, threshold)
        for path in result_files
    ]

    skill_summaries.sort(key=lambda summary: summary.skill_name)
    current = _current_surfaces(repo_root, source)
    missing = sorted(set(current) - {summary.skill_name for summary in skill_summaries})
    stale = [
        summary.skill_name
        for summary in skill_summaries
        if summary.skill_name in current and summary.routing_surface != current[summary.skill_name]
    ]

    report = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "track": track,
        "source": source,
        "threshold": threshold,
        "threshold_f1": f1_threshold,
        "gate": _compute_gate(skill_summaries, f1_threshold, missing),
        "models": sorted({summary.model or "not recorded" for summary in skill_summaries}),
        "stale_descriptions": stale,
        "stats_unweighted": _compute_unweighted_stats(skill_summaries),
        "skills": [
            {
                **{
                    key: value
                    for key, value in asdict(skill).items()
                    if key not in {"queries", "query_modes"}
                },
                "query_modes": [asdict(query_mode) for query_mode in skill.query_modes],
                "queries": [asdict(query) for query in skill.queries],
            }
            for skill in skill_summaries
        ],
    }
    return report, skill_summaries


def _discover_files(results_dir: Path, track: str, source: str) -> list[Path]:
    files = sorted(
        path
        for path in results_dir.glob(f"*/{track}/{source}/results.json")
        if not path.relative_to(results_dir).parts[0].startswith("_")
    )
    if not files:
        raise ValueError(
            f"no result files found under {results_dir}/<skill>/{track}/{source}/results.json"
        )
    return files


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Analyze skill trigger-eval result files")
    parser.add_argument(
        "--repo-root",
        default=".",
        help="Repository root whose skills the results should cover (default: .)",
    )
    parser.add_argument(
        "--results-dir",
        default=DEFAULT_RESULTS_DIR,
        help=(
            "Trigger results root scanned as <results-dir>/<skill>/<track>/<source>/results.json; "
            f"relative to --repo-root (default: {DEFAULT_RESULTS_DIR})"
        ),
    )
    parser.add_argument(
        "--track",
        default=DEFAULT_TRACK,
        help=f"Track to analyze (default: {DEFAULT_TRACK})",
    )
    parser.add_argument(
        "--source",
        default=DEFAULT_SOURCE,
        help=f"Routing source to analyze (default: {DEFAULT_SOURCE})",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_TRIGGER_THRESHOLD,
        help=(
            "Per-query trigger threshold used to classify predictions "
            f"(default: {DEFAULT_TRIGGER_THRESHOLD})"
        ),
    )
    parser.add_argument(
        "--threshold-f1",
        type=float,
        default=DEFAULT_F1_THRESHOLD,
        help=(
            "F1 gate threshold: gate fails when any skill's F1 is below this value "
            f"(default: {DEFAULT_F1_THRESHOLD})"
        ),
    )
    parser.add_argument(
        "--output-json",
        help=(
            "Path for the machine-readable summary JSON "
            "(default: <results-dir>/_summary/<track>/<source>/summary.json)"
        ),
    )
    parser.add_argument(
        "--output-markdown",
        help=(
            "Path for the human-readable summary markdown "
            "(default: <results-dir>/_summary/<track>/<source>/summary.md)"
        ),
    )
    parser.add_argument(
        "--no-write",
        action="store_true",
        help="Print the markdown summary to stdout without writing summary files.",
    )
    parser.add_argument(
        "--fail-on-gate",
        action="store_true",
        help="Exit with status 1 when the gate fails: a skill is below the F1 floor or has no results (default: exit 0).",
    )
    return parser.parse_args()


def _default_summary_paths(results_dir: Path, track: str, source: str) -> tuple[Path, Path]:
    base = results_dir / SUMMARY_DIR_NAME / track / source
    return base / "summary.json", base / "summary.md"


def main() -> int:
    args = parse_args()
    results_dir = Path(args.results_dir)

    repo_root = Path(args.repo_root).resolve()
    if not results_dir.is_absolute():
        results_dir = repo_root / results_dir

    result_files = _discover_files(results_dir, args.track, args.source)
    report, skills = _build_report(
        repo_root,
        result_files,
        args.threshold,
        args.threshold_f1,
        args.track,
        args.source,
    )

    markdown = _render_markdown(report, skills)
    print(markdown, end="")

    if not args.no_write:
        default_json, default_md = _default_summary_paths(results_dir, args.track, args.source)
        output_json = Path(args.output_json) if args.output_json else default_json
        output_markdown = Path(args.output_markdown) if args.output_markdown else default_md

        output_json.parent.mkdir(parents=True, exist_ok=True)
        output_json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

        output_markdown.parent.mkdir(parents=True, exist_ok=True)
        output_markdown.write_text(markdown, encoding="utf-8")

    if args.fail_on_gate and not report["gate"]["passed"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
