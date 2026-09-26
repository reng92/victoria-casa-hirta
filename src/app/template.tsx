/**
 * Rimontato a ogni navigazione: dà l'ingresso animato alle pagine
 * come nelle app native (vedi .page-enter in globals.css).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
