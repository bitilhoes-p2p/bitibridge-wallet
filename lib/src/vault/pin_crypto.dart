// Criptografia da seed em repouso, amarrada ao PIN do usuário.
//
// A seed NÃO é guardada em claro nem mesmo dentro do cofre do sistema. Ela é
// cifrada com uma chave derivada do PIN, e só o blob cifrado vai para o
// armazenamento seguro. São duas camadas independentes:
//
//   1. o cofre do sistema (Keystore no Android, Keychain no iOS), que protege o
//      arquivo contra outros aplicativos e contra leitura casual do disco;
//   2. esta camada, que protege contra quem CONSEGUIR o arquivo mesmo assim.
//
// Sendo honesto sobre o limite: um PIN de 6 dígitos tem só um milhão de
// combinações. O PBKDF2 abaixo encarece cada tentativa, mas quem tiver o blob e
// tempo de sobra chega lá. Quem realmente segura o ataque é o cofre do sistema
// (que não entrega o arquivo) somado ao limite de tentativas do SeedVault. Por
// isso o PIN não é a única defesa — e por isso as 12 palavras no papel continuam
// sendo o que garante o dinheiro.

import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';

/// Custo da derivação do PIN. Valor recomendado pela OWASP para PBKDF2-SHA256.
const int kPbkdf2Iterations = 210000;

/// Tamanho do sal, em bytes. Novo a cada gravação.
const int kSaltBytes = 16;

/// Resultado da cifragem — tudo que precisa ser guardado para abrir depois.
class EncryptedSeed {
  const EncryptedSeed({
    required this.salt,
    required this.nonce,
    required this.cipherText,
    required this.mac,
  });

  final List<int> salt;
  final List<int> nonce;
  final List<int> cipherText;
  final List<int> mac;

  /// Serializa em uma linha só, para caber no armazenamento seguro (chave/valor).
  String encode() => <String>[
        base64Encode(salt),
        base64Encode(nonce),
        base64Encode(cipherText),
        base64Encode(mac),
      ].join('.');

  static EncryptedSeed decode(String raw) {
    final List<String> parts = raw.split('.');
    if (parts.length != 4) {
      throw const FormatException('Blob da seed corrompido');
    }
    return EncryptedSeed(
      salt: base64Decode(parts[0]),
      nonce: base64Decode(parts[1]),
      cipherText: base64Decode(parts[2]),
      mac: base64Decode(parts[3]),
    );
  }
}

/// Lançada quando o PIN não abre o blob. Não distingue "PIN errado" de "dado
/// corrompido" de propósito: qualquer diferença vira informação para quem ataca.
class WrongPinException implements Exception {
  const WrongPinException();
  @override
  String toString() => 'PIN incorreto';
}

final AesGcm _cipher = AesGcm.with256bits();

/// Deriva a chave de 256 bits a partir do PIN e do sal.
Future<SecretKey> deriveKeyFromPin(String pin, List<int> salt) async {
  final Pbkdf2 pbkdf2 = Pbkdf2(
    macAlgorithm: Hmac.sha256(),
    iterations: kPbkdf2Iterations,
    bits: 256,
  );
  return pbkdf2.deriveKeyFromPassword(password: pin, nonce: salt);
}

/// Cifra a frase de 12 palavras com uma chave derivada do PIN.
///
/// Gera sal e nonce novos a cada chamada — reusar qualquer um dos dois em AES-GCM
/// quebra a confidencialidade, então eles NUNCA são fixos nem reaproveitados.
Future<EncryptedSeed> encryptSeedWithPin(String mnemonic, String pin) async {
  final Random rng = Random.secure();
  final Uint8List salt = Uint8List(kSaltBytes);
  for (int i = 0; i < salt.length; i++) {
    salt[i] = rng.nextInt(256);
  }

  final SecretKey key = await deriveKeyFromPin(pin, salt);
  final SecretBox box = await _cipher.encrypt(
    utf8.encode(mnemonic),
    secretKey: key,
  );

  return EncryptedSeed(
    salt: salt,
    nonce: box.nonce,
    cipherText: box.cipherText,
    mac: box.mac.bytes,
  );
}

/// Abre o blob com o PIN. Lança [WrongPinException] se o PIN não for o certo.
///
/// A verificação é feita pelo MAC do AES-GCM: PIN errado gera chave errada, o MAC
/// não fecha e a decifragem falha. Não existe "senha guardada" para comparar —
/// não há o que vazar.
Future<String> decryptSeedWithPin(EncryptedSeed seed, String pin) async {
  final SecretKey key = await deriveKeyFromPin(pin, seed.salt);
  try {
    final List<int> clear = await _cipher.decrypt(
      SecretBox(seed.cipherText, nonce: seed.nonce, mac: Mac(seed.mac)),
      secretKey: key,
    );
    return utf8.decode(clear);
  } on SecretBoxAuthenticationError {
    throw const WrongPinException();
  }
}
