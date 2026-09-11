// Conferência do backup: o app sorteia 3 posições e pede as palavras.
//
// Por que isso existe: quase toda perda de fundo em carteira não-custodial começa
// com alguém que "anotou depois" e nunca anotou. Pedir 3 palavras de volta é o
// mínimo para saber que a pessoa REALMENTE escreveu — e por isso o app não gera
// endereço de depósito antes de passar por aqui.
//
// Módulo PURO: sem tela, sem armazenamento, sem plugin. Testável direto.

import 'dart:math';

/// Quantas palavras o app pede de volta na conferência.
const int kBackupQuestionCount = 3;

/// As posições sorteadas (base 0), sempre em ordem crescente e sem repetição.
class BackupChallenge {
  const BackupChallenge(this.positions);

  final List<int> positions;

  /// Número da palavra como o usuário vê na tela (base 1).
  List<int> get humanPositions =>
      positions.map((int p) => p + 1).toList(growable: false);
}

/// Sorteia [questions] posições distintas entre as [wordCount] palavras.
///
/// O [rng] é injetável só para o teste conseguir ser determinístico. Em produção
/// o padrão é `Random.secure()` — sortear sempre as mesmas posições tornaria a
/// conferência decorável e inútil.
BackupChallenge createBackupChallenge(
  int wordCount, {
  int questions = kBackupQuestionCount,
  Random? rng,
}) {
  if (wordCount < questions) {
    throw ArgumentError('Não dá para sortear $questions de $wordCount palavras');
  }
  final Random random = rng ?? Random.secure();
  final Set<int> chosen = <int>{};
  while (chosen.length < questions) {
    chosen.add(random.nextInt(wordCount));
  }
  final List<int> sorted = chosen.toList()..sort();
  return BackupChallenge(List<int>.unmodifiable(sorted));
}

/// `true` se [answer] é a palavra que está em [position] na frase.
///
/// Tolera espaço sobrando e maiúscula — o usuário está digitando do papel, e
/// recusar "Abandon" por causa da maiúscula é atrito sem ganho de segurança.
bool isBackupAnswerCorrect(String mnemonic, int position, String answer) {
  final List<String> words = mnemonic.trim().toLowerCase().split(RegExp(r'\s+'));
  if (position < 0 || position >= words.length) return false;
  return words[position] == answer.trim().toLowerCase();
}

/// `true` somente quando TODAS as posições sorteadas foram respondidas certo.
bool isBackupChallengeComplete(
  String mnemonic,
  BackupChallenge challenge,
  Map<int, String> answers,
) {
  for (final int position in challenge.positions) {
    final String? answer = answers[position];
    if (answer == null || !isBackupAnswerCorrect(mnemonic, position, answer)) {
      return false;
    }
  }
  return true;
}
