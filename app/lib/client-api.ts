export type PlayerMember = { id: string; firstName: string; lastName: string; email: string | null; mustChangePassword: boolean; avatarStyle: number; avatarColor: number };
export async function readResponse(response: Response): Promise<Record<string, any>> {
  const result = await response.json().catch(() => null) as Record<string, any> | null;
  if (!response.ok || !result) throw new Error(result?.error || "Operazione non completata. Riprova tra poco.");
  return result;
}
