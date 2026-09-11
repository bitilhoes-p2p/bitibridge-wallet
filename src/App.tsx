// Fluxo da carteira, como máquina de estados.
//
// Uma tela por etapa, e a seed em memória só entre a criação e a definição do
// PIN. Depois disso ela existe apenas cifrada, dentro do cofre.

import { useEffect, useState } from "react";

import {
  createBackupChallenge,
  isBackupChallengeComplete,
  type BackupChallenge,
} from "./lib/backup/backupChallenge";
import { isValidMnemonic } from "./lib/seed/bip39";
import { generateMnemonic } from "./lib/seed/entropy";
import { WrongPinError } from "./lib/vault/pinCrypto";
import type { SeedVault } from "./lib/vault/seedVault";
import { Home } from "./screens/Home";

type Step =
  | { name: "loading" }
  | { name: "welcome" }
  | { name: "showSeed"; mnemonic: string }
  | { name: "confirmBackup"; mnemonic: string }
  | { name: "setPin"; mnemonic: string }
  | { name: "restore" }
  | { name: "unlock" }
  | { name: "home"; mnemonic: string };

export function App({ vault }: { vault: SeedVault }) {
  const [step, setStep] = useState<Step>({ name: "loading" });

  useEffect(() => {
    // Já existe carteira neste navegador? Então a porta de entrada é o PIN, não a
    // criação — senão a pessoa criaria uma segunda carteira por engano e acharia
    // que "sumiu o dinheiro".
    void vault.hasSeed().then((exists) =>
      setStep(exists ? { name: "unlock" } : { name: "welcome" }),
    );
  }, [vault]);

  switch (step.name) {
    case "loading":
      return (
        <Shell>
          <p className="muted">Abrindo...</p>
        </Shell>
      );
    case "welcome":
      return (
        <Welcome
          onCreate={async () =>
            setStep({ name: "showSeed", mnemonic: await generateMnemonic() })
          }
          onRestore={() => setStep({ name: "restore" })}
        />
      );
    case "showSeed":
      return (
        <ShowSeed
          mnemonic={step.mnemonic}
          onNext={() => setStep({ name: "confirmBackup", mnemonic: step.mnemonic })}
        />
      );
    case "confirmBackup":
      return (
        <ConfirmBackup
          mnemonic={step.mnemonic}
          onDone={() => setStep({ name: "setPin", mnemonic: step.mnemonic })}
        />
      );
    case "setPin":
      return (
        <SetPin
          vault={vault}
          mnemonic={step.mnemonic}
          onSaved={() => setStep({ name: "home", mnemonic: step.mnemonic })}
        />
      );
    case "restore":
      return <Restore onValid={(m) => setStep({ name: "setPin", mnemonic: m })} />;
    case "unlock":
      return (
        <Unlock
          vault={vault}
          onOpen={(mnemonic) => setStep({ name: "home", mnemonic })}
        />
      );
    case "home":
      return <Home mnemonic={step.mnemonic} />;
  }
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="shell">{children}</div>;
}

function Welcome({ onCreate, onRestore }: { onCreate: () => void; onRestore: () => void }) {
  return (
    <Shell>
      <div className="grow" />
      <h1>
        Carteira
        <br />
        BitiBridge
      </h1>
      <p className="muted">
        Seu DePix, suas chaves. A BitiBridge não guarda e não consegue obter as
        chaves desta carteira.
      </p>
      <div className="card warn">
        <p className="tight">
          Se você perder as 12 palavras, ninguém recupera o seu saldo. Não existe
          "esqueci a senha".
        </p>
      </div>
      <div className="grow" />
      <button className="primary" onClick={onCreate}>
        Criar nova carteira
      </button>
      <button className="ghost" onClick={onRestore}>
        Já tenho as 12 palavras
      </button>
    </Shell>
  );
}

function ShowSeed({ mnemonic, onNext }: { mnemonic: string; onNext: () => void }) {
  const words = mnemonic.split(" ");
  return (
    <Shell>
      <h2>Suas 12 palavras</h2>
      <p className="muted">
        Escreva as 12 palavras no papel, na ordem, e guarde em lugar seguro. Elas
        são a única forma de recuperar a carteira.
      </p>
      <p className="gold">Não tire foto e não salve no computador.</p>
      <div className="words">
        {words.map((word, i) => (
          <div className="word" key={i}>
            <span className="n">{i + 1}</span>
            <span className="w">{word}</span>
          </div>
        ))}
      </div>
      <div className="grow" />
      <button className="primary" onClick={onNext}>
        Anotei, continuar
      </button>
    </Shell>
  );
}

