#!/usr/bin/env python3
"""Generate catalogue metadata and navigation without changing editorial cards.

Run after build_memes.py, which may replace the memes card. Dates are editorial
inputs in data/projects.json, never inferred from the system clock or file times.
"""
from __future__ import annotations

import argparse
from datetime import date
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
TYPES = {
    "guia": "Guía", "juego": "Juego", "monografico": "Monográfico",
    "archivo": "Archivo", "prototipo": "Prototipo",
    "herramienta": "Herramienta", "aplicacion": "Aplicación",
}
AUDIENCES = {
    "docencia": "Docencia", "administracion": "Administración",
    "comunicacion": "Comunicación", "consultoria": "Consultoría",
}
MONTHS = ("", "enero", "febrero", "marzo", "abril", "mayo", "junio",
          "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}


class Tree(HTMLParser):
    """Minimal element tree retaining source offsets for surgical replacements."""

    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.line_offsets = [0]
        self.line_offsets.extend(m.end() for m in re.finditer("\n", source))
        self.nodes = []
        self.stack = []
        self.feed(source)
        self.close()

    def source_offset(self):
        line, column = self.getpos()
        return self.line_offsets[line - 1] + column

    def handle_starttag(self, tag, attrs):
        start = self.source_offset()
        node = {"tag": tag, "attrs": dict(attrs), "start": start,
                "open_end": start + len(self.get_starttag_text()),
                "parent": self.stack[-1] if self.stack else None,
                "text": []}
        self.nodes.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            node = self.stack.pop()
            node["close_start"] = node["open_end"]
            node["end"] = node["open_end"]

    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1]["tag"] != tag:
            raise ValueError(f"HTML no equilibrado: cierre {tag}")
        node = self.stack.pop()
        node["close_start"] = self.source_offset()
        node["end"] = self.source.index(">", self.source_offset()) + 1

    def handle_data(self, data):
        for node in self.stack:
            node["text"].append(data)


def has_class(node, name):
    return name in node["attrs"].get("class", "").split()


def descendant(node, ancestor):
    current = node["parent"]
    while current is not None:
        if current is ancestor:
            return True
        current = current["parent"]
    return False


def required_text(value, field):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"Texto obligatorio: {field}")


def date_label(value):
    parsed = date.fromisoformat(value)
    return f"{parsed.day} de {MONTHS[parsed.month]} de {parsed.year}"


def time_tag(value):
    return f'<time datetime="{escape(value, quote=True)}">{date_label(value)}</time>'


