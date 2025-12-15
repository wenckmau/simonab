# Quiz Java – stil „școala auto” (offline)

## Cum rulezi
Browser-ele blochează `fetch()` dacă deschizi direct fișierul `index.html` (file://).
Rulează un mic server local în folderul proiectului:

### Varianta Python (cea mai simplă)
1. Instalează Python (dacă nu ai).
2. În folderul aplicației:
   - Windows (PowerShell):
     `python -m http.server 8000`
   - macOS/Linux:
     `python3 -m http.server 8000`
3. Deschide în browser:
   `http://localhost:8000`

## Fișiere
- `index.html` – UI
- `style.css` – stil
- `app.js` – logică quiz + repetare adaptivă (localStorage)
- `questions.json` – banca de întrebări

## Tipuri de întrebări suportate
- `mcq` – alegere multiplă (answer = index 0..n-1)
- `tf` – adevărat/fals (answer = true/false)
- `fill` – completare (answer_text = text exact, fără spații la capete)

## Notă despre surse
Câmpul `source` păstrează un ID intern (ex: turn0file1) ca să știă din ce curs/capitol a fost generată întrebarea.
