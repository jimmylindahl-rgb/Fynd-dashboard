# Fynd-dashboard

Publik, statisk dashboard för fyndbevakning inom smarta hem och homelab.

## GitHub Pages

Sidan är avsedd att publiceras från:

- Branch: `main`
- Folder: `/ (root)`

## Integritet

Allt i detta repository ska betraktas som offentligt. Lägg inte in lösenord, tokens, API-nycklar, interna nätverksuppgifter eller annan känslig information här.

Sidan innehåller `noindex,nofollow` och en `robots.txt` som avråder sökmotorer från indexering. Det minskar upptäckbarheten men gör inte sidan privat.

## Filer

- `index.html` – dashboard
- `styles.css` – layout och design
- `app.js` – rendering, filtrering och sortering
- `deals.js` – fynddata
- `robots.txt` – avråder crawling
- `.nojekyll` – gör Pages-publiceringen enkel

`deals.js` är den fil som fyndbevakningen normalt behöver uppdatera.
