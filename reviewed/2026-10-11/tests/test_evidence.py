"""Checks for public evidence boundaries and recorded chart transformations."""
from pathlib import Path
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class EvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.claims = {c["id"]: c for c in json.loads((ROOT / "evidence/claims.json").read_text())["claims"]}
        cls.tables = [json.loads(p.read_text()) for p in sorted((ROOT / "evidence/tables").glob("*.json"))]

    def test_featured_coverage(self):
        cases = {"atlas-ssf", "momentum-v2", "swing-autopsy", "trend-quality", "delivery-insider", "price-bridge"}
        self.assertEqual({t["case_id"] for t in self.tables}, cases)
        for case in cases:
            self.assertGreaterEqual(sum(t["case_id"] == case for t in self.tables), 2)
            self.assertTrue((ROOT / f"content/cases/{case}.md").is_file())

    def test_every_table_attribute_has_exact_claim(self):
        for table in self.tables:
            for row in table["rows"]:
                claim = self.claims[row["claim_id"]]
                self.assertEqual(row["value"], claim["value"])
                for field, identifier in row.get("additional_claim_ids", {}).items():
                    self.assertEqual(row[field], self.claims[identifier]["value"])
                    self.assertEqual(type(row[field]), type(self.claims[identifier]["value"]))

    def test_corrected_ssf_economics_and_controlling_verdict(self):
        table = next(t for t in self.tables if t["id"] == "ssf-economics")
        self.assertEqual(table["status"], "stand_down")
        rows = {r["label"]: r["value"] for r in table["rows"]}
        self.assertAlmostEqual(rows["Gross excess"], 6.8536805696552765)
        self.assertAlmostEqual(rows["Net 1× impact"], -0.7432423049758089)
        self.assertAlmostEqual(rows["Net 2× impact"], -6.593613998531564)
        self.assertEqual(table["study_context"]["sample"], 20217)
        self.assertTrue(any("v1_0_1" in s for s in table["source_paths"]))

    def test_partial_fold_is_not_a_complete_fold(self):
        table = next(t for t in self.tables if t["id"] == "trend-folds")
        selected = [r for r in table["rows"] if "V5_S0_Q67_DIVERSIFIED" in r["label"]]
        self.assertEqual(sum(r["complete"] for r in selected), 4)
        partial = [r for r in selected if not r["complete"]]
        self.assertEqual(len(partial), 1)
        self.assertIn("PARTIAL, excluded", partial[0]["label"])
        self.assertEqual(sum(r["conjunctive_fold_pass"] for r in selected if r["complete"]), 2)

    def test_bridge_technical_and_rights_outcomes_are_separate(self):
        table = next(t for t in self.tables if t["id"] == "bridge-certification")
        self.assertEqual([r["source_boolean"] for r in table["rows"]], [True, False])
        self.assertEqual([r["value"] for r in table["rows"]], [1, 0])

    def test_explorer_uses_exact_tables_and_local_assets(self):
        text = (ROOT / "charts/explorer.html").read_text()
        match = re.search(r"const tables=(.*?);const choice=", text, re.S)
        self.assertIsNotNone(match)
        self.assertEqual(json.loads(match.group(1)), self.tables)
        self.assertNotIn("fetch(", text)
        self.assertIn("scope='row'", text)
        self.assertIn("aria-label", text)
        for table in self.tables:
            for extension in ["svg", "png"]:
                self.assertTrue((ROOT / f"charts/generated/{table['id']}.{extension}").is_file())


if __name__ == "__main__": unittest.main()
