import 'package:flutter/material.dart';

import '../theme.dart';
import '../vault/seed_vault.dart';
import 'home_screen.dart';
import 'restore_wallet_screen.dart';
import 'show_seed_screen.dart';
import 'unlock_screen.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({super.key, required this.vault});

  final SeedVault vault;

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  bool _checking = true;

  @override
  void initState() {
    super.initState();
    _redirectIfWalletExists();
  }

  // Já existe carteira neste aparelho? Então a porta de entrada é o PIN, não a
  // criação — senão o usuário criaria uma segunda carteira por engano e acharia
  // que "sumiu o dinheiro".
  Future<void> _redirectIfWalletExists() async {
    final bool exists = await widget.vault.hasSeed();
    if (!mounted) return;
    if (exists) {
      await Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(
          builder: (_) => UnlockScreen(vault: widget.vault),
        ),
      );
      return;
    }
    setState(() => _checking = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_checking) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: kCyan)),
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const Spacer(),
              const Text(
                'Carteira\nBitiBridge',
                style: TextStyle(
                  fontSize: 38,
                  height: 1.1,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Seu DePix, suas chaves. A BitiBridge não guarda e não consegue '
                'obter as chaves desta carteira — nem se quiser, nem se for '
                'obrigada.',
                style: TextStyle(fontSize: 16, height: 1.5, color: kTextMuted),
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: kSurface,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: kGold.withValues(alpha: 0.35)),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Icon(Icons.warning_amber_rounded, color: kGold, size: 22),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Se você perder as 12 palavras e o aparelho, ninguém '
                        'recupera o seu saldo. Não existe "esqueci a senha".',
                        style: TextStyle(color: Colors.white, height: 1.45),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              FilledButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => ShowSeedScreen(vault: widget.vault),
                  ),
                ),
                child: const Text('Criar nova carteira'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => RestoreWalletScreen(vault: widget.vault),
                  ),
                ),
                child: const Text('Já tenho as 12 palavras'),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}

/// Atalho usado após criar ou restaurar: leva para a home sem deixar voltar.
void goHome(BuildContext context, SeedVault vault) {
  Navigator.of(context).pushAndRemoveUntil(
    MaterialPageRoute<void>(builder: (_) => HomeScreen(vault: vault)),
    (Route<void> route) => false,
  );
}
