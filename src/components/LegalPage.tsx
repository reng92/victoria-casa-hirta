import PageHeader from "@/components/ui/PageHeader";
import { legal } from "@/lib/legal";

/** Impaginazione comune di Privacy Policy e Cookie Policy. */
export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
      <PageHeader title={title} subtitle={`Ultimo aggiornamento: ${legal.updated}`} />
      <article className="bento-card p-5 md:p-8 legal-prose">{children}</article>
    </div>
  );
}

/** Come contattare il titolare: email se impostata, altrimenti i social ufficiali. */
export function LegalContact() {
  if (legal.email) {
    return (
      <a href={`mailto:${legal.email}`}>{legal.email}</a>
    );
  }
  return (
    <>
      un messaggio ai canali ufficiali{" "}
      <a href={legal.facebook} target="_blank" rel="noopener noreferrer">Facebook</a> e{" "}
      <a href={legal.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
    </>
  );
}
