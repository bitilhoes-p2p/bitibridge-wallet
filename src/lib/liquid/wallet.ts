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
  };
}


/** Quantas vezes insistir na varredura antes de desistir. */
export const SCAN_ATTEMPTS = 4;

/** Espera entre as tentativas, em milissegundos. */
export const SCAN_RETRY_DELAY_MS = 1500;

/**
 * Varre a rede, insistindo quando o servidor se contradiz.
 *
 * Motivo (verificado em 2026-09-11): o Esplora publico da Blockstream e servido
 * por varios nos que nao estao no mesmo bloco. Um deles anuncia "a rede esta no
 * bloco N" e o seguinte responde 404 para esse mesmo bloco N. Como a Liquid gera
 * um bloco por minuto, isso derruba a consulta com frequencia — e o usuario via
 * "nao consegui consultar a rede" num saldo que estava perfeitamente acessivel.
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
        await new Promise((resolve) => setTimeout(resolve, SCAN_RETRY_DELAY_MS));
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
