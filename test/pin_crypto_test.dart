import 'package:bitibridge_wallet/src/vault/pin_crypto.dart';
import 'package:flutter_test/flutter_test.dart';

const String kFrase =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

void main() {
  group('seed cifrada pelo PIN', () {
    test('o PIN certo devolve exatamente a mesma frase', () async {
      final EncryptedSeed blob = await encryptSeedWithPin(kFrase, '123456');
      expect(await decryptSeedWithPin(blob, '123456'), kFrase);
    });

    test('PIN errado NÃO abre', () async {
      final EncryptedSeed blob = await encryptSeedWithPin(kFrase, '123456');
      expect(
        () => decryptSeedWithPin(blob, '123457'),
        throwsA(isA<WrongPinException>()),
      );
    });

    test('a frase não aparece em claro no que é gravado', () async {
      final EncryptedSeed blob = await encryptSeedWithPin(kFrase, '123456');
      final String gravado = blob.encode();
      expect(gravado.contains('abandon'), isFalse);
      expect(gravado.contains('about'), isFalse);
    });

    test('sal e nonce nunca se repetem entre gravações', () async {
      final EncryptedSeed a = await encryptSeedWithPin(kFrase, '123456');
      final EncryptedSeed b = await encryptSeedWithPin(kFrase, '123456');
      expect(a.salt, isNot(b.salt));
      expect(a.nonce, isNot(b.nonce));
      // mesma frase, mesmo PIN, cifra diferente — é o esperado
      expect(a.cipherText, isNot(b.cipherText));
    });

    test('serializa e volta sem perder nada', () async {
      final EncryptedSeed blob = await encryptSeedWithPin(kFrase, '999999');
      final EncryptedSeed volta = EncryptedSeed.decode(blob.encode());
      expect(await decryptSeedWithPin(volta, '999999'), kFrase);
    });

    test('blob corrompido é recusado', () {
      expect(() => EncryptedSeed.decode('lixo'), throwsFormatException);
    });
  });
}
