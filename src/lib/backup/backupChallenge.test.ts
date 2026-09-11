import { describe, expect, it } from "vitest";

import {
  createBackupChallenge,
  isBackupAnswerCorrect,
  isBackupChallengeComplete,
} from "./backupChallenge";

const FRASE =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("sorteio das posições", () => {
  it("sorteia 3 posições distintas, em ordem", () => {
    for (let i = 0; i < 200; i++) {
      const c = createBackupChallenge(12);
      expect(c.positions).toHaveLength(3);
      expect(new Set(c.positions).size).toBe(3);
      expect([...c.positions].sort((a, b) => a - b)).toEqual([...c.positions]);
      expect(c.positions.every((p) => p >= 0 && p < 12)).toBe(true);
    }
  });

  it("não sorteia mais perguntas do que palavras", () => {
    expect(() => createBackupChallenge(2)).toThrow();
  });
});

describe("conferência das respostas", () => {
  it("aceita a palavra certa, com espaço e maiúscula", () => {
    expect(isBackupAnswerCorrect(FRASE, 11, "about")).toBe(true);
    expect(isBackupAnswerCorrect(FRASE, 11, "  ABOUT ")).toBe(true);
  });

  it("recusa palavra errada e posição fora da frase", () => {
    expect(isBackupAnswerCorrect(FRASE, 11, "abandon")).toBe(false);
    expect(isBackupAnswerCorrect(FRASE, 99, "about")).toBe(false);
    expect(isBackupAnswerCorrect(FRASE, -1, "abandon")).toBe(false);
  });

  it("só conclui quando TODAS as sorteadas estão certas", () => {
    const c = { positions: [0, 5, 11] as const };
    expect(
      isBackupChallengeComplete(
        FRASE,
        c,
        new Map([[0, "abandon"], [5, "abandon"], [11, "about"]]),
      ),
    ).toBe(true);
    expect(
      isBackupChallengeComplete(
        FRASE,
        c,
        new Map([[0, "abandon"], [5, "abandon"], [11, "abandon"]]),
      ),
    ).toBe(false);
    expect(isBackupChallengeComplete(FRASE, c, new Map([[0, "abandon"]]))).toBe(false);
  });
});
