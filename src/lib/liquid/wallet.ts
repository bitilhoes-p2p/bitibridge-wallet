// A carteira falando com a rede Liquid.
//
// Usa o `lwk_wasm`, que é a Liquid Wallet Kit da Blockstream compilada para
// navegador — a MESMA biblioteca usada por carteiras de mesa e pelo hardware
// Jade. Aqui ela roda inteira dentro do navegador do usuário: a seed nunca sai
// do aparelho, e o servidor do indexador só vê perguntas sobre endereços.
//
// O módulo tem ~9,5 MB, então é carregado SOB DEMANDA (`import()` dinâmico) e só
// quando o usuário de fato abre a carteira. Quem está na tela de criação não
// paga esse download.

import { depixCentsToUnits } from "./amounts";
import { DEPIX_ASSET_ID } from "./assets";

/**
 * Servidor que responde "quais moedas pertencem a estes endereços".
 *
 * Hoje aponta para o Esplora público da Blockstream. Trocar para o indexador
 * próprio, rodando ao lado do nó Elements da BitiBridge, é mudar ESTA LINHA —
 * e liberar o novo endereço em `connect-src`, no nginx.conf.
 */
export const ESPLORA_URL = "https://blockstream.info/liquid/api";

/** Quantas requisições simultâneas ao indexador durante a varredura. */
const SCAN_CONCURRENCY = 4;

type Lwk = typeof import("lwk_wasm");

let lwkModule: Promise<Lwk> | null = null;

/** Carrega o WebAssembly uma única vez, na primeira necessidade. */
export function loadLwk(): Promise<Lwk> {
  lwkModule ??= import("lwk_wasm");
  return lwkModule;
}


/** Endereço de destino inválido, de outra rede, ou ilegível. */
export class InvalidAddressError extends Error {
  constructor() {
    super("Endereço de destino inválido");
    this.name = "InvalidAddressError";
  }
}

/** Não há DePix suficiente para o valor pedido. */
export class InsufficientDepixError extends Error {
  constructor() {
    super("Saldo de DePix insuficiente");
    this.name = "InsufficientDepixError";
  }
}

/**
 * Não há L-BTC para pagar a taxa da rede.
 *
 * É o caso mais comum e o mais confuso para quem não conhece a Liquid: a pessoa
 * tem DePix, vê o saldo na tela, e mesmo assim não consegue enviar. A tela
 * precisa explicar isso, não mostrar "fundos insuficientes".
 */
export class NoLbtcError extends Error {
  constructor() {
    super("Sem L-BTC para a taxa de rede");
    this.name = "NoLbtcError";
  }
}

/** Envio montado e conferido, esperando a confirmação do usuário. */
export interface PreparedSend {
  /** Destino, como o usuário digitou. */
  toAddress: string;
  /** Valor em centavos de DePix. */
  cents: number;
  /** Taxa da rede, em satoshis de L-BTC. */
  feeSats: number;
  /** A transação montada, ainda NÃO assinada. */
  pset: unknown;
}

export interface WalletBalance {
  /** Saldo de DePix, em centavos (1 DePix = 1 real = 100 centavos). */
  depixCents: number;
  /** Saldo de L-BTC, em satoshis. */
  lbtcSats: number;
  /** Todos os ativos encontrados, por id — para diagnóstico. */
  raw: Record<string, number>;
}

export interface LiquidWallet {
  /** Endereço confidencial novo para receber. */
  receiveAddress(): Promise<{ address: string; index: number }>;
  /** Varre a rede e devolve o saldo atualizado. */
  sync(): Promise<WalletBalance>;
  /** O descritor da carteira. NUNCA enviar isto a servidor nosso. */
  descriptor(): string;
  /** Monta o envio e devolve o que será assinado, para o usuário conferir. */
  prepareSend(toAddress: string, cents: number): Promise<PreparedSend>;
  /** Assina, finaliza e transmite. Devolve o identificador da transação. */
  confirmSend(prepared: PreparedSend): Promise<string>;
}

/**
 * Abre a carteira Liquid a partir das 12 palavras.
 *
 * Usa o descritor singlesig padrão (`wpkh` + blinding SLIP-77), que é o mesmo
 * das outras carteiras Liquid — é isto que faz a mesma frase abrir a mesma
 * carteira no Green, no SideSwap ou no Jade.
 */