function ConfirmBackup({ mnemonic, onDone }: { mnemonic: string; onDone: () => void }) {
  const [challenge] = useState<BackupChallenge>(() => createBackupChallenge(12));
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [wrong, setWrong] = useState(false);

  const submit = () => {
    if (isBackupChallengeComplete(mnemonic, challenge, answers)) onDone();
    else setWrong(true);
  };

  return (
    <Shell>
      <h2>Conferir o backup</h2>
      <p className="muted">
        Só para ter certeza de que você anotou: digite as palavras abaixo,
        olhando o seu papel.
      </p>
      {challenge.positions.map((position) => (
        <div key={position}>
          <label htmlFor={"p" + position}>Palavra número {position + 1}</label>
          <input
            id={"p" + position}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(e) => {
              setAnswers(new Map(answers).set(position, e.target.value));
              if (wrong) setWrong(false);
            }}
          />
        </div>
      ))}
      {wrong && (
        <p className="danger">
          Alguma palavra não confere. Olhe o papel com calma — é melhor descobrir
          agora do que depois.
        </p>
      )}
      <div className="grow" />
      <button className="primary" onClick={submit}>
        Confirmar
      </button>
    </Shell>
  );
}

const onlyDigits = (v: string): string => v.replace(/\D/g, "").slice(0, 6);

function SetPin({
  vault,
  mnemonic,
  onSaved,
}: {
  vault: SeedVault;
  mnemonic: string;
  onSaved: () => void;
}) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (pin.length !== 6) {
      setError("O PIN precisa ter 6 dígitos.");
      return;
    }
    if (pin !== confirm) {
      setError("Os dois PINs não são iguais.");
      return;
    }
    setError(null);
    setSaving(true);
    await vault.saveSeed(mnemonic, pin);
    onSaved();
  };

  return (
    <Shell>
      <h2>Criar o PIN</h2>
      <p className="muted">
        O PIN protege a carteira neste navegador. Ele não substitui as 12
        palavras: se você trocar de computador, quem traz a carteira de volta são
        elas.
      </p>
      <label htmlFor="pin">PIN de 6 dígitos</label>
      <input
        id="pin"
        className="pin"
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={(e) => setPin(onlyDigits(e.target.value))}
      />
      <label htmlFor="pin2">Digite de novo</label>
      <input
        id="pin2"
        className="pin"
        type="password"
        inputMode="numeric"
        value={confirm}
        onChange={(e) => setConfirm(onlyDigits(e.target.value))}
      />
      {error && <p className="danger">{error}</p>}
      <div className="grow" />
      <button className="primary" onClick={save} disabled={saving}>
        {saving ? "Guardando..." : "Criar carteira"}
      </button>
    </Shell>
  );
}

function Restore({ onValid }: { onValid: (mnemonic: string) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    const phrase = text.trim();
    // A validação é local e inclui o checksum do BIP39: palavra trocada ou fora
    // de ordem é recusada aqui, em vez de abrir uma carteira vazia e diferente.
    if (await isValidMnemonic(phrase)) {
      onValid(phrase);
    } else {
      setError(
        "Essa frase não confere. Verifique se são 12 palavras, na ordem certa e sem erro de digitação.",
      );
    }
  };

  return (
    <Shell>
      <h2>Restaurar carteira</h2>
      <p className="muted">Digite as 12 palavras na ordem, separadas por espaço.</p>
      <textarea
        rows={5}
        value={text}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="palavra1 palavra2 palavra3 ..."
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError(null);
        }}
      />
      {error && <p className="danger">{error}</p>}
      <div className="grow" />
      <button className="primary" onClick={check}>
        Continuar
      </button>
    </Shell>
  );
}

function Unlock({
  vault,
  onOpen,
}: {
  vault: SeedVault;
  onOpen: (mnemonic: string) => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      onOpen(await vault.unlock(pin));
    } catch (e) {
      if (!(e instanceof WrongPinError)) throw e;
      const left = await vault.remainingAttempts();
      setPin("");
      setError(
        left > 0
          ? "PIN incorreto. Restam " +
              left +
              " tentativas antes de a carteira ser apagada deste navegador."
          : "A carteira foi apagada deste navegador. Restaure com as suas 12 palavras.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <div className="grow" />
      <h2>Digite seu PIN</h2>
      <input
        className="pin"
        type="password"
        inputMode="numeric"
        autoFocus
        value={pin}
        onChange={(e) => setPin(onlyDigits(e.target.value))}
      />
      {error && <p className="danger">{error}</p>}
      <button className="primary" onClick={open} disabled={busy}>
        {busy ? "Abrindo..." : "Entrar"}
      </button>
      <div className="grow" />
    </Shell>
  );
}
