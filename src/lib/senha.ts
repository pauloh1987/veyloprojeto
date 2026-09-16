import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const TAMANHO_CHAVE = 64;

export function hashSenha(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, salt, TAMANHO_CHAVE).toString("hex");
  return `${salt}:${hash}`;
}

export function verificarSenha(senha: string, senhaHash: string): boolean {
  const [salt, hashArmazenado] = senhaHash.split(":");
  if (!salt || !hashArmazenado) return false;

  const calculado = scryptSync(senha, salt, TAMANHO_CHAVE);
  const armazenado = Buffer.from(hashArmazenado, "hex");
  if (calculado.length !== armazenado.length) return false;

  return timingSafeEqual(calculado, armazenado);
}
