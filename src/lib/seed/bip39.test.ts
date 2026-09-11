// Testes da geração das 12 palavras.
//
// Os oito vetores abaixo são os OFICIAIS do BIP39 (os de 128 bits do vectors.json
// da implementação de referência). Eles não são invenção nossa: qualquer carteira
// do mundo que implemente o padrão produz exatamente estas saídas para estas
// entradas. Se este teste passa, a nossa geração é compatível com Green, SideSwap,
// Ledger, Trezor e as demais — a mesma frase abre a mesma carteira em qualquer uma.

import { describe, expect, it } from "vitest";

import { entropyToMnemonic, isValidMnemonic, mnemonicToEntropy } from "./bip39";
import { generateEntropy, generateMnemonic } from "./entropy";
import { BIP39_ENGLISH } from "./wordlist";
// O proprio codigo-fonte, lido como texto pelo Vite: a trava abaixo confere que
// o gerador previsivel do JavaScript nao entrou no caminho da seed.
import entropySource from "./entropy.ts?raw";

const OFFICIAL_VECTORS: ReadonlyArray<readonly [string, string]> = [
  ["00000000000000000000000000000000", "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"],
  ["7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f", "legal winner thank year wave sausage worth useful legal winner thank yellow"],
  ["80808080808080808080808080808080", "letter advice cage absurd amount doctor acoustic avoid letter advice cage above"],
  ["ffffffffffffffffffffffffffffffff", "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong"],
  ["9e885d952ad362caeb4efe34a8e91bd2", "ozone drill grab fiber curtain grace pudding thank cruise elder eight picnic"],
  ["c0ba5a8e914111210f2bd131f3d5e08d", "scheme spot photo card baby mountain device kick cradle pact join borrow"],
  ["23db8160a31d3e0dca3688ed941adbf3", "cat swing flag economy stadium alone churn speed unique patch report train"],
  ["f30f8c1da665478f49b001d94c5fc452", "vessel ladder alter error federal sibling chat ability sun glass valve picture"],
];

const hex = (s: string): Uint8Array => {
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
};

const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

describe("lista oficial de palavras", () => {
  it("tem exatamente 2048 palavras, nas bordas certas", () => {
    expect(BIP39_ENGLISH.length).toBe(2048);
    expect(BIP39_ENGLISH[0]).toBe("abandon");
    expect(BIP39_ENGLISH[2047]).toBe("zoo");
  });

  it("é byte a byte a lista canônica do BIP39", async () => {
    // Trava anti-adulteração: uma única palavra trocada muda este hash, e uma
    // seed gerada com a lista errada não abre em nenhuma outra carteira.
    const joined = BIP39_ENGLISH.join("\n") + "\n";
    expect(await sha256Hex(joined)).toBe(
      "2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda",
    );
  });

  it("não tem palavra repetida", () => {
    expect(new Set(BIP39_ENGLISH).size).toBe(2048);
  });
});

describe("vetores oficiais do BIP39", () => {
  for (const [entropy, mnemonic] of OFFICIAL_VECTORS) {
    it(`entropia ${entropy} gera a frase esperada`, async () => {
      expect(await entropyToMnemonic(hex(entropy))).toBe(mnemonic);
    });

    it(`a frase de ${entropy} volta à mesma entropia`, async () => {
      expect(await mnemonicToEntropy(mnemonic)).toEqual(hex(entropy));
    });
  }
});

describe("frase inválida é recusada", () => {
  it("palavra fora da lista", async () => {
    expect(
      await isValidMnemonic(
        "bitibridge abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
      ),
    ).toBe(false);
  });

  it("checksum quebrado (última palavra trocada)", async () => {
    expect(
      await isValidMnemonic(
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abuse",
      ),
    ).toBe(false);
  });

  it("quantidade de palavras fora do padrão", async () => {
    expect(await isValidMnemonic("abandon abandon abandon")).toBe(false);
  });

  it("espaços extras e maiúsculas não invalidam uma frase correta", async () => {
    expect(
      await isValidMnemonic(
        "  ABANDON abandon  abandon abandon abandon abandon abandon abandon abandon abandon abandon ABOUT ",
      ),
    ).toBe(true);
  });
});

describe("geração de seed nova", () => {
  it("entropia padrão tem 128 bits", () => {
    expect(generateEntropy().length).toBe(16);
  });

  it("tamanho fora do padrão é recusado", () => {
    expect(() => generateEntropy(64)).toThrow();
    expect(() => generateEntropy(129)).toThrow();
  });

  it("gera 12 palavras válidas", async () => {
    const m = await generateMnemonic();
    expect(m.split(" ")).toHaveLength(12);
    expect(await isValidMnemonic(m)).toBe(true);
  });

  it("cinquenta seeds seguidas nunca se repetem", async () => {
    // Não prova aleatoriedade, mas pega o erro mais grave possível: uma semente
    // fixa entregando a MESMA carteira para todo mundo.
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) seen.add(await generateMnemonic());
    expect(seen.size).toBe(50);
  });

  it("nunca usa o gerador previsivel do JavaScript", async () => {
    const proibido = "Math" + ".random";
    // Trava de código: o gerador previsível do JavaScript não pode existir no
    // caminho da seed, nem por descuido numa refatoração futura.
    const fonte = entropySource;
    // Ignora as linhas de comentario: o proprio texto do arquivo CITA a funcao
    // proibida para explicar por que ela e proibida.
    const codigo = fonte
      .split("\n")
      .filter((linha: string) => !linha.trim().startsWith("//"))
      .join("\n");
    expect(codigo.includes(proibido)).toBe(false);
  });
});
