"""Render archived evidence tables. No market data, optimization, or inference.

Python 3.12; install the exact optional rendering dependency from requirements-charts.txt.
"""
from pathlib import Path
import hashlib
import html
import json
import os
import textwrap

os.environ.setdefault("MPLCONFIGDIR", str(Path(os.environ.get("TMPDIR", "/tmp")) / "ardor-lite-matplotlib"))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    tables = []
    plt.rcParams.update({"font.family": "DejaVu Sans", "svg.hashsalt": "ardor-lite-20261011", "font.size": 10})
    for path in sorted((ROOT / "evidence/tables").glob("*.json")):
        table = json.loads(path.read_text())
        if "rows" not in table:
            continue
        rows = table["rows"]
        numeric = [r for r in rows if isinstance(r.get("value"), (int, float)) and not isinstance(r.get("value"), bool)]
        if not numeric:
            continue
        chart_id = table["id"]
        labels = [textwrap.fill(str(r["label"]), 36) for r in numeric]
        values = [r["value"] for r in numeric]
        fig, ax = plt.subplots(figsize=(10, max(5, len(numeric) * 0.46 + 2.3)))
        ax.barh(range(len(values)), values, color=["#276768" if x >= 0 else "#9b4141" for x in values])
        ax.set_yticks(range(len(labels)), labels)
        ax.invert_yaxis()
        ax.axvline(0, color="#727b83", linewidth=0.7)
        ax.set_xlabel(str(table["units"]))
        ax.set_title(textwrap.fill(table["title"], 80), loc="left", pad=18, fontweight="bold")
        ax.spines[["top", "right", "left"]].set_visible(False)
        lo, hi = min([0] + values), max([0] + values)
        span = hi - lo or 1
        ax.set_xlim(lo - span * 0.15, hi + span * 0.25)
        for i, value in enumerate(values):
            label = f"{value:,.4f}".rstrip("0").rstrip(".") if value != int(value) else f"{int(value):,}"
            ax.text(value + span * (0.015 if value >= 0 else -0.015), i, label, va="center", ha="left" if value >= 0 else "right", fontsize=9)
        note = "Archived evidence | " + str(table["status"]) + " | " + chart_id
        caveats = table.get("caveats", [])
        if isinstance(caveats, str): caveats = [caveats]
        if caveats: note += "\n" + textwrap.fill(str(caveats[0]), 115)
        fig.text(0.03, 0.02, note, fontsize=8, color="#424b53", va="bottom")
        fig.tight_layout(rect=(0, 0.13, 1, 1))
        out = ROOT / "charts/generated"
        out.mkdir(parents=True, exist_ok=True)
        fig.savefig(out / f"{chart_id}.svg", metadata={"Date": None, "Creator": "Ardor lite evidence renderer"})
        fig.savefig(out / f"{chart_id}.png", dpi=160, metadata={"Software": "Ardor lite evidence renderer"})
        plt.close(fig)
        readable = [f"# {table['title']}", "", f"Units: {table['units']}. Outcome: `{table['status']}`. Values are archived analytical summaries.", ""]
        columns = list(dict.fromkeys(k for row in rows for k in row))
        readable += ["| " + " | ".join(columns) + " |", "| " + " | ".join("---" for _ in columns) + " |"]
        for row in rows:
            readable.append("| " + " | ".join("unavailable" if row.get(k) is None else str(row[k]).replace("|", "\\|").replace("\n", " ") for k in columns) + " |")
        readable += ["", "Extraction: " + str(table.get("extraction_rule", "")), "", "Caveats:", ""] + ["- " + str(c) for c in caveats]
        (ROOT / f"evidence/tables/{chart_id}.md").write_text("\n".join(readable) + "\n")
        spec = dict(table)
        spec.update({"chart_id": chart_id, "input_table": str(path.relative_to(ROOT)), "input_sha256": sha(path), "display_rounding": "At most four decimals; integer counts unchanged", "missing_values": "null stays unavailable; never plotted as zero", "transformation": "One bar per recorded numeric value; no interpolation, resampling, inference or optimization", "outputs": [{"path": f"charts/generated/{chart_id}.{ext}", "sha256": sha(out / f"{chart_id}.{ext}")} for ext in ("svg", "png")], "accessible_table": f"evidence/tables/{chart_id}.md"})
        (ROOT / f"charts/specs/{chart_id}.json").write_text(json.dumps(spec, indent=2, allow_nan=False) + "\n")
        tables.append(table)
    data = json.dumps(tables, allow_nan=False).replace("<", "\\u003c")
    viewer = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ardor lite archived chart explorer</title>
