// O cofre: onde a seed cifrada mora no navegador.
//
// Contrato do projeto — vale para sempre:
//   - só entra aqui o blob CIFRADO (ver pinCrypto.ts), nunca a frase em claro;
//   - nada daqui sai para rede, log ou relatório de erro;
//   - a interface existe para que o teste rode sem navegador e para que o
//     armazenamento possa mudar sem mexer nas telas.

import {
  decodeEncryptedSeed,
  decryptSeedWithPin,
  encodeEncryptedSeed,
  encryptSeedWithPin,
  WrongPinError,
} from "./pinCrypto";

/**
 * Tentativas de PIN antes de o cofre se apagar.
 *
 * Apagar NÃO é perder o dinheiro: a carteira volta pelas 12 palavras. É o que
 * impede alguém com o navegador aberto de ficar tentando PIN à vontade.
 */
export const MAX_PIN_ATTEMPTS = 10;

export interface SeedVault {
  hasSeed(): Promise<boolean>;
  saveSeed(mnemonic: string, pin: string): Promise<void>;
  /** Devolve a frase. Lança WrongPinError quando o PIN não abre. */
  unlock(pin: string): Promise<string>;
  /** Apaga tudo. Só as 12 palavras trazem de volta. */
  wipe(): Promise<void>;
  remainingAttempts(): Promise<number>;
}

/** Armazenamento mínimo de chave/valor — o localStorage do navegador o satisfaz. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const SEED_KEY = "bitibridge.seed.v1";
const FAILS_KEY = "bitibridge.seed.fails.v1";

export class BrowserSeedVault implements SeedVault {
  constructor(private readonly store: KeyValueStore = localStorage) {}

  async hasSeed(): Promise<boolean> {
    return this.store.getItem(SEED_KEY) !== null;
  }

  async saveSeed(mnemonic: string, pin: string): Promise<void> {
    const blob = await encryptSeedWithPin(mnemonic, pin);
    this.store.setItem(SEED_KEY, encodeEncryptedSeed(blob));
    this.store.setItem(FAILS_KEY, "0");
  }

  async unlock(pin: string): Promise<string> {
    const raw = this.store.getItem(SEED_KEY);
    if (raw === null) throw new Error("Nenhuma carteira guardada neste navegador");
    try {
      const mnemonic = await decryptSeedWithPin(decodeEncryptedSeed(raw), pin);
      this.store.setItem(FAILS_KEY, "0");
      return mnemonic;
    } catch (error) {
      if (!(error instanceof WrongPinError)) throw error;
      const fails = this.readFails() + 1;
      if (fails >= MAX_PIN_ATTEMPTS) {
        await this.wipe();
      } else {
        this.store.setItem(FAILS_KEY, String(fails));
      }
      throw error;
    }
  }

  async wipe(): Promise<void> {
    this.store.removeItem(SEED_KEY);
    this.store.removeItem(FAILS_KEY);
  }

  async remainingAttempts(): Promise<number> {
    return MAX_PIN_ATTEMPTS - this.readFails();
  }

  private readFails(): number {
    const raw = this.store.getItem(FAILS_KEY);
    const parsed = raw === null ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
