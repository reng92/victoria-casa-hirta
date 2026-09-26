import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LegalContact } from "@/components/LegalPage";
import CookieSettingsButton from "@/components/consent/CookieSettingsButton";
import { legal } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cookie Policy · Victoria Casa Hirta",
  description: "Informativa sui cookie del sito victoriacasahirta.it",
};

export default function CookiePolicyPage() {
  return (
    <LegalPage title="Cookie Policy">
      <p>
        I cookie sono piccoli file che un sito salva sul tuo dispositivo. Su <strong>{legal.site}</strong> usiamo solo cookie
        tecnici, necessari al funzionamento, e, <strong>solo se lo accetti</strong>, cookie statistici e contenuti di terze parti.
        Prima della tua scelta nessun cookie non tecnico viene installato.
      </p>

      <p>
        <CookieSettingsButton className="tap rounded-full bg-accent text-white text-sm font-semibold px-4 py-2 hover:brightness-110" />
      </p>

      <h2>Cookie necessari</h2>
      <p>Non richiedono consenso perché servono a far funzionare il sito.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Scopo</th><th>Durata</th></tr></thead>
          <tbody>
            <tr><td>vch-consent</td><td>Ricorda le tue scelte sui cookie</td><td>6 mesi</td></tr>
            <tr><td>vch-theme (memoria locale)</td><td>Ricorda il tema chiaro o scuro</td><td>Fino a cancellazione</td></tr>
            <tr><td>sb-* / vch-admin</td><td>Accesso all&apos;area riservata, solo per gli amministratori</td><td>Sessione di accesso</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Cookie statistici</h2>
      <p>
        Attivi solo con il tuo consenso. Usiamo <strong>Google Analytics 4</strong> (Google Ireland Ltd.) per statistiche aggregate
        sulle visite; non usiamo i dati per pubblicità e le funzioni pubblicitarie di Google sono disattivate.{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Privacy di Google</a>.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>Scopo</th><th>Durata</th></tr></thead>
          <tbody>
            <tr><td>_ga</td><td>Distingue i visitatori in forma anonima</td><td>2 anni</td></tr>
            <tr><td>_ga_*</td><td>Mantiene lo stato della sessione di visita</td><td>2 anni</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Contenuti esterni</h2>
      <p>
        Attivi solo con il tuo consenso. Nelle pagine delle partite possono esserci video di <strong>Instagram</strong> (Meta
        Platforms Ireland Ltd.) e mappe di <strong>Google Maps</strong> (Google Ireland Ltd.). Finché non li accetti al loro posto
        vedi un segnaposto e nessuna richiesta parte verso questi servizi. Se li accetti, i fornitori possono installare i propri
        cookie secondo le loro informative:{" "}
        <a href="https://privacycenter.instagram.com/policy" target="_blank" rel="noopener noreferrer">Instagram</a>,{" "}
        <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener noreferrer">Google</a>.
      </p>

      <h2>Come gestire le tue scelte</h2>
      <ul>
        <li>Dal banner puoi accettare tutto, rifiutare tutto o scegliere per categoria; chiudendolo con la X rifiuti i cookie non necessari.</li>
        <li>Puoi cambiare idea quando vuoi da <strong>Preferenze cookie</strong>, in fondo a ogni pagina.</li>
        <li>La scelta vale 6 mesi, poi ti viene richiesta di nuovo.</li>
        <li>Puoi anche cancellare o bloccare i cookie dalle impostazioni del browser.</li>
      </ul>

      <h2>Contatti</h2>
      <p>
        Titolare del trattamento: {legal.owner}. Per domande scrivi a <LegalContact />. Maggiori informazioni nella{" "}
        <Link href="/privacy-policy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
