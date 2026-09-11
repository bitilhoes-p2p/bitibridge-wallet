import 'package:flutter/material.dart';

import 'src/screens/welcome_screen.dart';
import 'src/theme.dart';
import 'src/vault/seed_vault.dart';

void main() {
  runApp(BitiBridgeWalletApp(vault: SecureStorageSeedVault()));
}

class BitiBridgeWalletApp extends StatelessWidget {
  const BitiBridgeWalletApp({super.key, required this.vault});

  final SeedVault vault;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Carteira BitiBridge',
      debugShowCheckedModeBanner: false,
      theme: buildWalletTheme(),
      home: WelcomeScreen(vault: vault),
    );
  }
}