export async function openLiquidWallet(mnemonic: string): Promise<LiquidWallet> {
  const lwk = await loadLwk();
  const network = lwk.Network.mainnet();
  const signer = new lwk.Signer(new lwk.Mnemonic(mnemonic), network);
  const descriptor = signer.wpkhSlip77Descriptor();
  const wollet = new lwk.Wollet(network, descriptor);
  const client = new lwk.EsploraClient(
    network,
    ESPLORA_URL,
    false, // waterfalls: o Esplora público não fala esse protocolo
    SCAN_CONCURRENCY,
    false, // utxo_only: queremos o histórico, não só as moedas
  );

  return {
    descriptor: () => descriptor.toString(),

    async receiveAddress() {
      const result = wollet.address(null);
      return { address: result.address().toString(), index: result.index() };
    },

    async sync() {
      const update = await scanWithRetry(client, wollet);
      if (update !== undefined) wollet.applyUpdate(update);
      return readBalance(wollet.balance(), network.policyAsset().toString());
    },

    async prepareSend(toAddress: string, cents: number): Promise<PreparedSend> {
      // As três conferências abaixo existem para o usuário receber um motivo em
      // vez de "fundos insuficientes", que é o que a biblioteca diria.
      let address: InstanceType<Lwk["Address"]>;
      try {
        address = lwk.Address.parse(toAddress.trim(), network);
      } catch {
        throw new InvalidAddressError();
      }
      if (!address.isMainnet()) throw new InvalidAddressError();

      const balance = readBalance(
        wollet.balance(),
        network.policyAsset().toString(),
      );
      if (balance.depixCents < cents) throw new InsufficientDepixError();
      // A taxa da rede Liquid é paga SEMPRE em L-BTC, mesmo enviando DePix.
      if (balance.lbtcSats <= 0) throw new NoLbtcError();

      const pset = network
        .txBuilder()
        .addRecipient(
          address,
          depixCentsToUnits(cents),
          new lwk.AssetId(DEPIX_ASSET_ID),
        )
        .finish(wollet);

      // Lê da transação MONTADA quanto ela realmente cobra — não de estimativa.
      const feeSats = Number(wollet.psetDetails(pset).balance().fee());

      return { toAddress: toAddress.trim(), cents, feeSats, pset };
    },

    async confirmSend(prepared: PreparedSend): Promise<string> {
      const signed = signer.sign(prepared.pset as InstanceType<Lwk["Pset"]>);
      const finalized = wollet.finalize(signed);
      // SEM retentativa aqui, ao contrário da varredura: repetir uma transmissão
      // pode fazer o cliente pagar duas vezes. Falhou, o usuário decide.
      const txid = await client.broadcast(finalized);
      return txid.toString();
    },
  };
}


/** Quantas vezes insistir na varredura antes de desistir. */
export const SCAN_ATTEMPTS = 4;

/** Espera base entre tentativas. Dobra a cada falha. */
export const SCAN_RETRY_BASE_MS = 1500;

/** Espera quando o servidor responde "requisições demais". */
export const SCAN_RATE_LIMIT_MS = 8000;

/** `true` quando o erro indica bloqueio por excesso de requisições. */
export function isRateLimited(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("429") || /too many requests/i.test(message);
}

/**
 * Quanto esperar antes da próxima tentativa.
 *
 * Dois motivos de falha, dois comportamentos:
 *
 *   - servidor se contradizendo (anuncia um bloco e devolve 404 para ele):
 *     resolve em segundos, então espera curta, dobrando a cada vez;
 *   - bloqueio por excesso de requisições (429): insistir rápido PIORA, porque
 *     cada tentativa conta contra o limite. Espera bem mais longa.
 *
 * Verificado em 2026-09-11: o Esplora público faz as duas coisas. Uma carteira
 * com histórico dispara centenas de consultas numa varredura e é bloqueada.
 */
export function retryDelayMs(attempt: number, error: unknown): number {
  if (isRateLimited(error)) return SCAN_RATE_LIMIT_MS * attempt;
  return SCAN_RETRY_BASE_MS * 2 ** (attempt - 1);
}

/**
 * Varre a rede, insistindo quando o servidor falha de forma passageira.
 *
 * Repetir e SEGURO aqui porque a varredura so LE. Transmitir transacao NUNCA
 * entra nesta funcao: repetir um envio pagaria duas vezes.
 */
async function scanWithRetry(
  client: { fullScan(w: unknown): Promise<unknown> },
  wollet: unknown,
): Promise<any> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= SCAN_ATTEMPTS; attempt++) {
    try {
      return await client.fullScan(wollet);
    } catch (error) {
      lastError = error;
      if (attempt < SCAN_ATTEMPTS) {
        const delay = retryDelayMs(attempt, error);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Traduz o saldo devolvido pela biblioteca.
 *
 * O formato exato varia conforme a versão, então aceitamos Map, lista de pares
 * ou objeto simples — melhor tolerar a forma do que quebrar a tela por causa de
 * uma mudança de empacotamento.
 */
export function readBalance(balance: unknown, policyAsset: string): WalletBalance {
  const raw: Record<string, number> = {};
  const source = (balance as { toJSON?: () => unknown })?.toJSON?.() ?? balance;

  if (source instanceof Map) {
    for (const [key, value] of source) raw[String(key)] = Number(value);
  } else if (Array.isArray(source)) {
    for (const [key, value] of source as Array<[unknown, unknown]>) {
      raw[String(key)] = Number(value);
    }
  } else if (source && typeof source === "object") {
    for (const [key, value] of Object.entries(source)) raw[key] = Number(value);
  }

  return {
    // 1 DePix equivale a R$ 1,00 e tem 8 casas na rede, mas a Eulen emite com
    // precisão de centavo: o valor em satoshi dividido por 1.000.000 dá centavos.
    depixCents: Math.round((raw[DEPIX_ASSET_ID] ?? 0) / 1_000_000),
    lbtcSats: raw[policyAsset] ?? 0,
    raw,
  };
}
