// Envio de DePix para outra carteira.
//
// Duas travas de produto aqui, e as duas existem porque dinheiro enviado na rede
// NÃO volta:
//   1. sem L-BTC o envio é bloqueado ANTES de a pessoa digitar o valor, com a
//      explicação do porquê — não com "fundos insuficientes";
//   2. nada é transmitido sem uma tela de conferência em que o usuário vê o
//      destino, o valor e a taxa que ele vai realmente pagar.

import { useState } from "react";

import { formatBrl, parseBrlToCents } from "../lib/liquid/amounts";
import {
  InsufficientDepixError,
  InvalidAddressError,
  NoLbtcError,
  type LiquidWallet,
  type PreparedSend,
  type WalletBalance,
} from "../lib/liquid/wallet";

type Stage =
  | { name: "form" }
  | { name: "review"; prepared: PreparedSend }
  | { name: "sending" }
  | { name: "sent"; txid: string };

const lbtc = (sats: number): string =>
  (sats / 100_000_000).toLocaleString("pt-BR", {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  });

export function Send({
  wallet,
  balance,
  onDone,
  onBack,
}: {
  wallet: LiquidWallet;
  balance: WalletBalance;
  onDone: () => void;
  onBack: () => void;
}) {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>({ name: "form" });

  // Sem L-BTC não existe envio possível — e o motivo precisa vir antes do
  // esforço de preencher o formulário.
  if (balance.lbtcSats <= 0) {
    return (
      <div className="shell">
        <h2>Enviar DePix</h2>
        <div className="card warn">
          <p className="tight">
            Toda transação na rede Liquid paga uma pequena taxa em L-BTC, mesmo
            quando você envia DePix. Você não tem L-BTC nesta carteira.
          </p>
          <p className="muted tight-top">
            Seu DePix continua guardado em segurança — só o envio fica parado até
            você ter um pouco de L-BTC. Basta uma quantia mínima, que dá para
            muitas transações.
          </p>
        </div>
        <button className="ghost" onClick={onBack}>
          Voltar
        </button>
      </div>
    );
  }

  const review = async () => {
    const cents = parseBrlToCents(amount);
    if (cents === null) {
      setError("Digite um valor válido, como 10,50.");
      return;
    }
    if (address.trim().length === 0) {
      setError("Cole o endereço de quem vai receber.");
      return;
    }
    setError(null);
    try {
      const prepared = await wallet.prepareSend(address, cents);
      setStage({ name: "review", prepared });
    } catch (e) {
      if (e instanceof InvalidAddressError) {
        setError(
          "Esse endereço não é válido para a rede Liquid. Confira se copiou inteiro.",
        );
      } else if (e instanceof InsufficientDepixError) {
        setError(
          `Você tem ${formatBrl(balance.depixCents)} e está tentando enviar mais que isso.`,
        );
      } else if (e instanceof NoLbtcError) {
        setError("Sem L-BTC para pagar a taxa da rede.");
      } else {
        setError(e instanceof Error ? e.message : "Não consegui montar o envio.");
      }
    }
  };

  const confirm = async () => {
    if (stage.name !== "review") return;
    const { prepared } = stage;
    setStage({ name: "sending" });
    try {
      const txid = await wallet.confirmSend(prepared);
      setStage({ name: "sent", txid });
    } catch (e) {
      setStage({ name: "form" });
      setError(
        e instanceof Error
          ? `Não consegui transmitir: ${e.message}`
          : "Não consegui transmitir a transação.",
      );
    }
  };

  if (stage.name === "sending") {
    return (
      <div className="shell">
        <h2>Enviando</h2>
        <p className="muted">
          Transmitindo para a rede. Não feche esta aba.
        </p>
      </div>
    );
  }

  if (stage.name === "sent") {
    return (
      <div className="shell">
        <h2>Enviado</h2>
        <div className="card">
          <p className="tight strong">A transação foi transmitida</p>
          <p className="muted tight-top">
            Ela costuma confirmar em cerca de um minuto. Identificador:
          </p>
          <p className="endereco">{stage.txid}</p>
        </div>
        <button className="primary" onClick={onDone}>
          Voltar para a carteira
        </button>
      </div>
    );
  }

  if (stage.name === "review") {
    const { prepared } = stage;
    return (
      <div className="shell">
        <h2>Confira antes de enviar</h2>
        <div className="card">
          <p className="tight muted">Valor</p>
          <p className="saldo">{formatBrl(prepared.cents)}</p>
          <p className="tight muted">Taxa da rede</p>
          <p className="tight">{lbtc(prepared.feeSats)} L-BTC</p>
        </div>
        <p className="muted">Para este endereço:</p>
        <div className="card">
          <p className="endereco">{prepared.toAddress}</p>
        </div>
        <div className="card warn">
          <p className="tight">
            Confira o endereço com calma. Transação enviada na rede não volta, e
            não existe cancelamento nem estorno.
          </p>
        </div>
        <button className="primary" onClick={confirm}>
          Confirmar e enviar
        </button>
        <button className="ghost" onClick={() => setStage({ name: "form" })}>
          Voltar e corrigir
        </button>
      </div>
    );
  }

  return (
    <div className="shell">
      <h2>Enviar DePix</h2>
      <p className="muted">
        Saldo disponível: {formatBrl(balance.depixCents)}
      </p>

      <label htmlFor="dest">Endereço de destino</label>
      <input
        id="dest"
        value={address}
        autoComplete="off"
        spellCheck={false}
        placeholder="lq1..."
        onChange={(e) => {
          setAddress(e.target.value);
          if (error) setError(null);
        }}
      />

      <label htmlFor="valor">Valor em reais</label>
      <input
        id="valor"
        value={amount}
        inputMode="decimal"
        placeholder="10,50"
        onChange={(e) => {
          setAmount(e.target.value);
          if (error) setError(null);
        }}
      />

      {error && <p className="danger">{error}</p>}

      <button className="primary" onClick={review}>
        Continuar
      </button>
      <button className="ghost" onClick={onBack}>
        Voltar
      </button>
    </div>
  );
}
