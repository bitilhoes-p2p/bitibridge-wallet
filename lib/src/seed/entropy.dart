// De onde nascem as 12 palavras.
//
// Este é o arquivo que responde à pergunta "posso confiar que vocês não
// conseguem adivinhar minha seed?". São poucas linhas de propósito: quanto menor,
// mais fácil de auditar.
//
// A aleatoriedade vem de `Random.secure()`, que NÃO é o gerador comum do Dart.
// Ele delega ao gerador criptográfico do sistema operacional — no Android e no
// iOS, o mesmo que o sistema usa para chaves de criptografia. Se a plataforma não
// oferecer essa fonte, o construtor LANÇA em vez de cair num gerador fraco: é
// melhor falhar na cara do usuário do que entregar uma seed previsível.
//
// O que NUNCA pode entrar aqui:
//   - `Random()` sem o `.secure()` (previsível a partir do relógio);
//   - semente fixa, "para facilitar o teste";
//   - qualquer valor derivado de e-mail, CPF, horário ou id do aparelho.

import 'dart:math';
import 'dart:typed_data';

import 'bip39.dart' show kAllowedEntropyBits, entropyToMnemonic;

/// Gera [bits] de entropia criptográfica. O padrão, 128 bits, dá 12 palavras.
///
/// 128 bits significam 2^128 seeds possíveis — o mesmo patamar de segurança que
/// protege a maior parte do Bitcoin em circulação.
Uint8List generateEntropy({int bits = 128}) {
  if (!kAllowedEntropyBits.contains(bits)) {
    throw ArgumentError('Entropia de $bits bits não é válida no BIP39');
  }
  // Lança UnsupportedError se a plataforma não tiver fonte segura — fail-closed.
  final Random rng = Random.secure();
  final Uint8List bytes = Uint8List(bits ~/ 8);
  for (int i = 0; i < bytes.length; i++) {
    bytes[i] = rng.nextInt(256);
  }
  return bytes;
}

/// Gera uma frase nova de 12 palavras, pronta para o usuário anotar.
///
/// Atalho para [generateEntropy] + `entropyToMnemonic`. É a ÚNICA porta de
/// criação de carteira do app — não existe outro caminho que produza seed.
String generateMnemonic({int bits = 128}) =>
    entropyToMnemonic(generateEntropy(bits: bits));
