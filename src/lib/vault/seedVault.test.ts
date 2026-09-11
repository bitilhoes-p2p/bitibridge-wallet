import { describe, expect, it } from "vitest";

import { WrongPinError } from "./pinCrypto";
import { BrowserSeedVault, MAX_PIN_ATTEMPTS, type KeyValueStore } from "./seedVault";

const FRASE =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

/** localStorage de mentira — o teste roda sem navegador. */
class FakeStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe("cofre do navegador", () => {
  it("guarda e devolve a frase com o PIN certo", async () => {
    const vault = new BrowserSeedVault(new FakeStore());
    expect(await vault.hasSeed()).toBe(false);
    await vault.saveSeed(FRASE, "123456");
    expect(await vault.hasSeed()).toBe(true);
    expect(await vault.unlock("123456")).toBe(FRASE);
  });

  it("o que fica gravado NÃO contém a frase", async () => {
    const store = new FakeStore();
    await new BrowserSeedVault(store).saveSeed(FRASE, "123456");
    const tudo = [...store.data.values()].join(" ");
    expect(tudo).not.toContain("abandon");
  });

  it("PIN errado gasta tentativa", async () => {
    const vault = new BrowserSeedVault(new FakeStore());
    await vault.saveSeed(FRASE, "123456");
    await expect(vault.unlock("000000")).rejects.toBeInstanceOf(WrongPinError);
    expect(await vault.remainingAttempts()).toBe(MAX_PIN_ATTEMPTS - 1);
  });

  it("PIN certo zera o contador de tentativas", async () => {
    const vault = new BrowserSeedVault(new FakeStore());
    await vault.saveSeed(FRASE, "123456");
    await expect(vault.unlock("000000")).rejects.toBeInstanceOf(WrongPinError);
    await vault.unlock("123456");
    expect(await vault.remainingAttempts()).toBe(MAX_PIN_ATTEMPTS);
  });

  it("esgotar as tentativas apaga o cofre", async () => {
    const store = new FakeStore();
    const vault = new BrowserSeedVault(store);
    await vault.saveSeed(FRASE, "123456");
    for (let i = 0; i < MAX_PIN_ATTEMPTS; i++) {
      await expect(vault.unlock("000000")).rejects.toBeInstanceOf(WrongPinError);
    }
    expect(await vault.hasSeed()).toBe(false);
    expect(store.data.size).toBe(0);
  });

  it("abrir sem carteira guardada é erro, não PIN errado", async () => {
    const vault = new BrowserSeedVault(new FakeStore());
    await expect(vault.unlock("123456")).rejects.toThrow(/Nenhuma carteira/);
  });
});
