# 🎨 Sopivat ajat – Logo & Favicon -säännöt

1. **Yksi keskitetty logo:**
   Kaikki sovelluksen kuvapaikat (favicon, header-näkymä, huoltajanäkymä, tuloste ja julkinen näkymä) käyttävät samaa kalenterilogoa tiedostosta `/public/logo.svg` ja `/public/favicon.svg`.

2. **Kielletyt kuvat:**
   Aiempaa Snoopy-koirankoppikuvaa ei saa enää käyttää missään sovelluksen osassa.

3. **Automaattinen migraatio:**
   Kaikki tietokannasta tai selaimen välimuistista ladattavat tapahtumat ajetaan `normalizeImageUrl()`-funktion läpi tiedostossa `src/services/storage.ts`, jotta mahdolliset vanhat kuvaviittaukset korvautuvat automaattisesti uudella logolla.

4. **Kun kuva vaihdetaan tulevaisuudessa:**
   Riittää, että korvataan tiedostot `public/logo.svg` ja `public/favicon.svg`. Kaikki näkymät päivittyvät välittömästi ilman hajautettuja koodimuutoksia.
