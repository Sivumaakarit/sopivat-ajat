# 📌 Sopivat ajat – Master-spesifikaatio & arkkitehtuuridokumentti
*Versio: 1.5.0 | Päivitetty: 24.10.2026*  
*Tila: Kehitys lokaalissa + Supabase Pilvitietokanta kytketty*  
*🌐 Live URL:* [https://sopivat-ajat.vercel.app](https://sopivat-ajat.vercel.app)  
*📦 GitHub:* [https://github.com/Sivumaakarit/sopivat-ajat](https://github.com/Sivumaakarit/sopivat-ajat)  

---

## 1. Yleiskatsaus ja visio

**"Sopivat ajat"** on moderni, visuaalisesti ensiluokkainen ja kognitiivista kuormitusta radikaalisti vähentävä verkkotyökalu koulujen arviointikeskustelujen ja yleisten tapaamisaikojen keräämiseen, sovitteluun ja vahvistamiseen.

### Keskeiset uusimmat ominaisuudet (v1.5.0):
* **Supabase Pilvitietokanta & Reaaliaikasynkronointi (Realtime Sync):**
  - Opettajan luomat ajat ja asetukset tallentuvat suoraan Supabase PostgreSQL -tietokantaan (`events` ja `submissions`).
  - Kun huoltaja vastaa puhelimellaan jakolinkin kautta (`?e=[eventId]`), vastaus tallentuu pilveen ja ilmestyy välittömästi opettajan tietokoneen näytölle ilman sivun uudelleenlatausta.
* **Häiriötön Huoltajanäkymä (Distraction-Free Parent Mode):**
  - Kun huoltaja avaa jakolinkin `?e=xyz`, opettajan hallintapalkki (HeaderNav) piilotetaan. Huoltaja näkee vain siistin, selkeän vastauslomakkeen.
* **Looginen 4-vaiheinen johdatuspolku (Guided Workflow):**
  1. **Vaihe 1: Aikojen hallinta:** Opettaja luo päivät ja aikaraamit. Ensisijainen painike ohjaa suoraan Vaiheeseen 2 (Esikatsele ja jaa).
  2. **Vaihe 2: Huoltajanäkymä & Jakopaneeli:** Opettaja esikatselee lomaketta sellaisena kuin huoltaja sen näkee, kopioi jakolinkin tai valmiin Wilma-viestin yhdellä klikkauksella. Ensisijainen painike ohjaa Vaiheeseen 3 (Aikasovitus).
  3. **Vaihe 3: Aikasovitus (palapeli):** Opettaja sovittaa vastanneet oppilaat aikoihin konfliktienestolla ja saa yhteenvedon.
  4. **Vaihe 4: A4-tuloste & tiedotteet:** Valmis tulostettava lukujärjestyspohja ja Wilma-vahvistusviestit.

### Keskeinen ongelma ja ratkaisu:
* **Ennen:** Opettaja printtaa kymmeniä paperilappuja reppuihin, huoltajat rastittavat kynällä aikoja, opettaja pyörittää paperikasaa pöydällään yrittäen manuaalisesti sovittaa 25 oppilaan toiveet ilman tuplabuukkauksia, ja kirjoittaa lopuksi jokaiselle Wilma-viestin käsin.
* **Nyt:** Opettaja luo ajat sekunneissa älykkäällä ketjutuksella, huoltaja rastittaa sopivat ajat puhelimella alle minuutissa, opettaja sovittaa palapelin älykkäällä konfliktien estolla ja saa yhdellä klikkauksella A4-printin sekä valmiin Wilma-tiedotteen.

---

## 2. Kognitiivinen ergonomia ja saavutettavuus (UX & A11y)

Sovellus noudattaa tiukasti *Responsible App*-, *GeoVitonen*- ja *Visual Excellence* -periaatteita:

| Periaate | Toteutus sovelluksessa | Vaikutus käyttäjään |
| :--- | :--- | :--- |
| **Hickin laki** (Valinnan helppous) | Päivät ryhmitellään selkeiksi sarakkeiksi/korteiksi. Jokaisessa päivässä on **"⚡ Valitse kaikki tämän päivän ajat"** -pikapainike. | Huoltajan ei tarvitse klikata 8 eri kellonaikaa, jos koko iltapäivä sopii. 1 klikkaus riittää. |
| **Millerin laki & Chunking** (Paloittelu) | Selkeä 3-vaiheinen hierarkia: 1) Ohjeet & Kuva, 2) Oppilaan tunnistus, 3) Päiväkohtaiset aikakortit. | Aivot hahmottavat tehtävän yhdellä silmäyksellä alle 3 sekunnissa. |
| **Zero Anxiety** (Ei epävarmuutta) | Reaaliaikainen tilannepalkki: *"Valittu 2/3 vaaditusta ajasta"*. Lähetyspainike aktivoituu vihreänä heti kun ehto täyttyy. | Huoltaja tietää koko ajan tarkalleen, mitä häneltä odotetaan ja milloin lomake on valmis. |
| **Tietosuoja ilman kitkaa** | Ei sukunimiä, ei sähköposteja, ei salasanoja. Vain *Etunimi* + *Sukunimen 1. kirjain* (`Esko M.`). | Nolla tietosuojahuolta vanhemmille ja koululle, ei lomakeväsymystä. |
| **Saavutettavuus (WCAG 2.2 AAA)** | Kontrastisuhde vähintään 7:1, kosketuspinnat vähintään 48×48 px, selkeä näppäimistöfokus (Tab + Space). | Täydellinen käytettävyys myös näkövammaisille ja ruudunlukuohjelmille. |
| **Välitön palaute (< 100 ms)** | Jokainen valinta animoituu hienovaraisesti ja antaa visuaalisen kuittauksen heti ilman verkkolatenssia. | Ei koskaan kysymystä: *"Rekisteröityikö tämä painallus?"* |

