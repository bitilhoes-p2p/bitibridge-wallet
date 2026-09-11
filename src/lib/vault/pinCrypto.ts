// Criptografia da seed em repouso, amarrada ao PIN do usuário.
//
// A seed NÃO fica em claro em lugar nenhum. Ela é cifrada com uma chave derivada
// do PIN, e só o resultado cifrado vai para o armazenamento do navegador.
//
// Sem dependência nenhuma: PBKDF2 e AES-GCM vêm do WebCrypto, que já existe em
// todo navegador moderno e é implementado pelo próprio navegador, não por
// JavaScript que a gente escreveu.
//
// Sendo honesto sobre o limite, porque isso importa mais aqui do que num
// aplicativo instalado: um PIN de 6 dígitos tem só um milhão de combinações, e no
// navegador não existe cofre de hardware para segurar as tentativas. O PBKDF2
// abaixo encarece cada tentativa, e o limite de tentativas do SeedVault ajuda —
// mas quem garante o dinheiro continuam sendo as 12 palavras no papel. Por isso a
// tela avisa para não guardar valor alto aqui.

/** Custo da derivação do PIN. Valor recomendado pela OWASP para PBKDF2-SHA256. */
export const PBKDF2_ITERATIONS = 210_000;

/** Tamanho do sal, em bytes. Novo a cada gravação. */
export const SALT_BYTES = 16;

/** Tamanho do vetor de inicialização do AES-GCM, em bytes. Novo a cada gravação. */
export const IV_BYTES = 12;

export class WrongPinError extends Error {
  constructor() {
    // Não distingue "PIN errado" de "dado corrompido" de propósito: qualquer
    // diferença vira informação para quem ataca.
    super("PIN incorreto");
    this.name = "WrongPinError";
  }
}

export interface EncryptedSeed {
  salt: Uint8Array;
  iv: Uint8Array;
  cipherText: Uint8Array;
}

const toBase64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));

const fromBase64 = (text: string): Uint8Array =>
  Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

/** Serializa em uma linha só, para caber em armazenamento de chave/valor. */
export const encodeEncryptedSeed = (seed: EncryptedSeed): string =>
  [toBase64(seed.salt), toBase64(seed.iv), toBase64(seed.cipherText)].join(".");

export function decodeEncryptedSeed(raw: string): EncryptedSeed {
  const parts = raw.split(".");
  if (parts.length !== 3) throw new Error("Blob da seed corrompido");
  return {
    salt: fromBase64(parts[0]),
    iv: fromBase64(parts[1]),
    cipherText: fromBase64(parts[2]),
  };
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Cifra a frase de 12 palavras com uma chave derivada do PIN.
 *
 * Gera sal e IV novos a cada chamada — reusar qualquer um dos dois em AES-GCM
 * quebra a confidencialidade, então eles NUNCA são fixos nem reaproveitados.
 */
export async function encryptSeedWithPin(
  mnemonic: string,
  pin: string,
): Promise<EncryptedSeed> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(pin, salt);
  const cipherText = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      new TextEncoder().encode(mnemonic),
    ),
  );
  return { salt, iv, cipherText };
}

/**
 * Abre o blob com o PIN. Lança [WrongPinError] se o PIN não for o certo.
 *
 * A verificação é feita pela autenticação do AES-GCM: PIN errado gera chave
 * errada, a verificação falha e a decifragem é recusada. Não existe "senha
 * guardada" para comparar — não há o que vazar.
 */
export async function decryptSeedWithPin(
  seed: EncryptedSeed,
  pin: string,
): Promise<string> {
  const key = await deriveKey(pin, seed.salt);
  try {
    const clear = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: seed.iv as BufferSource },
      key,
      seed.cipherText as BufferSource,
    );
    return new TextDecoder().decode(clear);
  } catch {
    throw new WrongPinError();
  }
}
