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

## Automatiska kodkontroller

Kör `npm test` med Node.js 22 eller senare. Inga npm-paket behöver installeras.
Workflow `.github/workflows/checks.yml` kör samma kontroller vid push, pull request
eller manuell start. Inget schema och ingen fyndbevakning ändras.

Kontrollerna omfattar syntax i alla JS/CJS/MJS-filer, inläsning av
`window.DEALS_DATA`, metadata, obligatoriska produktfält, unika ID:n,
verkliga datum, numeriska priser/rabatter, kategorier/status och URL-format.
Aktiva fynd måste ha absolut HTTP(S)-produktlänk utan inloggningsuppgifter.
Historik får ha tom produktlänk; bilder får vara tomma. Den befintliga
`homelab-placeholder` får ha null-priser och sakna detaljtexter men måste vara
historisk och tillhöra homelab. Dessa undantag bevarar befintliga poster.
Nya kategorier eller ett ändrat datakontrakt kräver motsvarande teständring.

Testerna inkluderar avsiktligt felaktiga exempel och ett citatteckenfel i
`lastCheckNote`. Appens rendering, kategorier, sökning, fyra sorteringslägen,
femminutersuppdatering och bibehållna data vid hämtningsfel testas med en liten
DOM-stubb. Det ersätter inte ett fullständigt visuellt webbläsartest.
URL-kontrollen gör inga nätverksanrop: HTTP-status, lager, priser och att länken
pekar på rätt produkt verifieras inte av dessa tester.

## Publiceringsskydd – separat aktivering behövs

Nuvarande publicering från `main`/root behålls. En röd kodkontroll **stoppar inte**
GitHubs separata automatiska Pages-publicering. Kontrollerna är alltså detektion,
inte en aktiverad publiceringsspärr.

För att förhindra publicering av felaktiga uppdateringar utan att ändra
bevakningens skrivningar eller schema rekommenderas följande migrering:

1. Lägg till en egen Pages-workflow på push till `main` samt `workflow_dispatch`.
2. Kör `npm test` i byggjobbet. Först efter godkänt resultat kopieras
   `index.html`, `styles.css`, `app.js`, `deals.js`, `robots.txt` och `.nojekyll`
   till en separat webbplatskatalog som laddas upp med `actions/upload-pages-artifact@v4`.
3. Låt publiceringsjobbet ha `needs: build`, miljön `github-pages` och
   rättigheterna `pages: write` samt `id-token: write`; använd `actions/deploy-pages@v4`.
   Publicera endast push/manuell körning på `main`, aldrig pull requests.
   Använd gemensam concurrency för Pages så att publiceringar inte överlappar.
4. Byt Settings → Pages → Source till **GitHub Actions**, starta workflowen
   och verifiera sidan. Den gamla branch-publiceringen måste ersättas, annars
   kan den fortfarande publicera utan tester. Vid fel i testjobbet ska senaste
   godkända publicering ligga kvar.
5. Kontrollera att bevakningens autentisering utlöser push-workflows. Push med
   `GITHUB_TOKEN` från en annan Actions-workflow utlöser normalt inte nya
   push-workflows; den vägen kräver explicit workflow-anrop. Bevakningens
   autentiseringsmekanism finns inte i detta repository och är inte ändrad här.

Inför inte ett generellt PR-krav/branch-skydd på `main` utan att först verifiera
bevakningen: det kan blockera dess direkta uppdateringar. Den föreslagna
publiceringsspärren låter uppdateringen sparas men publicerar bara godkänd kod.
GitHub-inställningen och publiceringsmigreringen är inte genomförda här.

Referenser:
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow
