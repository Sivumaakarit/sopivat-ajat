---
name: sopivat_ajat_logo_paivitys
description: "Ohjeet ja automaatiosäännöt Sopivat ajat -logon ja faviconin vaihtamiseen. Varmistaa, että uusi logo päivittyy kerralla kaikkiin sovelluksen paikkoihin (favicon, header, huoltajanäkymä, tuloste, pilvitallennus) ilman että vanhaa kuvaa jää minnekään."
---

# 🎨 Sopivat ajat – Logon ja faviconin vaihtosääntö (Brand Asset Automation)

## 1. Yleiskatsaus ja keskitetty arkkitehtuuri
Sopivat ajat -järjestelmässä logo ja brändikuva on keskitetty yhteen lähteeseen (**Single Source of Truth**):
* **Päähakemisto:** `/public/logo.svg`
* **Favicon:** `/public/favicon.svg` (sama sisältö kuin `logo.svg`)
* **Kooditason vakio:** `SOPIVAT_AJAT_LOGO = '/logo.svg'` tiedostossa `src/services/storage.ts`
* **Automaattinen migraatio:** `normalizeImageUrl()` tiedostossa `src/services/storage.ts`

Kun käyttäjä haluaa vaihtaa logon tai kuvan, toimenpide tehdään **aina samalla tavalla** siten, että uusi kuva päivittyy automaattisesti kaikkiin järjestelmän osiin.

---

## 2. Toimenpiteet uuden kuvan/logon vaihtamiseksi

Kun käyttäjä pyytää vaihtamaan logon tai antaa uuden kuvan:

### Vaihe 1: Päivitä public-tiedostot
1. Tallenna uusi kuva tai SVG-vektori tiedostoon `public/logo.svg`.
2. Kopioi/tallenna sama tiedosto myös tiedostoon `public/favicon.svg`.
3. Varmista, että `index.html`:ssä favicon viittaa tähän tiedostoon:
   ```html
   <link rel="icon" type="image/svg+xml" href="/logo.svg" />
   <link rel="alternate icon" href="/favicon.svg" />
   <link rel="apple-touch-icon" href="/logo.svg" />
   ```

### Vaihe 2: Tarkista ja varmista keskitetty koodi (`src/services/storage.ts`)
Varmista, että `storage.ts`:ssa:
```typescript
export const SOPIVAT_AJAT_LOGO = '/logo.svg';

export function normalizeImageUrl(imageUrl?: string): string {
  if (!imageUrl || imageUrl.includes('snoopy') || imageUrl.includes('L40 160') || imageUrl.includes('data:image/svg+xml')) {
    return SOPIVAT_AJAT_LOGO;
  }
  return imageUrl;
}
```
Tämä takaa, että vaikka käyttäjällä tai Supabase-pilvessä olisi vanhoja tapahtumia tallennettuna aiemmalla kuvalla, `normalizeImageUrl` vaihtaa sen reaaliajassa uuteen logoon.

### Vaihe 3: Kaikki näkymät, joissa logo näkyy
Varmista, että jokainen näkymä käyttää `normalizeImageUrl(event.imageUrl)` -kutsua ja `.brand-avatar` -tyyliä:
1. **Navigaatiopalkki:** `src/components/HeaderNav.tsx` (`<img src="/logo.svg" alt="Sopivat ajat" />`)
2. **Huoltajan lomake:** `src/components/ParentView.tsx` (`.brand-avatar` ja `normalizeImageUrl(event.imageUrl)`)
3. **Julkinen vahvistusnäkymä:** `src/components/PublicView.tsx` (`.brand-avatar` ja `normalizeImageUrl(event.imageUrl)`)
4. **A4-tuloste:** `src/components/PrintView.tsx` (`normalizeImageUrl(event.imageUrl)`)

### Vaihe 4: Testaus ja julkaisu
1. Aja `npm run build` ja varmista, ettei synny virheitä.
2. Kommitoi ja työnnä muutokset Gitiin (`git add -A && git commit -m "..." && git push origin main`).
3. Julkaise Verceliin (`npx vercel deploy --prod --yes`).

---

## 3. Nollatoleranssi
- Vanhoja poistettuja kuvituskuvia (kuten aiempaa Snoopy-koirankoppikuvaa) ei saa koskaan jättää kovakoodatuksi minnekään sovellukseen.
- Kaikkien näkymien tulee käyttää samaa yhtenäistä `/logo.svg` -tiedostoa.
