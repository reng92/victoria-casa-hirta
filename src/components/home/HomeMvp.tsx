import MvpOfMonth from "@/components/MvpOfMonth";
import Reveal from "@/components/ui/Reveal";
import { featuredPoll, getMvpPolls } from "@/lib/mvp-data";
import { pollStatus } from "@/lib/mvp";

/** Giorni in cui il vincitore resta in home dopo la chiusura delle votazioni. */
const WINNER_DAYS = 10;

/** Votazione MVP in corso o in arrivo; il riquadro della griglia sparisce se non c'è. */
export default async function HomeMvp({ index, className }: { index: number; className: string }) {
  const now = Date.now();
  const poll = featuredPoll(await getMvpPolls(), now);
  if (!poll) return null;
  if (pollStatus(poll, now) === "closed" && now - Date.parse(poll.closes_at) > WINNER_DAYS * 86400000) return null;
  return (
    <Reveal index={index} className={className}>
      <MvpOfMonth poll={poll} renderedAt={now} compact />
    </Reveal>
  );
}
