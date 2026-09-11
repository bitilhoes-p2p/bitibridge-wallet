import 'package:flutter/material.dart';

import '../theme.dart';
import '../vault/seed_vault.dart';

/// Tela inicial da carteira.
///
/// Por enquanto confirma que a carteira existe e está guardada. Saldo, endereço
/// de recebimento e envio entram quando a carteira passar a falar com a rede
/// Liquid (próxima etapa, com a biblioteca LWK).
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key, required this.vault});

  final SeedVault vault;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Carteira BitiBridge')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: kSurface,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        Icon(Icons.verified_user_outlined, color: kCyan, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Carteira guardada neste aparelho',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    SizedBox(height: 10),
                    Text(
                      'Suas 12 palavras estão cifradas com o seu PIN, dentro do cofre do sistema. A BitiBridge não tem cópia.',
                      style: TextStyle(color: kTextMuted, height: 1.45),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Saldo e recebimento',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 16),
              ),
              const SizedBox(height: 8),
              const Text(
                'Em construção. A próxima etapa conecta a carteira à rede Liquid para mostrar o seu DePix, gerar endereço de depósito e enviar.',
                style: TextStyle(color: kTextMuted, height: 1.5),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
