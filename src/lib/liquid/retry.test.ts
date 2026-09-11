// Travas do comportamento de retentativa.
//
// Verificado contra o servidor público em 2026-09-11: ele falha de DUAS formas
// diferentes, e tratar as duas igual é o que quebra a carteira do usuário.

import { describe, expect, it } from "vitest";

import {
  isRateLimited,
  retryDelayMs,
  SCAN_RATE_LIMIT_MS,
  SCAN_RETRY_BASE_MS,
} from "./wallet";

describe("bloqueio por excesso de requisições", () => {
  it("reconhece o 429 em qualquer forma que o servidor mande", () => {
    expect(isRateLimited(new Error("returned HTTP 429: rate limited"))).toBe(true);
    expect(isRateLimited(new Error("Too Many Requests"))).toBe(true);
    expect(isRateLimited("429")).toBe(true);
  });

  it("não confunde outros erros com bloqueio", () => {
    expect(isRateLimited(new Error("HTTP 404: Block not found"))).toBe(false);
    expect(isRateLimited(new Error("network error"))).toBe(false);
  });
});

describe("espera entre tentativas", () => {
  it("erro passageiro: espera curta, dobrando", () => {
    // O servidor se contradiz por segundos quando nasce um bloco novo.
    const erro = new Error("HTTP 404: Block not found");
    expect(retryDelayMs(1, erro)).toBe(SCAN_RETRY_BASE_MS);
    expect(retryDelayMs(2, erro)).toBe(SCAN_RETRY_BASE_MS * 2);
    expect(retryDelayMs(3, erro)).toBe(SCAN_RETRY_BASE_MS * 4);
  });

  it("bloqueio por excesso: espera MUITO maior", () => {
    // Insistir rápido num 429 piora: cada tentativa conta contra o limite.
    const erro = new Error("HTTP 429");
    expect(retryDelayMs(1, erro)).toBe(SCAN_RATE_LIMIT_MS);
    expect(retryDelayMs(1, erro)).toBeGreaterThan(retryDelayMs(3, new Error("404")));
  });

  it("a espera cresce a cada tentativa, nunca encolhe", () => {
    for (const erro of [new Error("404"), new Error("429")]) {
      expect(retryDelayMs(2, erro)).toBeGreaterThan(retryDelayMs(1, erro));
      expect(retryDelayMs(3, erro)).toBeGreaterThan(retryDelayMs(2, erro));
    }
  });
});
