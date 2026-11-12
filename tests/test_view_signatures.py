"""HA 2026 passes URL match_info as kwargs into view handlers.

Every ``{param}`` in a view url MUST appear as a parameter of its
``get``/``post`` handler, otherwise aiohttp dispatch raises
``TypeError: ... got an unexpected keyword argument``.
This static test catches that class of bug without a running instance.
"""

import ast
import inspect
import pathlib
import re

import pytest

API_FILE = pathlib.Path(__file__).resolve().parents[1] / "custom_components" / "mqtt_compass" / "api.py"


def _view_nodes():
    tree = ast.parse(API_FILE.read_text(encoding="utf-8"))
    for node in tree.body:
        if (
            isinstance(node, ast.ClassDef)
            and any(isinstance(b, ast.ClassDef) for b in ())  # marker
        ):
            pass
        if isinstance(node, ast.ClassDef):
            bases = [getattr(b, "id", getattr(b, "attr", "")) for b in node.bases]
            if "HomeAssistantView" in bases:
                yield node


def _url_of(node):
    for stmt in node.body:
        if isinstance(stmt, ast.Assign) and any(
            isinstance(t, ast.Name) and t.id == "url" for t in stmt.targets
        ):
            # url is an f-string like f"{API_PREFIX}/brokers/{{broker_id}}/tree"
            if isinstance(stmt.value, ast.JoinedStr):
                parts = []
                for v in stmt.value.values:
                    if isinstance(v, ast.Constant):
                        parts.append(str(v.value))
                    else:
                        parts.append("")  # {API_PREFIX} -> irrelevant placeholder
                return "".join(parts)
            if isinstance(stmt.value, ast.Constant):
                return str(stmt.value)
    return None


@pytest.mark.parametrize("node", list(_view_nodes()), ids=lambda n: n.name)
def test_url_params_present_in_handler_signature(node):
    url = _url_of(node)
    if url is None:
        pytest.skip("no url attribute")
    params = set(re.findall(r"\{(\w+)\}", url))
    if not params:
        pytest.skip("url has no parameters")
    for method_name in ("get", "post", "delete", "put"):
        fn = next(
            (
                s
                for s in node.body
                if isinstance(s, (ast.FunctionDef, ast.AsyncFunctionDef))
                and s.name == method_name
            ),
            None,
        )
        if fn is None:
            continue
        argnames = {a.arg for a in fn.args.args} | {a.arg for a in fn.args.kwonlyargs}
        missing = params - argnames
        assert not missing, (
            f"{node.name}.{method_name}() is missing required kwargs for url "
            f"params {missing}; HA passes match_info as keyword arguments"
        )
