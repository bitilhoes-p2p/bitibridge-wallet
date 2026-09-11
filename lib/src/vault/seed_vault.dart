// O cofre: onde a seed cifrada mora no aparelho.
//
// Contrato do projeto — vale para sempre:
//   - só entra aqui o blob CIFRADO (ver pin_crypto.dart), nunca a frase em claro;
//   - nada daqui sai para rede, log, analytics ou relatório de erro;
//   - a interface existe para que o teste rode sem aparelho e para que uma
//     segunda implementação (ex.: outra rede) reaproveite o mesmo fluxo.

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'pin_crypto.dart';

/// Tentativas de PIN antes do cofre se apagar.
///
/// Apagar NÃO é perder o dinheiro: a carteira volta pelas 12 palavras. É o que
/// impede alguém com o aparelho na mão de ficar tentando PIN à vontade.
const int kMaxPinAttempts = 10;

abstract class SeedVault {
  Future<bool> hasSeed();

  /// Grava a frase cifrada com o PIN. Sobrescreve o que houver.
  Future<void> saveSeed(String mnemonic, String pin);

  /// Devolve a frase. Lança [WrongPinException] quando o PIN não abre.
  Future<String> unlock(String pin);

  /// Apaga tudo. Irreversível no aparelho — só as 12 palavras trazem de volta.
  Future<void> wipe();

  /// Quantas tentativas de PIN ainda restam antes do apagamento.
  Future<int> remainingAttempts();
}

class SecureStorageSeedVault implements SeedVault {
  SecureStorageSeedVault({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              // Na v11 o padrao do Android JA e Keystore com AES-GCM e chave
              // envelopada em RSA-OAEP; nao existe mais opcao a ligar aqui.
              aOptions: AndroidOptions(),
              // No iOS, a seed so e legivel neste aparelho e apos o primeiro
              // desbloqueio: nao vai para backup nem para outro dispositivo.
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock_this_device,
              ),
            );

  final FlutterSecureStorage _storage;

  static const String _seedKey = 'bitibridge.seed.v1';
  static const String _failsKey = 'bitibridge.seed.fails.v1';

  @override
  Future<bool> hasSeed() async => await _storage.read(key: _seedKey) != null;

  @override
  Future<void> saveSeed(String mnemonic, String pin) async {
    final EncryptedSeed blob = await encryptSeedWithPin(mnemonic, pin);
    await _storage.write(key: _seedKey, value: blob.encode());
    await _storage.write(key: _failsKey, value: '0');
  }

  @override
  Future<String> unlock(String pin) async {
    final String? raw = await _storage.read(key: _seedKey);
    if (raw == null) {
      throw StateError('Nenhuma carteira guardada neste aparelho');
    }
    try {
      final String mnemonic =
          await decryptSeedWithPin(EncryptedSeed.decode(raw), pin);
      await _storage.write(key: _failsKey, value: '0');
      return mnemonic;
    } on WrongPinException {
      final int fails = await _readFails() + 1;
      if (fails >= kMaxPinAttempts) {
        await wipe();
      } else {
        await _storage.write(key: _failsKey, value: '$fails');
      }
      rethrow;
    }
  }

  @override
  Future<void> wipe() async {
    await _storage.delete(key: _seedKey);
    await _storage.delete(key: _failsKey);
  }

  @override
  Future<int> remainingAttempts() async =>
      kMaxPinAttempts - await _readFails();

  Future<int> _readFails() async =>
      int.tryParse(await _storage.read(key: _failsKey) ?? '0') ?? 0;
}
