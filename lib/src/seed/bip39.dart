// BIP39 — conversão entre ENTROPIA e as 12 palavras, e a volta.
//
// Este arquivo é o coração auditável da carteira: é aqui que os bits aleatórios
// viram a frase que o usuário anota no papel. Ele é propositalmente pequeno e
// sem dependência de terceiros além do `crypto` (pacote do próprio time do Dart,
// usado só para o SHA-256 do checksum) — quem quiser conferir, lê as ~90 linhas
// abaixo e compara com a especificação:
// https://github.com/bitcoin/bips/blob/master/bip-0039/mediawiki
//
// A regra, em uma frase: pega-se a entropia (128 bits = 12 palavras), acrescenta-se
// um checksum de entropia/32 bits vindo do SHA-256 dela, e o resultado é fatiado em
// grupos de 11 bits — cada grupo é o índice de uma palavra na lista oficial.
//
// Onde a ENTROPIA nasce é outro arquivo, de propósito: entropy.dart.

import 'dart:typed_data';

import 'package:crypto/crypto.dart';

import 'wordlist_english.dart';

/// Tamanhos de entropia aceitos pelo BIP39, em bits. 128 → 12 palavras.
const Set<int> kAllowedEntropyBits = <int>{128, 160, 192, 224, 256};

/// Converte a entropia nas palavras do BIP39.
///
/// Lança [ArgumentError] para qualquer tamanho fora do padrão — nunca "arruma"
/// silenciosamente uma entropia curta, porque isso reduziria a segurança da seed
/// sem o usuário perceber.
String entropyToMnemonic(Uint8List entropy) {
  final int bits = entropy.length * 8;
  if (!kAllowedEntropyBits.contains(bits)) {
    throw ArgumentError('Entropia de $bits bits não é válida no BIP39');
  }

  final int checksumBits = bits ~/ 32;
  final String entropyBits = _toBitString(entropy);
  final String checksum =
      _toBitString(Uint8List.fromList(sha256.convert(entropy).bytes))
          .substring(0, checksumBits);

  final String allBits = entropyBits + checksum;
  final List<String> words = <String>[];
  for (int i = 0; i < allBits.length; i += 11) {
    words.add(kBip39English[int.parse(allBits.substring(i, i + 11), radix: 2)]);
  }
  return words.join(' ');
}

/// Caminho inverso: das palavras de volta à entropia, CONFERINDO o checksum.
///
/// É o que valida a frase digitada na restauração: uma palavra trocada de lugar
/// quase sempre quebra o checksum, e aí a carteira avisa em vez de abrir uma
/// carteira vazia e diferente — que é como o usuário "perde" fundos sem erro
/// aparente.
Uint8List mnemonicToEntropy(String mnemonic) {
  final List<String> words =
      mnemonic.trim().toLowerCase().split(RegExp(r'\s+'));
  if (words.length < 12 || words.length > 24 || words.length % 3 != 0) {
    throw ArgumentError('A frase precisa ter 12, 15, 18, 21 ou 24 palavras');
  }

  final StringBuffer bits = StringBuffer();
  for (final String word in words) {
    final int index = kBip39English.indexOf(word);
    if (index < 0) {
      throw ArgumentError('Palavra fora da lista oficial do BIP39: "$word"');
    }
    bits.write(index.toRadixString(2).padLeft(11, '0'));
  }

  final String allBits = bits.toString();
  final int checksumLength = allBits.length ~/ 33;
  final int entropyLength = allBits.length - checksumLength;

  final Uint8List entropy = Uint8List(entropyLength ~/ 8);
  for (int i = 0; i < entropy.length; i++) {
    entropy[i] =
        int.parse(allBits.substring(i * 8, i * 8 + 8), radix: 2);
  }

  final String expected =
      _toBitString(Uint8List.fromList(sha256.convert(entropy).bytes))
          .substring(0, checksumLength);
  if (allBits.substring(entropyLength) != expected) {
    throw ArgumentError(
      'Checksum inválido — confira as palavras, alguma está errada ou fora de ordem',
    );
  }
  return entropy;
}

/// `true` quando a frase é válida (palavras conhecidas e checksum fechando).
bool isValidMnemonic(String mnemonic) {
  try {
    mnemonicToEntropy(mnemonic);
    return true;
  } on ArgumentError {
    return false;
  }
}

String _toBitString(Uint8List bytes) {
  final StringBuffer out = StringBuffer();
  for (final int b in bytes) {
    out.write(b.toRadixString(2).padLeft(8, '0'));
  }
  return out.toString();
}