---

## 3. Käyttäjäroolit ja Toiminnallisuudet

### 3.1 Opettaja / Järjestäjä (Luonti & Hallinta)

#### A. Asetukset & Sisältö:
* **Tapahtuman nimi:** Vapaa tekstikenttä (esim. *"Arviointikeskustelujen varaukset syksy 2026"*).
* **Ohjetekstilaatikko:** Valmiiksi esitäytetty ystävällinen viestipohja, jota voi muokata suoraan.
* **Kuvan lataus:** Voi ladata oman kuvan tai valita hauskan oletuskuvituksen (esim. Snoopy / teemakuva).
* **Minimivalintojen määrä:** Asetettava lukuarvo (oletus: `3`).
* **Tapaamisen oletuskesto:** Asetettava minuuttiluku (oletus: `20 min`).

#### B. Supernopea aikojen syöttötyökalu (Smart Ketjutus & Aikahyppy):
* Valitse päivämäärä (esim. `Torstai 12.11.2026`).
* Syötä ensimmäinen aloitusaika: esim. `07:45`.
* **Automaattinen laskenta:** Järjestelmä laskee keston perusteella `07:45 – 08:05` ja lisää sen listaan.
* **Valmis seuraava ehdotus:** Seuraavalle riville ilmestyy heti valmiiksi laskettu ehdotus `08:05 – 08:25`.
  * *Normaali jatko:* Paina `Enter` tai `+ Hyväksy` ➔ aika lukittuu, ja seuraava ehdotus ilmestyy.
  * *Aikahyppy (Päällikirjoitus):* Jos haluat hypätä iltapäivään klo 13:15 tai pitää tauon, **kirjoitat vain ehdotetun aloitusajan päälle suoraan `13:15`**.
  * Järjestelmä tunnistaa hypyn lennosta, luo `13:15 – 13:35` ja ketjuttaa seuraavat automaattisesti uudesta ajasta eteenpäin.
  * *Visuaalinen taukoviiva:* Jos kahden ajan välinen tauko on suuri (yli 1 tunti), järjestelmä piirtää väliin automaattisesti kevyen visuaalisen erottimen (esim. `☕ Aikahyppy / Iltapäivä`).
  * *Hylkäys:* Hyväksymättömät harmaat ehdotusrivit jäävät automaattisesti pois julkaistavasta versiosta. Jokaisen ajan perässä on lisäksi poistonappi `(✕)`.
  * *Automaattinen kronologinen järjestys (Deterministic Chronological Sorting):* Kaikki ajat ja päivät järjestetään aina automaattisesti kronologiseen kalenteri- ja kellonaikajärjestykseen riippumatta siitä, missä järjestyksessä opettaja ne syöttää (esim. jos iltapäivän `14:20` jälkeen lisätään `13:20`, `13:20` siirtyy automaattisesti oikealle paikalleen ennen `14:20`). Sama järjestys säilyy sataprosenttisesti kaikissa jatkonäkymissä (huoltajanäkymä, palapelisovitus, A4-tuloste).

#### C. Esikatselu (Preview):
* Ennen julkaisua opettaja voi yhdellä napilla kytkeä **"Esikatsele huoltajan näkymää"** -tilan.
* Näkee tarkalleen miltä sivu näyttää mobiilissa ja koneella ilman tallennusvaikutuksia.

---

### 3.2 Huoltaja / Vastaaja (Ajanvarauslomake)

