// Conversão entre o que o usuário vê e o que a rede entende.
//
// O DePix tem 8 casas decimais na Liquid, e 1 DePix vale R$ 1,00. Logo:
//   R$ 1,00  = 1,00000000 DePix = 100.000.000 unidades
//   R$ 0,01  = 0,01000000 DePix =   1.000.000 unidades
//
// Isto NÃO é suposição: é o mesmo fator usado pelo backend em produção, que
// envia ao nó `(centavos / 100).toFixed(8)` nas operações de saque.

/** Unidades da rede em um centavo de DePix. */
export const DEPIX_UNITS_PER_CENT = 1_000_000;

/** Converte unidades da rede para centavos. Arredonda para o centavo mais próximo. */
export const depixUnitsToCents = (units: number): number =>
  Math.round(units / DEPIX_UNITS_PER_CENT);

/** Converte centavos para unidades da rede. */
export const depixCentsToUnits = (cents: number): bigint =>
  BigInt(Math.round(cents)) * BigInt(DEPIX_UNITS_PER_CENT);

/**
 * Lê um valor digitado em reais e devolve centavos.
 *
 * Aceita "10", "10,50" e "10.50". Devolve `null` para qualquer coisa que não
 * seja um valor positivo legível — nunca "conserta" uma entrada duvidosa, porque
 * adivinhar valor em transferência de dinheiro é como se perde dinheiro.
 */
export function parseBrlToCents(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return cents > 0 ? cents : null;
}

/** Formata centavos como moeda brasileira. */
export const formatBrl = (cents: number): string =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
