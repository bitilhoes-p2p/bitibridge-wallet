// Conferência do backup: o app sorteia 3 posições e pede as palavras.
//
// Por que isso existe: quase toda perda de fundo em carteira não-custodial começa
// com alguém que "anotou depois" e nunca anotou. Pedir 3 palavras de volta é o
// mínimo para saber que a pessoa REALMENTE escreveu — e por isso a carteira não
// é criada antes de passar por aqui.
//
// Módulo PURO: sem tela, sem armazenamento, sem rede.

/** Quantas palavras o app pede de volta na conferência. */
export const BACKUP_QUESTION_COUNT = 3;

/** As posições sorteadas (base 0), sempre em ordem crescente e sem repetição. */
export interface BackupChallenge {
  readonly positions: readonly number[];
}

/**
 * Sorteia `questions` posições distintas entre as `wordCount` palavras.
 *
 * O `pick` é injetável só para o teste ser determinístico. Em produção o padrão é
 * o gerador criptográfico do navegador — sortear sempre as mesmas posições
 * tornaria a conferência decorável e inútil.
 */
export function createBackupChallenge(
  wordCount: number,
  questions: number = BACKUP_QUESTION_COUNT,
  pick: (max: number) => number = randomBelow,
): BackupChallenge {
  if (wordCount < questions) {
    throw new Error(`Não dá para sortear ${questions} de ${wordCount} palavras`);
  }
  const chosen = new Set<number>();
  while (chosen.size < questions) chosen.add(pick(wordCount));
  return { positions: [...chosen].sort((a, b) => a - b) };
}

function randomBelow(max: number): number {
  const bytes = crypto.getRandomValues(new Uint32Array(1));
  return bytes[0] % max;
}

/**
 * `true` se `answer` é a palavra que está em `position` na frase.
 *
 * Tolera espaço sobrando e maiúscula — a pessoa está digitando do papel, e
 * recusar "Abandon" por causa da maiúscula é atrito sem ganho de segurança.
 */
export function isBackupAnswerCorrect(
  mnemonic: string,
  position: number,
  answer: string,
): boolean {
  const words = mnemonic.trim().toLowerCase().split(/\s+/);
  if (position < 0 || position >= words.length) return false;
  return words[position] === answer.trim().toLowerCase();
}

/** `true` somente quando TODAS as posições sorteadas foram respondidas certo. */
export function isBackupChallengeComplete(
  mnemonic: string,
  challenge: BackupChallenge,
  answers: ReadonlyMap<number, string>,
): boolean {
  return challenge.positions.every((position) => {
    const answer = answers.get(position);
    return answer !== undefined && isBackupAnswerCorrect(mnemonic, position, answer);
  });
}