1. **Aloitus ilman kirjautumista:**
   * Aukeaa suoraan Wilmasta saatuun linkkiin.
   * Ylhäällä näkyvät opettajan ohjeet, Snoopy-kuva ja palautuksen määräaika.
2. **Oppilaan nimen syöttö (GDPR-optimoitu):**
   * Kenttä 1: `Oppilaan etunimi` (esim. *Esko*)
   * Kenttä 2: `Sukunimen 1. kirjain` (max 1 merkki, automaattinen suuraakkonen, esim. *M*)
   * Live-esikatselu vieressä: `💡 Opettajalle näkyvä muoto: Esko M.`
3. **Aikojen valinta:**
   * Päivät esitetään selkeinä kortteina / sarakkeina.
   * **Pikavalinta:** Jokaisen päiväkortin yläosassa painike `⚡ Valitse kaikki tämän päivän ajat`.
   * **Yksittäisvalinta:** Kukin aika on suuri, selkeä kosketusalue. Valittu aika saa selkeän korostusvärin ja `✓`-kuvakkeen.
4. **Validointi ja Lähetys:**
   * Alapalkissa laskuri: *"Valittuna 3 / 3 aikaa (Vaadittu minimi saavutettu ✓)"*.
   * Jos alle minimin: painike on passiivinen ja näyttää lempeän vinkin: *"Valitse vielä 1 aika jatkaaksesi"*.
   * Lähetys tuottaa välittömän, luottamusta herättävän onnistumissivun: *"Kiitos! Vastauksesi on vastaanotettu. Opettaja ilmoittaa vahvistetun ajan Wilmassa."*

---

### 3.3 Opettajan palapeli- ja lukitustyökalu (Matching Engine)

Kun vastaukset ovat saapuneet, opettajan ei tarvitse arpoa sopivia aikoja:

1. **Aikataulutaulukko:**
   * Kaikki luodut ajat näkyvät kronologisessa järjestyksessä.
   * Jokaisen aikavälin kohdalla on vetolaatikko (dropdown):
     * Valikossa näkyvät **vain ne oppilaat, jotka ovat valinneet kyseisen ajan**.
     * Esim. `Valitse oppilas (7 toivoi tätä aikaa) ▾`
2. **Automaattinen konfliktien esto (Smart Lock):**
   * Kun opettaja valitsee *Esko M.*:n klo 13:15 slottiin:
     * *Esko M.* **poistuu välittömästi** kaikkien muiden aikojen vetolaatikoista.
     * Esko M. ei voi koskaan päätyä tuplabuukatuksi.
   * Jos opettaja haluaa muuttaa valintaa:
     * Valinnan poistaminen tai vaihtaminen **vapauttaa** *Esko M.*:n heti takaisin niihin aikoihin, joihin hän oli ilmoittautunut.
3. **Tilanneseuranta:**
   * Sivupalkissa selkeä luettelo:
     * ✅ **Ajan saaneet oppilaat** (esim. 18 / 22)
     * ⏳ **Vielä ilman aikaa olevat** (esim. 4 / 22) – klikkaamalla oppilasta näet heti, mihin aikoihin hänelle sopisi!
4. **Nimien näyttölogiikka:**
   * Oletus: näytetään vain etunimi (esim. *Esko*).
   * Jos luokassa on kaksi samannimistä, järjestelmä liittää automaattisesti sukunimen alkukirjaimen: *Esko M.* ja *Esko K.*

---

## 4. Julkaisu, Tulostus ja Jakaminen

1. **A4-Tuloste (`@media print`):**
   * Yhdellä klikkauksella korkealaatuinen, mustavalko-optimoitu tuloste luokan oveen tai opettajan kansioon.
   * Sisältää otsikon, päivät, kellonajat ja vahvistetut oppilaat taulukkomuodossa.
2. **Julkinen katselulinkki huoltajille:**
   * Lukulinkki, jonka voi laittaa Wilma-viestiin.
   * Huoltajat näkevät lukitut ajat (vain etunimillä / `Esko M.`), joten jokainen perhe voi helposti tarkistaa oman aikansa milloin vain.
3. **Wilma-viestipohja leikepöydälle:**
   * Yhdellä painikkeella kopioitava valmis viestipohja opettajalle:
     > *"Hei! Arviointikeskustelujen ajat on nyt vahvistettu. Voit tarkistaa oman aikanne oheisesta linkistä: [linkki]. Ystävällisin terveisin, Esko"*

---

## 5. Tekninen Arkkitehtuuri & Tietomalli

### 5.1 Tietorakenne (TypeScript Interfaces)

