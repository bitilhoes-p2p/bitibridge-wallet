import { describe, expect, it } from "vitest";

import {
  decodeEncryptedSeed,
  decryptSeedWithPin,
  encodeEncryptedSeed,
  encryptSeedWithPin,
  WrongPinError,
} from "./pinCrypto";

const FRASE =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

describe("seed cifrada pelo PIN", () => {
  it("o PIN certo devolve exatamente a mesma frase", async () => {
    const blob = await encryptSeedWithPin(FRASE, "123456");
    expect(await decryptSeedWithPin(blob, "123456")).toBe(FRASE);
  });

  it("PIN errado NÃO abre", async () => {
    const blob = await encryptSeedWithPin(FRASE, "123456");
    await expect(decryptSeedWithPin(blob, "123457")).rejects.toBeInstanceOf(WrongPinError);
  });

  it("a frase não aparece em claro no que é gravado", async () => {
    const gravado = encodeEncryptedSeed(await encryptSeedWithPin(FRASE, "123456"));
    expect(gravado).not.toContain("abandon");
    expect(gravado).not.toContain("about");
  });

  it("sal e IV nunca se repetem entre gravações", async () => {
    const a = await encryptSeedWithPin(FRASE, "123456");
    const b = await encryptSeedWithPin(FRASE, "123456");
    expect(a.salt).not.toEqual(b.salt);
    expect(a.iv).not.toEqual(b.iv);
    // mesma frase, mesmo PIN, cifra diferente — é o esperado
    expect(a.cipherText).not.toEqual(b.cipherText);
  });

  it("serializa e volta sem perder nada", async () => {
    const blob = await encryptSeedWithPin(FRASE, "999999");
    const volta = decodeEncryptedSeed(encodeEncryptedSeed(blob));
    expect(await decryptSeedWithPin(volta, "999999")).toBe(FRASE);
  });

  it("blob corrompido é recusado", () => {
    expect(() => decodeEncryptedSeed("lixo")).toThrow();
  });
});
