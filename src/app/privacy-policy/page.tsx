import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LegalContact } from "@/components/LegalPage";
import { legal } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · Victoria Casa Hirta",
  description: "Informativa sul trattamento dei dati personali del sito victoriacasahirta.it",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Questa informativa, resa ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (&quot;GDPR&quot;), descrive come
        vengono trattati i dati personali di chi visita il sito <strong>{legal.site}</strong>.
      </p>

      <h2>Titolare del trattamento</h2>
      <p>
        {legal.owner}. Per qualsiasi richiesta relativa alla privacy puoi scrivere a <LegalContact />.
      </p>

      <h2>Quali dati trattiamo</h2>
      <ul>
        <li>
          <strong>Dati di navigazione.</strong> I sistemi che fanno funzionare il sito registrano, come avviene per ogni sito web,
          dati tecnici come indirizzo IP, tipo di browser, pagine richieste e orario. Servono a erogare il sito e a garantirne la
          sicurezza e non vengono usati per identificarti.
        </li>
        <li>
          <strong>Dati statistici (solo con il tuo consenso).</strong> Se accetti i cookie statistici usiamo Google Analytics per
          sapere, in forma aggregata, quante persone visitano il sito e quali pagine consultano.
        </li>
        <li>
          <strong>Contenuti esterni (solo con il tuo consenso).</strong> Video di Instagram e mappe di Google Maps vengono caricati
          solo se li accetti; in quel caso Meta e Google ricevono i dati tecnici della tua visita.
        </li>
        <li>
          <strong>Votazioni.</strong> Se partecipi a una votazione sul sito (ad esempio il migliore in campo), registriamo il voto e
          l&apos;indirizzo IP al solo scopo di evitare voti multipli.
        </li>
        <li>
          <strong>Area riservata.</strong> Per gli amministratori del sito trattiamo email e credenziali di accesso.
        </li>
        <li>
          <strong>Atleti e staff.</strong> Il sito pubblica nomi, ruoli, statistiche sportive ed eventuali foto di giocatori e
          staff della squadra, nell&apos;ambito dell&apos;attività sportiva dell&apos;associazione.
        </li>
      </ul>

      <h2>Perché e su quale base</h2>
      <ul>
        <li>Erogare il sito e garantirne la sicurezza: legittimo interesse del titolare (art. 6.1.f GDPR).</li>
        <li>Statistiche di visita e contenuti esterni: tuo consenso (art. 6.1.a GDPR), revocabile in qualsiasi momento.</li>
        <li>Correttezza delle votazioni: legittimo interesse del titolare (art. 6.1.f GDPR).</li>
        <li>Gestione dell&apos;area riservata e pubblicazione dei dati sportivi: attività istituzionale dell&apos;associazione e, ove necessario, consenso degli interessati.</li>
      </ul>

      <h2>A chi comunichiamo i dati</h2>
      <p>I dati sono trattati da fornitori che agiscono come responsabili del trattamento o come titolari autonomi:</p>
      <ul>
        <li><strong>Vercel Inc.</strong> – hosting del sito;</li>
        <li><strong>Supabase Inc.</strong> – database e archiviazione delle immagini (server nell&apos;Unione Europea);</li>
        <li><strong>Google Ireland Ltd.</strong> – Google Analytics e Google Maps, solo con il tuo consenso;</li>
        <li><strong>Meta Platforms Ireland Ltd.</strong> – contenuti Instagram, solo con il tuo consenso.</li>
      </ul>
      <p>
        Alcuni di questi fornitori possono trasferire dati negli Stati Uniti: il trasferimento avviene sulla base del Data Privacy
        Framework UE-USA o delle Clausole Contrattuali Standard approvate dalla Commissione europea. I dati non vengono venduti né
        usati per pubblicità.
      </p>

      <h2>Per quanto tempo</h2>
      <ul>
        <li>Dati di navigazione: per il tempo strettamente necessario alla sicurezza del servizio.</li>
        <li>Dati di Google Analytics: 14 mesi.</li>
        <li>Scelta sui cookie: 6 mesi, poi ti chiediamo di nuovo.</li>
        <li>Voti: per la durata della stagione sportiva di riferimento.</li>
      </ul>

      <h2>I tuoi diritti</h2>
      <p>
        Puoi chiedere in qualsiasi momento l&apos;accesso ai tuoi dati, la rettifica, la cancellazione, la limitazione del
        trattamento, la portabilità e opporti al trattamento (artt. 15-22 GDPR), scrivendo a <LegalContact />. Puoi revocare il
        consenso ai cookie dalle <strong>Preferenze cookie</strong> in fondo a ogni pagina. Hai inoltre diritto di proporre reclamo al{" "}
        <a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer">Garante per la protezione dei dati personali</a>.
      </p>

      <h2>Cookie</h2>
      <p>
        Per i dettagli sui cookie utilizzati consulta la <Link href="/cookie-policy">Cookie Policy</Link>.
      </p>
    </LegalPage>
  );
}