def validate(data, launches, source):
    tree = Tree(source)
    cards = [n for n in tree.nodes if n["tag"] == "article" and has_class(n, "project-card")]
    projects = data["projects"]
    ids = [p["id"] for p in projects]
    if len(ids) != len(set(ids)) or not ids:
        raise ValueError("Los identificadores del catálogo deben ser únicos y no estar vacíos")
    if any(not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", item) for item in ids):
        raise ValueError("Identificador de proyecto no válido")
    if ids != [c["attrs"].get("id") for c in cards]:
        raise ValueError("Los proyectos y su orden no coinciden con las fichas HTML")
    if set(ids) != set(launches["projects"]):
        raise ValueError("Los identificadores no coinciden con project-launches.json")
    for project, card in zip(projects, cards):
        titles = [n for n in tree.nodes if n["tag"] == "h3" and descendant(n, card)]
        if len(titles) != 1 or " ".join("".join(titles[0]["text"]).split()) != project["title"]:
            raise ValueError(f"Título distinto del HTML: {project['id']}")
        if project["type"] not in TYPES:
            raise ValueError(f"Tipo desconocido: {project['id']}")
        audiences = project["audiences"]
        if not audiences or len(audiences) != len(set(audiences)) or not set(audiences) <= AUDIENCES.keys():
            raise ValueError(f"Públicos no válidos: {project['id']}")
        usage = project["usage"]
        for key in ("objective", "duration"):
            required_text(usage[key], f"{project['id']}.usage.{key}")
        if len(usage["questions"]) != 2:
            raise ValueError(f"Se requieren dos preguntas: {project['id']}")
        for question in usage["questions"]:
            required_text(question, "pregunta didáctica")
    routes = data["routes"]
    route_ids = [route["id"] for route in routes]
    if route_ids != ["entender", "decidir", "construir"]:
        raise ValueError("Se requieren los recorridos entender, decidir y construir, en ese orden")
    for route in routes:
        required_text(route["label"], "route.label")
        required_text(route["description"], "route.description")
        refs = route["projects"]
        if not refs or len(refs) != len(set(refs)) or not set(refs) <= set(ids):
            raise ValueError(f"Proyectos de recorrido no válidos: {route['id']}")
    date_label(data["review"]["date"])
    required_text(data["review"]["scope"], "review.scope")
    previous_review = data["review"]["previous"]
    date_label(previous_review["date"])
    required_text(previous_review["scope"], "review.previous.scope")
    if not isinstance(previous_review["count"], int) or previous_review["count"] < 1:
        raise ValueError("La revisión histórica requiere un número de fichas positivo")
    previous = None
    for entry in data["changelog"]:
        date_label(entry["date"])
        required_text(entry["text"], "changelog.text")
        if previous is not None and entry["date"] > previous:
            raise ValueError("Las novedades deben estar ordenadas de más reciente a más antigua")
        previous = entry["date"]
        if "project" in entry and entry["project"] not in ids:
            raise ValueError("Proyecto desconocido en novedades")
    return tree, cards


def review_html(data):
    review = data["review"]
    return (f'<p class="review-date">El catálogo reúne {len(data["projects"])} proyectos. '
            f'Revisión de {escape(review["scope"])}: {time_tag(review["date"])}.</p>')


def explorer_html(data):
    titles = {p["id"]: p["title"] for p in data["projects"]}
    lines = ['<div class="catalog-explorer">', '<div class="start-routes">',
             '<h3>Empieza aquí</h3>', '<div class="route-grid">']
    for route in data["routes"]:
        lines.extend(['<article class="route-card">', f'<h4>{escape(route["label"])}</h4>',
                      f'<p>{escape(route["description"])}</p>', '<ul>'])
        for project_id in route["projects"]:
            lines.append(f'<li><a href="#{project_id}">{escape(titles[project_id])}</a></li>')
        lines.extend(['</ul>', '</article>'])
    lines.extend(['</div>', '</div>', '<form class="catalog-filters" id="catalog-filters" hidden>'])
    for key, label, options in (("type", "Tipo de proyecto", TYPES), ("audience", "Público", AUDIENCES)):
        lines.extend(['<div>', f'<label for="filter-{key}">{label}</label>',
                      f'<select id="filter-{key}" name="{key}">', '<option value="">Todos</option>'])
        for value, name in options.items():
            lines.append(f'<option value="{value}">{escape(name)}</option>')
        lines.extend(['</select>', '</div>'])
    lines.extend(['<button type="reset">Mostrar todos</button>', '</form>',
                  f'<p id="catalog-status" role="status" aria-live="polite" aria-atomic="true">{len(titles)} proyectos</p>',
                  '<nav class="catalog-index" aria-label="Índice de proyectos"><ul>'])
    for project in data["projects"]:
        lines.append(f'<li data-project-link="{project["id"]}"><a href="#{project["id"]}">{escape(project["title"])}</a></li>')
    lines.extend(['</ul></nav>', '<p id="catalog-empty" hidden>No hay proyectos con esta combinación. Prueba otro tipo o público.</p>', '</div>'])
    return "\n".join(lines)


def changelog_html(data):
    lines = ['<details class="changelog"><summary>Actualizaciones del laboratorio</summary>']
    lines.extend(f'<p>{time_tag(entry["date"])}: {escape(entry["text"])}</p>' for entry in data["changelog"])
    previous = data["review"]["previous"]
    lines.append(f'<p>La revisión de {escape(previous["scope"])} del {time_tag(previous["date"])} '
                 f'abarcó los {previous["count"]} proyectos existentes entonces. '
                 'Las revisiones posteriores indican su alcance junto a la fecha.</p>')
    lines.append('</details>')
    return "\n".join(lines)


def usage_html(project):
    usage = project["usage"]
    lines = ['<!-- catalog:usage:start -->', '<details class="project-details project-usage">',
             '<summary>Usar en clase o en tu institución</summary>',
             f'<p>Propuesta didáctica para adaptar al grupo. Duración orientativa: {escape(usage["duration"])}.</p>',
             f'<p><strong>Objetivo:</strong> {escape(usage["objective"])}</p>', '<ul>']
    lines.extend(f'<li>{escape(question)}</li>' for question in usage["questions"])
    lines.extend(['</ul>', '</details>', '<!-- catalog:usage:end -->'])
    return "\n".join(lines)


def replace_block(source, name, content):
    start, end = f'<!-- catalog:{name}:start -->', f'<!-- catalog:{name}:end -->'
    if source.count(start) != 1 or source.count(end) != 1:
        raise ValueError(f"Se requiere exactamente un par de marcadores catalog:{name}")
    first, last = source.index(start), source.index(end)
    if first >= last:
        raise ValueError(f"Marcadores invertidos: catalog:{name}")
    return source[:first + len(start)] + "\n" + content + "\n" + source[last:]


def render_home(data, launches, source):
    tree, cards = validate(data, launches, source)
    edits = []
    for project, card in zip(data["projects"], cards):
        opening = source[card["start"]:card["open_end"]]
        opening = re.sub(r'\s+data-(?:type|audiences)\s*=\s*(?:"[^"]*"|\x27[^\x27]*\x27|[^\s>]+)', '', opening)
        opening = opening[:-1] + f' data-type="{project["type"]}" data-audiences="{" ".join(project["audiences"])}">'
        edits.append((card["start"], card["open_end"], opening))
        copies = [n for n in tree.nodes if has_class(n, "project-copy") and descendant(n, card)]
        if len(copies) != 1:
            raise ValueError(f"Se requiere una project-copy: {project['id']}")
        copy = copies[0]
        interior = source[copy["open_end"]:copy["close_start"]]
        start, end = '<!-- catalog:usage:start -->', '<!-- catalog:usage:end -->'
        if start in interior or end in interior:
            if interior.count(start) != 1 or interior.count(end) != 1 or interior.index(start) >= interior.index(end):
                raise ValueError(f"Marcadores de uso no válidos: {project['id']}")
            left = copy["open_end"] + interior.index(start)
            right = copy["open_end"] + interior.index(end) + len(end)
            edits.append((left, right, usage_html(project)))
        else:
            # Insert before the closing tag's indentation, otherwise that
            # indentation becomes a whitespace-only line ahead of the new block.
            content_end = len(interior.rstrip())
            closing_space = interior[content_end:]
            if "\n" not in closing_space:
                closing_space = "\n" + closing_space
            edits.append((copy["open_end"] + content_end, copy["close_start"],
                          "\n" + usage_html(project) + closing_space))
    for start, end, content in sorted(edits, reverse=True):
        source = source[:start] + content + source[end:]
    for name, render in (("review", review_html), ("explorer", explorer_html), ("changelog", changelog_html)):
        source = replace_block(source, name, render(data))
    return source


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Falla si la portada necesita regenerarse; no escribe archivos")
    args = parser.parse_args(argv)
    try:
        data = json.loads((ROOT / "data/projects.json").read_text(encoding="utf-8"))
        launches = json.loads((ROOT / "data/project-launches.json").read_text(encoding="utf-8"))
        path = ROOT / "docs/index.html"
        source = path.read_text(encoding="utf-8")
        result = render_home(data, launches, source)
        if args.check:
            if result != source:
                print("Catálogo desfasado: ejecuta python scripts/build_home.py", file=sys.stderr)
                return 1
            print("Catálogo al día: datos, fichas y navegación coherentes.")
        elif result != source:
            path.write_text(result, encoding="utf-8", newline="\n")
            print("Portada actualizada desde data/projects.json.")
        else:
            print("Portada sin cambios.")
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"Error de catálogo: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
