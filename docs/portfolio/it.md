# Flamme Rouge

**Direzione gara in tempo reale per il ciclismo su strada.**

> Nota sulla terminologia: i nomi dei veicoli usati qui — *auto apripista*,
> *auto fine corsa*, *auto scopa* — sono quelli che il prodotto stesso usa in
> italiano. Vanno tenuti coerenti con l'interfaccia, non tradotti alla lettera
> dal portoghese.

---

## Scheda breve

Sistema di direzione gara per il ciclismo su strada. Ogni veicolo di assistenza
diventa un punto sulla mappa usando il telefono dell'autista — nessuna app da
installare, nessun dispositivo da comprare. Il sistema misura la finestra tra
l'auto apripista e quella di fine corsa come tempo osservato, calcola la
distanza **su strada** e non in linea d'aria, e attiva da solo il soccorso
giusto quando qualcuno lancia un allarme.

Next.js 15, TypeScript e Supabase. Sei lingue, 325 test automatici, provato sul
campo in una gara vera.

---

## Sintesi

Una gara su strada si gestisce via radio. La direzione chiede dov'è l'auto di
fine corsa e riceve una stima; è su quella stima che si riapre la strada — ed è
su quella che si rispetta, o no, il tempo di chiusura concordato con la polizia
stradale.

Flamme Rouge sostituisce la stima con una misura. Ogni veicolo di assistenza
riceve un codice di 6 caratteri stampato sul foglio del briefing, con un QR
accanto. L'autista inquadra con la fotocamera e il suo telefono diventa il
tracker di quel veicolo — nessuno store, nessun account, nessun dispositivo da
comprare, caricare, distribuire e ritirare a fine giornata.

Da lì la direzione vede tutto su una mappa: chi è dove, a quale chilometro di
gara, con che età del dato, e quanto tempo separa la testa dalla coda del
gruppo.

---

## Cosa risolve

### La finestra apripista ↔ fine corsa smette di essere un'ipotesi

Il sistema registra a che ora l'apripista è passata da ogni punto del percorso.
Quando l'auto di fine corsa arriva al km 42, la finestra è la differenza tra due
orari osservati — lo stesso calcolo di un intermedio di cronometraggio. Quando
lo storico non basta ancora, lo schermo scrive "proiettato" e ne spiega il
motivo, invece di fingere precisione.

### Distanza su strada, non in linea d'aria

Su un percorso di andata e ritorno, due veicoli possono distare decine di metri
in linea d'aria e decine di chilometri su strada, su tratti opposti. Un sistema
che confronta coordinate manda il veicolo sbagliato. Questo proietta ogni
posizione sul tracciato indicizzato e confronta lungo di esso — considerando
anche il costo di chi ha già superato il punto e deve tornare indietro
contromano.

### L'allarme non fallisce in silenzio

Una richiesta di soccorso passa davanti a qualsiasi punto GPS e viene ritentata
finché il server non conferma — anche a costo di una coda che non si svuota. E
il soccorso giusto parte per categoria: un incidente chiama l'ambulanza, un
guasto chiama il meccanico, con escalation esplicita e registrata quando non c'è
un veicolo della specialità disponibile.

### Funziona senza segnale

Niente viene inviato prima di essere scritto sul dispositivo, e niente esce
dalla coda prima che il server confermi la ricezione. In un test di due minuti
senza copertura, i punti accumulati sono arrivati tutti — completi, in ordine e
senza duplicati — non appena il segnale è tornato.

### Sei lingue, un solo link

La lingua non sta nell'URL: la negozia il dispositivo. Lo stesso QR dà
portoghese all'autista brasiliano e tedesco all'austriaco, senza che la
direzione gestisca nulla.

---

## Scelte tecniche

**Il dizionario è tipizzato, quindi il testo mancante non compila.** Le sei
lingue derivano dallo stesso tipo; una chiave assente in tedesco rompe la build
invece di comparire come stringa grezza sullo schermo di un autista austriaco il
giorno della gara.

**La motivazione di un'attivazione è salvata a pezzi.** Viene scritta una volta,
nell'istante della decisione, e letta da un massimo di tre persone in lingue
diverse — la direzione, l'autista attivato e chi rivede l'incidente dopo.
Salvare la frase già composta sarebbe sbagliato per due di loro, quindi il
database salva chiavi e numeri, e la frase si compone in lettura.

**Sicurezza per assenza di policy.** Le tabelle con dati sensibili — tentativi
di collegamento, richieste di contatto — non hanno alcuna policy RLS: Postgres
nega per impostazione predefinita, e solo il ruolo di servizio, che vive
esclusivamente nelle rotte server, le vede.

**Il degrado è progettato, non accidentale.** Una chiave mappa non disponibile
ripiega da sola sullo sfondo predefinito; un database irraggiungibile non
diventa una porta chiusa su un modulo; un'email fallita non respinge una
richiesta già salvata.

---

## Stack

**Next.js 15** (App Router, Server Components) · **TypeScript** · **Supabase**
(Postgres, Realtime, Auth, RLS) · **Vercel** · **MapLibre GL** con CARTO e
MapTiler · **Tailwind v4** · **Vitest**

| | |
|---|---|
| Codice | ~35.300 righe in 143 file |
| Test | 325 automatici, 26 file |
| Database | 16 tabelle, 22 policy RLS, 17 funzioni e trigger, 12 migrazioni |
| Lingue | 6, verificate in fase di compilazione |
| Ruoli veicolo | 9 |

---

## Stato

Tecnicamente in produzione, ancora senza cliente pagante. Provato sul campo in
una gara vera con due telefoni e tre ruoli simultanei — apripista, fine corsa e
ambulanza — compreso un allarme incidente con conferma e attivazione automatica.
