import { currentMember } from "../../../lib/member-access";
import { reigningChampion } from "../../../lib/champion-service";
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request) {
  try {
    const member = await currentMember(request);
    if (!member) return reply({ error: "Accedi alla Gilda del Grifone" }, 401);
    if (member.mustChangePassword) return reply({ error: "Modifica prima la password temporanea" }, 403);
    return reply(await reigningChampion(member.id));
  } catch { return reply({ error: "Non riesco a verificare il campione in carica. Riprova tra poco." }, 503); }
}
