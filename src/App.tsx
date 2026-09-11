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

type Step =
  | { name: "loading" }
  | { name: "welcome" }
  | { name: "showSeed"; mnemonic: string }
  | { name: "confirmBackup"; mnemonic: string }
  | { name: "setPin"; mnemonic: string }
  | { name: "restore" }
  | { name: "unlock" }
  | { name: "home" };

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
          onSaved={() => setStep({ name: "home" })}
        />
      );
    case "restore":
      return <Restore onValid={(m) => setStep({ name: "setPin", mnemonic: m })} />;
    case "unlock":
      return <Unlock vault={vault} onOpen={() => setStep({ name: "home" })} />;
    case "home":
      return <Home />;
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
        Seu DePix, suas chaves. A BitiBridge nao guarda e nao consegue obter as
        chaves desta carteira.
      </p>
      <div className="card warn">
        <p style={{ margin: 0 }}>
          Se voce perder as 12 palavras, ninguem recupera o seu saldo. Nao existe
          "esqueci a senha".
        </p>
      </div>
      <div className="grow" />
      <button className="primary" onClick={onCreate}>
        Criar nova carteira
      </button>
      <button className="ghost" onClick={onRestore}>
        Ja tenho as 12 palavras
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
        sao a unica forma de recuperar a carteira.
      </p>
      <p className="gold">Nao tire foto e nao salve no computador.</p>
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
        So para ter certeza de que voce anotou: digite as palavras abaixo,
        olhando o seu papel.
      </p>
      {challenge.positions.map((position) => (
        <div key={position}>
          <label htmlFor={"p" + position}>Palavra numero {position + 1}</label>
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
          Alguma palavra nao confere. Olhe o papel com calma, e melhor descobrir
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
      setError("O PIN precisa ter 6 digitos.");
      return;
    }
    if (pin !== confirm) {
      setError("Os dois PINs nao sao iguais.");
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
        O PIN protege a carteira neste navegador. Ele nao substitui as 12
        palavras: se voce trocar de computador, quem traz a carteira de volta sao
        elas.
      </p>
      <label htmlFor="pin">PIN de 6 digitos</label>
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
    // A validacao e local e inclui o checksum do BIP39: palavra trocada ou fora
    // de ordem e recusada aqui, em vez de abrir uma carteira vazia e diferente.
    if (await isValidMnemonic(phrase)) {
      onValid(phrase);
    } else {
      setError(
        "Essa frase nao confere. Verifique se sao 12 palavras, na ordem certa e sem erro de digitacao.",
      );
    }
  };

  return (
    <Shell>
      <h2>Restaurar carteira</h2>
      <p className="muted">Digite as 12 palavras na ordem, separadas por espaco.</p>
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

function Unlock({ vault, onOpen }: { vault: SeedVault; onOpen: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    setError(null);
    try {
      await vault.unlock(pin);
      onOpen();
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

function Home() {
  return (
    <Shell>
      <h2>Carteira BitiBridge</h2>
      <div className="card">
        <p style={{ margin: 0, fontWeight: 600 }}>
          Carteira guardada neste navegador
        </p>
        <p className="muted" style={{ margin: "10px 0 0" }}>
          Suas 12 palavras estao cifradas com o seu PIN. A BitiBridge nao tem
          copia.
        </p>
      </div>
      <h2>Saldo e recebimento</h2>
      <p className="muted">
        Em construcao. A proxima etapa conecta a carteira a rede Liquid para
        mostrar o seu DePix, gerar endereco de deposito e enviar.
      </p>
    </Shell>
  );
}