```typescript
// Yhden aikavälin malli
export interface TimeSlot {
  id: string;             // Uniikki UUID
  date: string;           // VVVV-KK-PP, esim. "2026-11-12"
  startTime: string;      // "13:15"
  endTime: string;        // "13:35"
  assignedStudentId?: string | null; // Lukittu oppilas (jos opettaja valinnut)
}

// Opettajan luoman kyselyn asetukset
export interface ScheduleEvent {
  id: string;
  adminToken: string;     // Salainen avain opettajan hallintanäkymään
  title: string;          // esim. "Arviointikeskustelujen varaukset syksy 2026"
  instructions: string;   // Ohjeteksti
  imageUrl?: string;      // Snoopy tai teemakuva
  slotDurationMinutes: number; // esim. 20
  minSelectionsRequired: number; // esim. 3
  deadlineDate?: string;  // Viimeinen palautuspäivä
  slots: TimeSlot[];
  isLocked: boolean;      // Onko opettaja lukinnut lopullisen aikataulun
}

// Huoltajan lähettämä vastaus
export interface StudentSubmission {
  id: string;
  firstName: string;      // esim. "Esko"
  lastNameInitial: string;// esim. "M"
  selectedSlotIds: string[]; // Taulukko TimeSlot.id -tunnisteita
  submittedAt: string;    // ISO-aikaleima
}
```

### 5.2 Tietosuoja & Tallennusratkaisu (GDPR by Design)

* **Data Minimization:** Ei sukunimiä, ei puhelinnumeroita, ei sähköposteja. Henkilötiedoksi luokiteltava aines on minimoitu pelkkään etunimeen ja yhteen kirjaimeen (`Esko M.`).
* **Kompakti & inhimillinen syöttökenttä:** Etunimikenttä on rajattu luonnolliseen leveyteen (260 px), ja sukunimen 1. kirjain (`esim. M`) asettuu sen viereen samalle riville tasapainoiseksi kokonaisuudeksi.
* **Interaktiivinen GDPR-opas:** Kysymysmerkistä avautuu kattava opas, joka selittää Perusopetuslain (628/1998, 16 § & 22 §), EU GDPR:n minimointiperiaatteen (5(1)(c)) ja linkittää Tietosuojavaltuutetun toimistoon (tietosuoja.fi).
* **Tallennuskerros:**
  * Kyselyt ja vastaukset tallennetaan turvalliseen EU-pohjaiseen tietovarastoon (Tukholma, Ruotsi).
  * **Automaattinen poisto (TTL):** Kysely ja kaikki sen vastaukset poistuvat arviointijakson päätyttyä, ja opettaja voi poistaa tiedot milloin tahansa yhdellä painalluksella.
  * **Vienti omaan talteen:** Opettaja voi milloin tahansa ladata kaikki vastaukset ja lopullisen aikataulun omalle koneelleen (A4-printti, CSV, Wilma-tiedote).

---

## 6. Käyttöliittymän Tilat & Nollatoleranssi (System States)

Noudattaen globaaleja laatussääntöjä jokaisella näkymällä on neljä pakollista tilaa:
1. **Lataustila (Loading):** Pehmeät luurankoelementit (skeleton loaders), ei välkkyvää tyhjää ruutua.
2. **Tyhjä tila (Empty State):** Selkeä opastus: *"Et ole vielä lisännyt aikoja. Aloita valitsemalla päivämäärä ja aloitusaika yltä."*
3. **Virhetila (Error State):** Lempeä, syyllistämätön ohjaus (esim. *"Valitsethan vielä vähintään 1 sopivan ajan ennen lähettämistä"*).
4. **Onnistumistila (Success State):** Välitön, rauhoittava kuittaus (toast + selkeä vahvistuskortti).

---

## 7. Toteutuksen Seuraavat Askeleet

Kun tämä dokumentti on katselmoitu ja hyväksytty:
1. Alustetaan puhdas, moderni ja nopea verkkosovellus runkoineen hakemistoon `/Users/eskomaki/Antigravity/VerkkoSivut/Sopivat_ajat`.
2. Luodaan minimalistinen, tyylikäs design system (väripaletti, typografia, komponenttityylit, A4 print -säännöt).
3. Toteutetaan älykäs aikojen syöttötyökalu (päällikirjoitus-aikahyppy + automaattiketjutus).
4. Toteutetaan huoltajan vastauslomake (kaksoiskenttä `Esko` + `M`, päivät, "Valitse kaikki").
5. Toteutetaan opettajan sovitustyökalu (dropdown-matching, automaattinen konfliktien esto).
6. Toteutetaan A4-printtaus ja Wilma-jakotoiminnot.
