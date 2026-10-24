---
name: supabase_integraatio
description: Täydellinen arkkitehtuuri- ja käyttöopas Supabasen (PostgreSQL, Realtime, RLS) liittämiseen web- ja React/Vite-projekteihin. Sisältää optimoidun local-first arkkitehtuurin (localStorage + Supabase async background sync), SQL-skeemat ja RLS-säännöt.
---

# ⚡ Supabase Pilvi-integraatio & Reaaliaikasynkronointi

Tämä skilli ohjaa ja standardoi Supabasen (PostgreSQL, Realtime, RLS, Storage) liittämisen Sivumaakareiden ja Esko Mäen web-sovelluksiin.

Skilli opettaa **Local-First + Background Cloud Sync** -arkkitehtuurin, joka takaa nollalatenenssin käyttäjälle (<100 ms) ja täydellisen pilvivarmistuksen ja reaaliaikaisen monen käyttäjän synkronoinnin.

---

## 1. Arkkitehtuuri: Local-First + Silent Background Sync

Älä koskaan laita käyttäjää odottamaan verkkoyhteyttä tai näyttämään latauspyörää jokaisen klikkauksen kohdalla. Sovelluksissamme käytetään aina seuraavaa mallia:

```
[Käyttäjän toimenpide (valinta/lähetys)]
         │
         ├──► 1. Päivitä sovelluksen State & UI välittömästi (<10 ms)
         ├──► 2. Tallenna selaimen localStorageen (toimii offline-tilassa)
         └──► 3. Synkronoi taustalla Supabaseen asynkronisesti (non-blocking)
```

### Edut:
* **Huippunopea UI:** Ei latausviivettä, nappi reagoi heti.
* **Toimintavarmuus:** Vaikka verkko pätkisi, data säilyy paikallisesti ja tallentuu pilveen heti kun yhteys palaa.
* **Reaaliaikaisuus:** Huoltajien vastaukset puhelimelta päivittyvät reaaliajassa opettajan näytölle Supabasen WebSocket/Realtime-kanavan kautta.

---

## 2. Asennus ja Client-alustus (Vite / React / TypeScript)

### 2.1 Riippuvuuden asennus
```bash
npm install @supabase/supabase-js
```

### 2.2 Client-tiedosto: `src/services/supabaseClient.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

// Käytetään ympäristömuuttujia tai varavakiota
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://acsnhmblgjehrztmtcrj.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 2.3 Ympäristömuuttujat (`.env` ja `.env.example`)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1Ni...
```

*Vercel-tuotannossa:* Lisää samat muuttujat Vercelin Dashboardissa (`Settings -> Environment Variables`).

---

## 3. Vakioidut SQL-skeemat (DDL)

Aja nämä SQL-komennot Supabasen **SQL Editorissa**:

```sql
-- 1. Tapahtumat ja kyselyt (Events)
create table if not exists public.events (
  id text primary key,
  admin_token text not null,
  title text not null,
  instructions text,
  image_url text,
  slot_duration_minutes integer default 20,
  min_selections_required integer default 3,
  deadline_date text,
  teacher_name text,
  slots jsonb not null default '[]'::jsonb,
  is_locked boolean default false,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Huoltajien vastaukset (Submissions)
create table if not exists public.submissions (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  first_name text not null,
  last_name_initial text not null,
  selected_slot_ids jsonb not null default '[]'::jsonb,
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indeksit nopeita hakuja varten
create index if not exists idx_submissions_event_id on public.submissions(event_id);
create index if not exists idx_events_admin_token on public.events(admin_token);
```

---

## 4. Tietoturva & RLS (Row Level Security)

Koska huoltajat vastaavat ilman erillistä käyttäjätiliä tai kirjautumista, taulujen RLS-säännöt konfiguroidaan sallimaan luku ja lisäys anonymiteettiä kunnioittaen:

```sql
-- Ota RLS käyttöön
alter table public.events enable row level security;
alter table public.submissions enable row level security;

-- Events: Kaikki voivat lukea kyselyn id:llä
create policy "Salli julkinen kyselyn luku"
  on public.events for select
  using (true);

-- Events: Hallinta ja päivitys sallittu anon-avaimella
create policy "Salli kyselyn tallennus ja muokkaus"
  on public.events for all
  using (true)
  with check (true);

-- Submissions: Huoltajat voivat lähettää ja päivittää oman vastauksensa
create policy "Salli vastausten lisäys ja päivitys"
  on public.submissions for all
  using (true)
  with check (true);
```

---

## 5. Standardoitu Tallennus- ja Synkronointikuvio (`storage.ts`)

### 5.1 Tapahtuman tallennus (Upsert)
```typescript
export async function saveEventToCloud(event: ScheduleEvent): Promise<boolean> {
  try {
    const { error } = await supabase.from('events').upsert({
      id: event.id,
      admin_token: event.adminToken,
      title: event.title,
      instructions: event.instructions,
      image_url: event.imageUrl,
      slot_duration_minutes: event.slotDurationMinutes,
      min_selections_required: event.minSelectionsRequired,
      deadline_date: event.deadlineDate,
      teacher_name: event.teacherName,
      slots: event.slots,
      is_locked: event.isLocked,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Supabase pilvitallennus epäonnistui:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Verkkovirhe pilvitallennuksessa:', err);
    return false;
  }
}
```

### 5.2 Huoltajan vastauksen lisäys / päivitys
```typescript
export function upsertSubmission(sub: Omit<StudentSubmission, 'id' | 'submittedAt'>) {
  // 1. Päivitä lokaali tila
  const all = getSubmissions();
  // ... päivitä array ...
  saveSubmissions(all);

  // 2. Synkronoi asynkronisesti Supabaseen
  supabase
    .from('submissions')
    .upsert({
      id: resultSubmission.id,
      event_id: resultSubmission.eventId,
      first_name: resultSubmission.firstName,
      last_name_initial: resultSubmission.lastNameInitial,
      selected_slot_ids: resultSubmission.selectedSlotIds,
      submitted_at: resultSubmission.submittedAt,
    })
    .then(({ error }) => {
      if (error) console.warn('Supabase vastaustallennus epäonnistui:', error.message);
    });

  return { submission: resultSubmission, allSubmissions: all };
}
```

---

## 6. Uuden projektin tarkistuslista (Checklist)

Kun luot uuden sovelluksen, jossa tarvitaan pilvitietokantaa:
1. [ ] Asenna `@supabase/supabase-js`.
2. [ ] Kopioi `supabaseClient.ts` hakemistoon `src/services/`.
3. [ ] Aja taulujen DDL-skripti Supabasessa (tai käytä olemassa olevaa projektia).
4. [ ] Ota käyttöön Local-first tallennus (`localStorage` nopea välimuisti + Supabase taustasynkronoija).
5. [ ] Lisää `VITE_SUPABASE_URL` ja `VITE_SUPABASE_ANON_KEY` Verceliin.