<style>body{font:17px/1.6 system-ui;color:#243b43;max-width:1000px;margin:40px auto;padding:0 20px;background:#fcfcf9}select,button{font:inherit;padding:8px}svg{width:100%;height:auto}table{border-collapse:collapse;width:100%}th,td{text-align:left;border-bottom:1px solid #ccd4d2;padding:8px}nav{display:flex;gap:14px;flex-wrap:wrap}.note{font-size:14px}#plot{overflow:auto}a{color:#276768}</style>
<h1>Archived chart explorer</h1><p>Reviewed saved analytical summaries. These charts do not establish a certified strategy. Source data, return paths and trading records are excluded.</p>
<label for="choice">Figure </label><select id="choice"></select> <button id="sort" type="button">Sort recorded values</button><h2 id="title"></h2><p id="status"></p><div id="plot"></div><nav id="downloads"></nav><p id="rule" class="note"></p><ul id="caveats" class="note"></ul><table><caption id="caption"></caption><thead><tr><th scope="col">Recorded category</th><th scope="col">Value</th><th scope="col">Metadata</th></tr></thead><tbody id="rows"></tbody></table>
<script>const tables=DATA;const choice=document.getElementById('choice');let sorted=false;
function txt(tag,text){const x=document.createElement(tag);x.textContent=text;return x}
tables.forEach((t,i)=>{const o=txt('option',t.case_id+' — '+t.title);o.value=i;choice.append(o)});
function draw(){const t=tables[Number(choice.value)];const rows=t.rows.slice();if(sorted)rows.sort((a,b)=>(b.value??-Infinity)-(a.value??-Infinity));document.getElementById('title').textContent=t.title;document.getElementById('status').textContent='Outcome: '+t.status+' · Units: '+t.units;document.getElementById('rule').textContent='Extraction: '+t.extraction_rule;document.getElementById('caption').textContent=t.title+' ('+t.units+')';document.getElementById('rows').replaceChildren(...rows.map(r=>{const tr=document.createElement('tr');tr.append(txt('th',r.label),txt('td',r.value===null?'unavailable':r.value),txt('td',Object.entries(r).filter(([k])=>!['label','value'].includes(k)).map(([k,v])=>k+': '+v).join('; ')));tr.firstChild.scope='row';return tr}));let cs=t.caveats||[];if(typeof cs==='string')cs=[cs];document.getElementById('caveats').replaceChildren(...cs.map(c=>txt('li',c)));const downloads=document.getElementById('downloads');downloads.replaceChildren();[['SVG','generated/'+t.id+'.svg'],['PNG','generated/'+t.id+'.png'],['Data table','../evidence/tables/'+t.id+'.json']].forEach(([label,url])=>{const a=txt('a',label);a.href=url;downloads.append(a)});const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1000 '+(rows.length*42+60));svg.setAttribute('role','img');svg.setAttribute('aria-label',t.title+'; full values in the table below');const nums=rows.filter(r=>typeof r.value==='number').map(r=>r.value);const lo=Math.min(0,...nums),hi=Math.max(0,...nums),span=hi-lo||1;const x=v=>420+(v-lo)/span*450;rows.forEach((r,i)=>{let text=document.createElementNS(ns,'text');text.setAttribute('x',0);text.setAttribute('y',i*42+28);text.setAttribute('font-size',14);text.textContent=r.label;svg.append(text);if(typeof r.value==='number'){let bar=document.createElementNS(ns,'rect');bar.setAttribute('x',Math.min(x(0),x(r.value)));bar.setAttribute('y',i*42+10);bar.setAttribute('width',Math.abs(x(r.value)-x(0)));bar.setAttribute('height',25);bar.setAttribute('fill',r.value>=0?'#276768':'#9b4141');svg.append(bar);let val=document.createElementNS(ns,'text');val.setAttribute('x',900);val.setAttribute('y',i*42+28);val.setAttribute('font-size',14);val.textContent=r.value;svg.append(val)}});document.getElementById('plot').replaceChildren(svg)}choice.addEventListener('change',()=>{sorted=false;draw()});document.getElementById('sort').addEventListener('click',()=>{sorted=!sorted;draw()});draw();</script></html>'''
    (ROOT / "charts/explorer.html").write_text(viewer.replace("DATA", data))
    print(f"Rendered {len(tables)} figures, accessible tables and an offline explorer")


if __name__ == "__main__": main()
