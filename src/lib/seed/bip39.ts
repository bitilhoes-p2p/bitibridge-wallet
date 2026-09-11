// BIP39 — conversão entre ENTROPIA e as 12 palavras, e a volta.
//
// Este arquivo é o coração auditável da carteira: é aqui que os bits aleatórios
// viram a frase que o usuário anota no papel. Ele é propositalmente pequeno e
// SEM NENHUMA DEPENDÊNCIA — o SHA-256 vem do WebCrypto, que já existe no
// navegador. Quem quiser conferir lê as ~100 linhas abaixo e compara com a
// especificação: https://github.com/bitcoin/bips/blob/master/bip-0039/mediawiki
//
// A regra, em uma frase: pega-se a entropia (128 bits = 12 palavras), acrescenta-se
// um checksum de entropia/32 bits vindo do SHA-256 dela, e o resultado é fatiado em
// grupos de 11 bits — cada grupo é o índice de uma palavra na lista oficial.
//
// Onde a ENTROPIA nasce é outro arquivo, de propósito: entropy.ts.

import { BIP39_ENGLISH } from "./wordlist";

/** Tamanhos de entropia aceitos pelo BIP39, em bits. 128 → 12 palavras. */
export const ALLOWED_ENTROPY_BITS = [128, 160, 192, 224, 256] as const;

export class Bip39Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Bip39Error";
  }
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return new Uint8Array(digest);
}

function toBitString(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(2).padStart(8, "0");
  return out;
}

/**
 * Converte a entropia nas palavras do BIP39.
 *
 * Lança para qualquer tamanho fora do padrão — nunca "arruma" silenciosamente uma
 * entropia curta, porque isso reduziria a segurança da seed sem o usuário perceber.
 */
export async function entropyToMnemonic(entropy: Uint8Array): Promise<string> {
  const bits = entropy.length * 8;
  if (!(ALLOWED_ENTROPY_BITS as readonly number[]).includes(bits)) {
    throw new Bip39Error(`Entropia de ${bits} bits não é válida no BIP39`);
  }

  const checksumBits = bits / 32;
  const checksum = toBitString(await sha256(entropy)).slice(0, checksumBits);
  const allBits = toBitString(entropy) + checksum;

  const words: string[] = [];
  for (let i = 0; i < allBits.length; i += 11) {
    words.push(BIP39_ENGLISH[parseInt(allBits.slice(i, i + 11), 2)]);
  }
  return words.join(" ");
}

/**
 * Caminho inverso: das palavras de volta à entropia, CONFERINDO o checksum.
 *
 * É o que valida a frase digitada na restauração: uma palavra trocada de lugar
 * quase sempre quebra o checksum, e aí a carteira avisa em vez de abrir uma
 * carteira vazia e diferente — que é como o usuário "perde" fundos sem erro aparente.
 */
export async function mnemonicToEntropy(mnemonic: string): Promise<Uint8Array> {
  const words = mnemonic.trim().toLowerCase().split(/\s+/);
  if (words.length < 12 || words.length > 24 || words.length % 3 !== 0) {
    throw new Bip39Error("A frase precisa ter 12, 15, 18, 21 ou 24 palavras");
  }

  let bits = "";
  for (const word of words) {
    const index = BIP39_ENGLISH.indexOf(word);
    if (index < 0) {
      throw new Bip39Error(`Palavra fora da lista oficial do BIP39: "${word}"`);
    }
    bits += index.toString(2).padStart(11, "0");
  }

  const checksumLength = bits.length / 33;
  const entropyLength = bits.length - checksumLength;
  const entropy = new Uint8Array(entropyLength / 8);
  for (let i = 0; i < entropy.length; i++) {
    entropy[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }

  const expected = toBitString(await sha256(entropy)).slice(0, checksumLength);
  if (bits.slice(entropyLength) !== expected) {
    throw new Bip39Error(
      "Checksum inválido — confira as palavras, alguma está errada ou fora de ordem",
    );
  }
  return entropy;
}

/** `true` quando a frase é válida (palavras conhecidas e checksum fechando). */
export async function isValidMnemonic(mnemonic: string): Promise<boolean> {
  try {
    await mnemonicToEntropy(mnemonic);
    return true;
  } catch {
    return false;
  }
}
