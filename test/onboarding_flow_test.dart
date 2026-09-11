// Testes do fluxo de criação: o que NÃO pode acontecer é mais importante aqui
// do que o caminho feliz. Backup não conferido não cria carteira; PIN digitado
// diferente não grava; frase inválida não passa.

import 'package:bitibridge_wallet/main.dart';
import 'package:bitibridge_wallet/src/screens/confirm_backup_screen.dart';
import 'package:bitibridge_wallet/src/screens/pin_setup_screen.dart';
import 'package:bitibridge_wallet/src/screens/restore_wallet_screen.dart';
import 'package:bitibridge_wallet/src/vault/pin_crypto.dart';
import 'package:bitibridge_wallet/src/vault/seed_vault.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

const String kFrase =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

/// Cofre de mentira, em memória — o teste roda sem aparelho e sem Keystore.
class FakeVault implements SeedVault {
  String? mnemonic;
  String? pin;
  int fails = 0;

  @override
  Future<bool> hasSeed() async => mnemonic != null;

  @override
  Future<void> saveSeed(String m, String p) async {
    mnemonic = m;
    pin = p;
  }

  @override
  Future<String> unlock(String p) async {
    if (p != pin) {
      fails++;
      throw const WrongPinException();
    }
    return mnemonic!;
  }

  @override
  Future<void> wipe() async {
    mnemonic = null;
    pin = null;
  }

  @override
  Future<int> remainingAttempts() async => kMaxPinAttempts - fails;
}

Widget _wrap(Widget child) => MaterialApp(home: child);

/// Lê da tela quais posições o app sorteou.
List<int> _askedPositions(WidgetTester tester) {
  final Iterable<Text> labels = tester
      .widgetList<Text>(find.byType(Text))
      .where((Text t) => (t.data ?? '').startsWith('Palavra número '));
  return labels
      .map((Text t) => int.parse(t.data!.replaceAll('Palavra número ', '')) - 1)
      .toList();
}

void main() {
  testWidgets('sem carteira, a tela inicial oferece criar e restaurar',
      (WidgetTester tester) async {
    await tester.pumpWidget(BitiBridgeWalletApp(vault: FakeVault()));
    await tester.pumpAndSettle();

    expect(find.text('Criar nova carteira'), findsOneWidget);
    expect(find.text('Já tenho as 12 palavras'), findsOneWidget);
  });

  testWidgets('com carteira existente, cai direto no PIN',
      (WidgetTester tester) async {
    final FakeVault vault = FakeVault()
      ..mnemonic = kFrase
      ..pin = '123456';
    await tester.pumpWidget(BitiBridgeWalletApp(vault: vault));
    await tester.pumpAndSettle();

    expect(find.text('Digite seu PIN'), findsOneWidget);
    expect(find.text('Criar nova carteira'), findsNothing);
  });

  testWidgets('backup errado NÃO avança para o PIN',
      (WidgetTester tester) async {
    await tester.pumpWidget(_wrap(
      ConfirmBackupScreen(mnemonic: kFrase, vault: FakeVault()),
    ));
    await tester.pumpAndSettle();

    final List<int> asked = _askedPositions(tester);
    expect(asked.length, 3);

    // responde tudo errado de propósito
    for (int i = 0; i < asked.length; i++) {
      await tester.enterText(find.byType(TextField).at(i), 'errado');
    }
    await tester.tap(find.text('Confirmar'));
    await tester.pumpAndSettle();

    expect(find.textContaining('não confere'), findsOneWidget);
    expect(find.byType(PinSetupScreen), findsNothing);
  });

  testWidgets('backup certo avança para o PIN', (WidgetTester tester) async {
    await tester.pumpWidget(_wrap(
      ConfirmBackupScreen(mnemonic: kFrase, vault: FakeVault()),
    ));
    await tester.pumpAndSettle();

    final List<int> asked = _askedPositions(tester);
    final List<String> words = kFrase.split(' ');
    for (int i = 0; i < asked.length; i++) {
      await tester.enterText(find.byType(TextField).at(i), words[asked[i]]);
    }
    await tester.tap(find.text('Confirmar'));
    await tester.pumpAndSettle();

    expect(find.byType(PinSetupScreen), findsOneWidget);
  });

  testWidgets('PIN diferente não grava nada', (WidgetTester tester) async {
    final FakeVault vault = FakeVault();
    await tester.pumpWidget(_wrap(
      PinSetupScreen(mnemonic: kFrase, vault: vault),
    ));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), '123456');
    await tester.enterText(find.byType(TextField).at(1), '654321');
    await tester.tap(find.text('Criar carteira'));
    await tester.pumpAndSettle();

    expect(find.textContaining('não são iguais'), findsOneWidget);
    expect(vault.mnemonic, isNull);
  });

  testWidgets('PIN curto não grava nada', (WidgetTester tester) async {
    final FakeVault vault = FakeVault();
    await tester.pumpWidget(_wrap(
      PinSetupScreen(mnemonic: kFrase, vault: vault),
    ));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), '123');
    await tester.enterText(find.byType(TextField).at(1), '123');
    await tester.tap(find.text('Criar carteira'));
    await tester.pumpAndSettle();

    // texto EXATO: o rótulo do campo também contém "6 dígitos"
    expect(find.text('O PIN precisa ter 6 dígitos.'), findsOneWidget);
    expect(vault.mnemonic, isNull);
  });

  testWidgets('PIN válido guarda exatamente a frase recebida',
      (WidgetTester tester) async {
    final FakeVault vault = FakeVault();
    await tester.pumpWidget(_wrap(
      PinSetupScreen(mnemonic: kFrase, vault: vault),
    ));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), '123456');
    await tester.enterText(find.byType(TextField).at(1), '123456');
    await tester.tap(find.text('Criar carteira'));
    await tester.pumpAndSettle();

    expect(vault.mnemonic, kFrase);
    expect(vault.pin, '123456');
  });

  testWidgets('restauração recusa frase inválida', (WidgetTester tester) async {
    await tester.pumpWidget(_wrap(RestoreWalletScreen(vault: FakeVault())));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.byType(TextField).first,
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon',
    );
    await tester.tap(find.text('Continuar'));
    await tester.pumpAndSettle();

    expect(find.textContaining('não confere'), findsOneWidget);
    expect(find.byType(PinSetupScreen), findsNothing);
  });

  testWidgets('restauração aceita frase válida', (WidgetTester tester) async {
    await tester.pumpWidget(_wrap(RestoreWalletScreen(vault: FakeVault())));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).first, kFrase);
    await tester.tap(find.text('Continuar'));
    await tester.pumpAndSettle();

    expect(find.byType(PinSetupScreen), findsOneWidget);
  });
}
