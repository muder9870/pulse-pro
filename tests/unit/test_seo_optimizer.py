from __future__ import annotations

import json
import unittest

from backend.generators.seo_optimizer import optimize_markdown


class SeoOptimizerTests(unittest.TestCase):
    def test_meta_description_max_len(self) -> None:
        md = "# Title\n\nThis is a long paragraph " + ("word " * 200) + "\n\n## Section\nText\n"
        res = optimize_markdown(title="Title", md=md, base_slug="title")
        self.assertTrue(len(res.meta_description) <= 160)

    def test_heading_normalization_single_h1(self) -> None:
        md = "# Title\n\n## A\nText\n\n# Another H1\nMore\n"
        res = optimize_markdown(title="Title", md=md, base_slug="title")
        h1_count = sum(1 for line in res.markdown.splitlines() if line.startswith("# "))
        self.assertEqual(h1_count, 1)
        self.assertIn("## Another H1", res.markdown)

    def test_platform_slugs_json(self) -> None:
        res = optimize_markdown(title="Title", md="# Title\n\nText\n", base_slug="Title")
        data = json.loads(res.platform_slugs_json)
        self.assertIn("wordpress", data)
        self.assertTrue(data["wordpress"])


if __name__ == "__main__":
    unittest.main()

