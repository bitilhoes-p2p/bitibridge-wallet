import 'dart:math';

import 'package:bitibridge_wallet/src/backup/backup_challenge.dart';
import 'package:flutter_test/flutter_test.dart';

const String kFrase =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

void main() {
  group('sorteio das posições', () {
    test('sorteia 3 posições distintas, em ordem', () {
      for (int i = 0; i < 200; i++) {
        final BackupChallenge c = createBackupChallenge(12);
        expect(c.positions.length, 3);
        expect(c.positions.toSet().length, 3, reason: 'não pode repetir palavra');
        final List<int> ordenado = List<int>.from(c.positions)..sort();
        expect(c.positions, ordenado);
        expect(c.positions.every((int p) => p >= 0 && p < 12), isTrue);
      }
    });

    test('numeração mostrada ao usuário começa em 1', () {
      final BackupChallenge c =
          createBackupChallenge(12, rng: Random(42));
      expect(c.humanPositions, c.positions.map((int p) => p + 1).toList());
      expect(c.humanPositions.every((int p) => p >= 1 && p <= 12), isTrue);
    });

    test('não sorteia mais perguntas do que palavras', () {
      expect(() => createBackupChallenge(2), throwsArgumentError);
    });
  });

  group('conferência das respostas', () {
    test('aceita a palavra certa, com espaço e maiúscula', () {
      expect(isBackupAnswerCorrect(kFrase, 11, 'about'), isTrue);
      expect(isBackupAnswerCorrect(kFrase, 11, '  ABOUT '), isTrue);
      expect(isBackupAnswerCorrect(kFrase, 0, 'abandon'), isTrue);
    });

    test('recusa palavra errada e posição fora da frase', () {
      expect(isBackupAnswerCorrect(kFrase, 11, 'abandon'), isFalse);
      expect(isBackupAnswerCorrect(kFrase, 99, 'about'), isFalse);
      expect(isBackupAnswerCorrect(kFrase, -1, 'abandon'), isFalse);
    });

    test('só conclui quando TODAS as sorteadas estão certas', () {
      const BackupChallenge c = BackupChallenge(<int>[0, 5, 11]);
      expect(
        isBackupChallengeComplete(kFrase, c, <int, String>{
          0: 'abandon',
          5: 'abandon',
          11: 'about',
        }),
        isTrue,
      );
      // uma errada derruba tudo
      expect(
        isBackupChallengeComplete(kFrase, c, <int, String>{
          0: 'abandon',
          5: 'abandon',
          11: 'abandon',
        }),
        isFalse,
      );
      // faltando resposta também
      expect(
        isBackupChallengeComplete(kFrase, c, <int, String>{0: 'abandon'}),
        isFalse,
      );
    });
  });
}
