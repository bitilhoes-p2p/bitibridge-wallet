// Tela principal: saldo e endereço de recebimento, vindos da rede Liquid.
//
// A frase fica em memória enquanto a carteira está aberta — é ela que deriva as
// chaves e assina. Não é gravada em claro, não é enviada, e some quando a aba
// fecha. Fechar a aba e voltar exige o PIN de novo.

import { useEffect, useState } from "react";

import {
  openLiquidWallet,
  type LiquidWallet,
  type WalletBalance,
} from "../lib/liquid/wallet";

type State =
  | { name: "loading" }
  | { name: "ready"; balance: WalletBalance; address: string }
  | { name: "error"; message: string };

const brl = (cents: number): string =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const lbtc = (sats: number): string =>
  (sats / 100_000_000).toLocaleString("pt-BR", {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  });

export function Home({ mnemonic }: { mnemonic: string }) {
  const [state, setState] = useState<State>({ name: "loading" });
  const [wallet, setWallet] = useState<LiquidWallet | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const w = await openLiquidWallet(mnemonic);
        const [balance, receive] = await Promise.all([
          w.sync(),
          w.receiveAddress(),
        ]);
        if (cancelled) return;
        setWallet(w);
        setState({ name: "ready", balance, address: receive.address });
      } catch (error) {
        if (cancelled) return;
        // A mensagem do erro NUNCA inclui a frase — só o motivo técnico.
        setState({
          name: "error",
          message: error instanceof Error ? error.message : "Falha desconhecida",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mnemonic]);

  const refresh = async () => {
    if (!wallet || state.name !== "ready") return;
    setState({ name: "loading" });
    try {
      const balance = await wallet.sync();
      const receive = await wallet.receiveAddress();
      setState({ name: "ready", balance, address: receive.address });
    } catch (error) {
      setState({
        name: "error",
        message: error instanceof Error ? error.message : "Falha desconhecida",
      });
    }
  };

  const copy = async () => {
    if (state.name !== "ready") return;
    await navigator.clipboard.writeText(state.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (state.name === "loading") {
    return (
      <div className="shell">
        <h2>Carteira BitiBridge</h2>
        <p className="muted">
          Consultando a rede Liquid. Na primeira vez isso demora um pouco — o app
          baixa a biblioteca da carteira e varre a blockchain à procura das suas
          moedas.
        </p>
      </div>
    );
  }

  if (state.name === "error") {
    return (
      <div className="shell">
        <h2>Carteira BitiBridge</h2>
        <div className="card">
          <p className="tight strong">Não consegui consultar a rede</p>
          <p className="muted tight-top">{state.message}</p>
        </div>
        <p className="muted">
          Seu dinheiro não corre risco por causa disto: ele está na rede Liquid, e
          as suas 12 palavras continuam sendo o que dá acesso a ele.
        </p>
      </div>
    );
  }

  return (
    <div className="shell">
      <h2>Carteira BitiBridge</h2>

      <div className="card">
        <p className="tight muted">Saldo em DePix</p>
        <p className="saldo">{brl(state.balance.depixCents)}</p>
        <p className="tight muted">
          L-BTC para taxas de rede: {lbtc(state.balance.lbtcSats)}
        </p>
      </div>

      {state.balance.lbtcSats === 0 && (
        <div className="card warn">
          <p className="tight">
            Você não tem L-BTC. Toda transação na rede Liquid paga uma taxa
            mínima nessa moeda, mesmo quando você envia DePix. Sem ela, o seu
            DePix fica guardado em segurança, mas você não consegue enviá-lo.
          </p>
        </div>
      )}

      <h2>Receber</h2>
      <p className="muted">
        Use este endereço para receber DePix. Ele é novo a cada carteira e não
        revela o seu saldo para quem o vê.
      </p>
      <div className="card">
        <p className="endereco">{state.address}</p>
      </div>
      <button className="ghost" onClick={copy}>
        {copied ? "Endereço copiado" : "Copiar endereço"}
      </button>
      <button className="ghost" onClick={refresh}>
        Atualizar saldo
      </button>
    </div>
  );
}
