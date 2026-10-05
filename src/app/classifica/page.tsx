import { permanentRedirect } from "next/navigation";

// Le classifiche sono nelle pagine delle singole competizioni
export default function ClassificaPage() {
  permanentRedirect("/competizioni");
}
