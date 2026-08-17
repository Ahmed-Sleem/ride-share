# Investor Information Document — LaTeX source

## Files
- `main.tex` — root file, inputs the four body files
- `preamble.tex` — document class, fonts, colours, table and panel styles
- `body_front.tex` — title page, contents, Chapter 1 (Summary)
- `body_mid.tex` — Chapters 2–4 (problem & market, how it works, revenue)
- `body_back.tex` — Chapters 5–8 (technology, safety, what is not known, route to launch)
- `body_appendix.tex` — Appendices A–C (decisions, sources, supporting documents)

## Build
```
pdflatex main.tex && pdflatex main.tex     # twice, for the contents page
```
Requires: TeX Live with KOMA-Script, TeX Gyre fonts, booktabs, tabularx, longtable,
tcolorbox, enumitem, microtype, hyperref.

## Editing
- Colours are defined once at the top of `preamble.tex`.
- `\begin{keybox}` is the grey panel; `\begin{notebox}` is the amber-ruled caution panel.
- Tables use `\thead{}` for headers and `L{width}` columns. Text block is 154 mm wide —
  keep the sum of column widths at or below ~149 mm.
