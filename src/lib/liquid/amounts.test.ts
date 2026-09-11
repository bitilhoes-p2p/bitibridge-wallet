import { describe, expect, it } from "vitest";

import {
  depixCentsToUnits,
  depixUnitsToCents,
  formatBrl,
  parseBrlToCents,
} from "./amounts";

describe("conversão entre reais e unidades da rede", () => {
  it("um real são cem milhões de unidades", () => {
    // Mesmo fator usado pelo backend em produção nas operações de saque.
    expect(depixCentsToUnits(100)).toBe(100_000_000n);
    expect(depixUnitsToCents(100_000_000)).toBe(100);
  });

  it("um centavo é um milhão de unidades", () => {
    expect(depixCentsToUnits(1)).toBe(1_000_000n);
    expect(depixUnitsToCents(1_000_000)).toBe(1);
  });

  it("ida e volta não perde valor", () => {
    for (const cents of [1, 7, 99, 100, 523, 10_000, 599_999]) {
      expect(depixUnitsToCents(Number(depixCentsToUnits(cents)))).toBe(cents);
    }
  });
});

describe("leitura do valor digitado", () => {
  it("aceita vírgula e ponto", () => {
    expect(parseBrlToCents("10")).toBe(1000);
    expect(parseBrlToCents("10,50")).toBe(1050);
    expect(parseBrlToCents("10.50")).toBe(1050);
    expect(parseBrlToCents(" 0,01 ")).toBe(1);
  });

  it("recusa o que não é valor legível, em vez de adivinhar", () => {
    // Adivinhar valor em transferência de dinheiro é como se perde dinheiro.
    expect(parseBrlToCents("")).toBeNull();
    expect(parseBrlToCents("abc")).toBeNull();
    expect(parseBrlToCents("-5")).toBeNull();
    expect(parseBrlToCents("0")).toBeNull();
    expect(parseBrlToCents("0,00")).toBeNull();
    expect(parseBrlToCents("10,999")).toBeNull();
    expect(parseBrlToCents("1.2.3")).toBeNull();
    expect(parseBrlToCents("R$ 10")).toBeNull();
  });
});

describe("formatação", () => {
  it("mostra como moeda brasileira", () => {
    expect(formatBrl(1050).replace(/ /g, " ")).toBe("R$ 10,50");
    expect(formatBrl(0).replace(/ /g, " ")).toBe("R$ 0,00");
  });
});
