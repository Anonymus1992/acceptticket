# Accept Ticket System v1.0

Discord.js v14 ticketbot privát ticketcsatornákkal, JSON-adattárolással, staffkezeléssel, Discord logokkal és HTML-transcript exporttal.

## Funkciók

- Privát ticketcsatorna kategóriaválasztó panelből
- Kategóriák `config.json` fájlból állíthatók
- Claim gomb stafftagoknak
- Lezárás megerősítéssel
- Lezárt ticket újranyitása staff által
- `/ticket-add` és `/ticket-remove`
- `/ticket-stats`
- JSON-alapú ticketadatok és automatikus sorszám
- Napló: nyitás, claim, lezárás, újranyitás, tag hozzáadása/eltávolítása, üzenetszerkesztés és -törlés
- HTML-transcript helyi mentése és feltöltése a kijelölt transcript-log csatornába
- Neon kék Accept embed stílus

## Követelmények

- Node.js 18.17 vagy újabb (ajánlott Node.js 20 LTS)
- Discord alkalmazás és bot a Discord Developer Portalon
- A botnak legyen joga csatornákat létrehozni/kezelni és üzeneteket küldeni

## 1. Telepítés

1. Töltsd le és csomagold ki a ZIP-et.
2. A projekt mappájában futtasd:

   ```bash
   npm install
   ```

3. Másold le a `.env.example` fájlt `.env` néven.
4. Töltsd ki a `DISCORD_TOKEN`, `CLIENT_ID` és `GUILD_ID` értékeket.
5. Nyisd meg a `config.json` fájlt, és add meg a kategória-, logcsatorna- és szerepkör-azonosítókat.

## 2. Discord Developer Portal

- Hozz létre egy alkalmazást, majd egy botot.
- Másold a bot tokenjét a `.env` fájlba. A tokent soha ne oszd meg.
- A botot a szerverre `bot` és `applications.commands` scope-pal hívd meg.
- Botengedélyek: `View Channels`, `Send Messages`, `Read Message History`, `Embed Links`, `Attach Files`, `Manage Channels`, `Manage Roles` (csak ha a botnak szüksége van a csatorna-overwrite-ok kezelésére; a bot szerepköre legyen megfelelően beállítva).
- A Developer Portalban kapcsold be a **Message Content Intent** opciót, hogy a transcriptben a szöveges üzeneteket és az üzenetmódosításokat kezelhesse.

## 3. Konfiguráció

A `config.json` legfontosabb mezői:

- `channels.ticketCategoryIds`: külön Discord-kategóriaazonosító ügytípusonként (`admin`, `support`, `faction`, `general`); a ticket a kiválasztott típushoz tartozó kategóriába kerül
- `channels.ticketCategoryId`: opcionális tartalék kategória, ha az adott típushoz nincs külön ID beállítva
- `channels.logChannelId`: eseménynapló csatorna
- `channels.transcriptLogChannelId`: HTML-transcriptek csatornája
- `channels.panelChannelId`: opcionális panelcsatorna (a `/ticket-panel` az aktuális csatornába küldi a panelt)
- `roles.staffRoleIds`: staff szerepkörök
- `roles.adminRoleIds`: admin szerepkörök
- `tickets.maxOpenPerUser`: egy felhasználó nyitott ticketjeinek maximuma
- `tickets.deleteAfterClose`: `false` esetén a lezárt ticket csatornája megmarad, és staff újranyithatja; `true` esetén a csatorna késleltetve törlődik
- `tickets.supportTypes`: ticketkategóriák

Az ID-ket Discordban a Fejlesztői mód bekapcsolása után tudod kimásolni. A `PASTE_...` szövegeket cseréld valódi ID-kre. Hozz létre négy Discord-kategóriát az Adminügy, Támogatás, Frakció probléma és Általános segítség ticketekhez, majd másold a kategóriák ID-jét a `ticketCategoryIds` megfelelő mezőjébe.

## 4. Slash parancsok regisztrálása

```bash
npm run deploy
```

Ez a parancs a `.env` fájlban megadott szerverre regisztrálja a parancsokat.

## 5. Indítás

```bash
npm start
```

Majd Discordon futtasd:

```text
/ticket-panel
```

A parancsot a Manage Server jogosultsággal rendelkező tag tudja használni. A panelt abba a csatornába küldi, ahol a parancsot kiadtad.

## Parancsok

- `/ticket-panel` — panel küldése (Manage Server)
- `/ticket-add felhasznalo` — felhasználó hozzáadása az aktuális nyitott tickethez (staff)
- `/ticket-remove felhasznalo` — felhasználó eltávolítása (staff)
- `/ticket-stats` — statisztikák (staff)

A claim, lezárás és újranyitás gombok a ticketcsatornában jelennek meg.

## Adatok és biztonsági mentés

- `data/tickets.json`: ticketek adatai
- `data/counter.json`: következő ticket sorszáma
- `transcripts/`: helyben elmentett HTML-transcriptek

Állítsd le a botot, mielőtt ezeket kézzel módosítod. Rendszeresen készíts biztonsági mentést a `data/` és `transcripts/` mappáról. JSON-adattárolás egy botpéldányhoz való; több párhuzamos botpéldányhoz adatbázis ajánlott.

## Fontos korlátok

- A Discord üzenet- és csatorna-hozzáférésen alapuló rendszer; a bot csak azokat az adatokat tudja naplózni, amelyekhez hozzáférése van.
- A transcript maximum 5000 üzenetet olvas be. A mellékletek linkjeit menti, nem tölti le a fájlokat.
- A törölt üzenetek tartalma nem mindig elérhető, ha a Discord API nem adja vissza a törölt üzenet objektumát.
- A logcsatornákhoz a botnak `View Channel`, `Send Messages`, `Embed Links` és a transcript csatornához `Attach Files` jog kell.
