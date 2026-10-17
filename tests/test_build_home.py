"""Regression checks for the catalogue builder; all HTML changes stay in memory."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("build_home", ROOT / "scripts/build_home.py")
build_home = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(build_home)


def without_generated_content(source):
    """Retain all editorial markup, including actions, text and link attributes."""
    for name in ("review", "explorer", "changelog", "usage"):
        source = re.sub(
            rf"<!-- catalog:{name}:start -->.*?<!-- catalog:{name}:end -->",
            "", source, flags=re.S,
        )
    source = re.sub(r' data-(?:type|audiences)="[^"]*"', "", source)
    # The builder adds line breaks around inserted fragments, not editorial text.
    return re.sub(r">\s+<", "><", source)


class BuildHomeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "docs/index.html").read_text(encoding="utf-8")
        cls.catalogue = json.loads((ROOT / "data/projects.json").read_text(encoding="utf-8"))
        cls.launches = json.loads((ROOT / "data/project-launches.json").read_text(encoding="utf-8"))

    def setUp(self):
        self.data = deepcopy(self.catalogue)

    def render(self, source=None, launches=None):
        return build_home.render_home(
            self.data,
            self.launches if launches is None else launches,
            self.source if source is None else source,
        )

    def test_regeneration_is_idempotent_after_data_change(self):
        self.data["projects"][0]["usage"]["objective"] = "Objetivo actualizado para esta prueba."
        result = self.render()
        self.assertIn("Objetivo actualizado para esta prueba.", result)
        self.assertEqual(result, self.render(result))
        self.assertEqual(result.count('class="project-details project-usage"'), len(self.data["projects"]))

    def test_memes_card_restores_metadata_after_upstream_replacement(self):
        # build_memes emits an inline project-copy without catalogue annotations.
        # Use an independently authored fixture to avoid deriving it via the builder.
        replacement = '''<article id="archivo-memes" class="project-card" aria-labelledby="memes-title">
<figure class="project-media"><img src="memes/assets/159-01-thumb.webp" alt="Imagen conservada" width="1402" height="1122" loading="lazy"></figure>
<div class="project-copy"><p class="project-type">Mirar la IA con humor</p><h3 id="memes-title">Los memes de estrategIA</h3><p>Contenido editorial regenerado que debe conservarse.</p><div class="project-meta"><span>Archivo visual</span></div><p class="project-launch">Lanzamiento · <time datetime="2026-10">octubre de 2026</time></p></div>
<div class="project-actions"><a class="text-link" href="memes/">Explorar los memes</a><a href="memes/#sobre-el-archivo">Sobre el archivo</a></div>
</article>'''
        source, count = re.subn(r'<article id="archivo-memes"[^>]*>.*?</article>', replacement, self.source, count=1, flags=re.S)
        self.assertEqual(count, 1)
        result = self.render(source)
        card = re.search(r'<article id="archivo-memes"[^>]*>.*?</article>', result, re.S).group()
        self.assertIn('data-type="archivo"', card)
        self.assertIn('data-audiences="docencia comunicacion"', card)
        self.assertEqual(card.count('class="project-details project-usage"'), 1)
        self.assertIn("Contenido editorial regenerado que debe conservarse.", card)
        self.assertEqual(without_generated_content(source), without_generated_content(result))
        self.assertEqual(result, self.render(result))

    def test_updates_preserve_all_editorial_content_outside_owned_blocks(self):
        self.data["routes"][0]["description"] = "Descripción distinta para comprobar la actualización."
        self.data["projects"][0]["usage"]["objective"] = "Texto <literal> & comprobable."
        self.data["projects"][0]["audiences"] = ["docencia"]
        result = self.render()
        self.assertIn("Texto &lt;literal&gt; &amp; comprobable.", result)
        self.assertEqual(without_generated_content(self.source), without_generated_content(result))
        actions = r'<div class="project-actions"[^>]*>.*?</div>'
        self.assertEqual(re.findall(actions, self.source, re.S), re.findall(actions, result, re.S))

    def test_first_usage_insertion_preserves_closing_indent_without_trailing_space(self):
        fixture = '''<article id="archivo-memes" class="project-card" aria-labelledby="memes-title">
            <div class="project-copy">
              <h3 id="memes-title">Los memes de estrategIA</h3>
              <p>Texto editorial sin cambios.</p>
            </div>
            <div class="project-actions"><a href="memes/">Explorar</a></div>
          </article>'''
        source, count = re.subn(r'<article id="archivo-memes"[^>]*>.*?</article>', fixture, self.source, count=1, flags=re.S)
        self.assertEqual(count, 1)
        result = self.render(source)
        card = re.search(r'<article id="archivo-memes"[^>]*>.*?</article>', result, re.S).group()
        self.assertNotRegex(card, r"(?m)[ \t]+$")
        self.assertIn('<!-- catalog:usage:end -->\n            </div>', card)
        self.assertEqual(without_generated_content(source), without_generated_content(result))
        self.assertEqual(result, self.render(result))

    def test_rejects_inconsistent_identifiers_and_title(self):
        invalid_cases = (
            ("duplicate ID", lambda d: d["projects"][1].update(id=d["projects"][0]["id"])),
            ("unknown ID", lambda d: d["projects"][0].update(id="proyecto-inexistente")),
            ("invalid ID syntax", lambda d: d["projects"][0].update(id="ID con espacios")),
            ("changed title", lambda d: d["projects"][0].update(title="Título que no aparece en HTML")),
            ("unknown route project", lambda d: d["routes"][0]["projects"].append("inexistente")),
        )
        for label, mutate in invalid_cases:
            with self.subTest(label=label):
                self.data = deepcopy(self.catalogue)
                mutate(self.data)
                with self.assertRaises(ValueError):
                    self.render()

    def test_rejects_invalid_taxonomy(self):
        cases = (
            {"type": "tipo-inventado"},
            {"audiences": ["publico-inventado"]},
            {"audiences": []},
            {"audiences": ["docencia", "docencia"]},
        )
        for change in cases:
            with self.subTest(change=change):
                self.data = deepcopy(self.catalogue)
                self.data["projects"][0].update(change)
                with self.assertRaises(ValueError):
                    self.render()

    def test_rejects_missing_launch_and_missing_block_marker(self):
        launches = deepcopy(self.launches)
        del launches["projects"]["archivo-memes"]
        with self.assertRaises(ValueError):
            self.render(launches=launches)
        source = self.source.replace("<!-- catalog:explorer:end -->", "")
        with self.assertRaises(ValueError):
            self.render(source)


if __name__ == "__main__":
    unittest.main()
