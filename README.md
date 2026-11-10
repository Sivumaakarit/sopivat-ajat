# 📅 Sopivat ajat

Moderni, nopea ja tietoturvallinen verkkosovellus koulujen arviointikeskustelujen ja vanhempaintapaamisten aikatauluttamiseen ilman Wilma-viestisotaa ja tuplavarauksia.

* **🌐 Live-versio:** [https://sopivat-ajat.vercel.app](https://sopivat-ajat.vercel.app)
* **📦 GitHub Repository:** [https://github.com/Sivumaakarit/sopivat-ajat](https://github.com/Sivumaakarit/sopivat-ajat)
* **📘 Master-spesifikaatio:** [SOPIVAT_AJAT_SPEC.md](./SOPIVAT_AJAT_SPEC.md)

---

## ✨ Tärkeimmät ominaisuudet

1. **Supernopea aikojen luonti (Opettaja)**
   - Automaattinen aikojen ketjutus: kirjoita aloitusaika ja paina `Enter`.
   - Vapaa numeronäppäinsyöttö (kesto minuutteina esim. 3, 7, 20, 24 min; minimivalintamäärä esim. 1, 2, 3, 7).
   - Valmiit pikataksonit (+5 min ja +10 min tauot).
   - Tapahtumakohtainen räätälöitävä saateteksti ja palautusmääräaika.

2. **Häiriötön mobiililomake (Huoltaja)**
   - Yksinkertainen ja nopea täyttää puhelimella alle minuutissa.
   - **GDPR-optimoitu:** Huoltaja syöttää vain oppilaan etunimen ja sukunimen 1. kirjaimen (`Esko M.`).
   - **Älykäs alapalkki:** Lähetyspalkki pysyy piilossa sivun yläreunassa, jotta vanhempi saa lukea saatetekstin rauhassa. Palkki liukuu pehmeästi esiin rullattaessa alas kohti nimeä ja aikoja.
   - Ryhmävalinnat: "Valitse kaikki tämän päivän ajat".

3. **Älykäs aikasovitus (Palapeli)**
   - Automaattinen bipartiittisovitus (Kuhn's Augmenting Path), joka takaa, että suurin mahdollinen määrä perheitä saa toivomansa ajan ilman päällekkäisyyksiä.
   - Visuaalinen konfliktienesto: ajan lukitseminen vapauttaa tai siirtää ehdokkaita lennosta.
   - Vaihto päittäin -tuki: vaihda kahden oppilaan ajat yhdellä klikkauksella.

4. **100 % GDPR-turvallinen vahvistus Wilmassa**
   - Koulujen tietosuojasuosituksen mukaisesti oppilaiden nimiä ja aikoja ei julkaista julkiseen verkkolinkkiin.
   - **Henkilökohtaiset Wilma-vahvistusviestit:** Opettaja kopioi jokaisen oppilaan (esim. *Eetu K.*) kohdalta valmiin henkilökohtaisen Wilma-viestin yhdellä klikkauksella leikepöydälle.
   - Mahdollisuus kopioida kaikkien viestit kerralla listana.
   - Tulostettava A4-lista luokan oveen tai opettajan kansioon.

5. **Rinnakkaisluokkatuki & Pilvisynkronointi**
   - Puhdas URL `https://sopivat-ajat.vercel.app` luo jokaiselle opettajalle puhtaan, oman luokkatunnisteen.
   - Supabase PostgreSQL -taustatietokanta reaaliaikaisella synkronoinnilla (Realtime).

---

## 🛠️ Teknologia

* **Frontend:** React 19, TypeScript, Vite
* **Tyylit:** Moderni CSS, Apple Design -periaatteet (Frosted Glass, Apple Spring -animaatiot, fluid UI)
* **Tietokanta:** Supabase (PostgreSQL, Realtime websocket subscriptions)
* **Hosting & CI/CD:** Vercel Production Auto-Deploy
* **Ikonit:** Lucide React
* **Visuaaliset efektit:** canvas-confetti

---

## 🚀 Kehitys paikallisesti

```bash
# Asenna riippuvuudet
npm install

# Käynnistä kehityspalvelin
npm run dev

# Rakenna tuotantoversio ja tarkista TypeScript-tyypit
npm run build
```
