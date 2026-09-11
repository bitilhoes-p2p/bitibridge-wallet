import 'package:flutter/material.dart';

import '../security/secure_screen.dart';
import '../seed/entropy.dart';
import '../theme.dart';
import '../vault/seed_vault.dart';
import 'confirm_backup_screen.dart';

/// Mostra as 12 palavras recém-criadas. Captura de tela bloqueada.
class ShowSeedScreen extends StatefulWidget {
  const ShowSeedScreen({super.key, required this.vault});

  final SeedVault vault;

  @override
  State<ShowSeedScreen> createState() => _ShowSeedScreenState();
}

class _ShowSeedScreenState extends State<ShowSeedScreen> {
  // A seed nasce AQUI, no aparelho. Fica em memória até o PIN ser definido;
  // nunca é gravada em claro nem enviada a lugar nenhum.
  late final String _mnemonic = generateMnemonic();

  @override
  Widget build(BuildContext context) {
    final List<String> words = _mnemonic.split(' ');

    return SecureScreen(
      child: Scaffold(
        appBar: AppBar(title: const Text('Suas 12 palavras')),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Text(
                  'Escreva as 12 palavras no papel, na ordem, e guarde em lugar seguro. Elas são a única forma de recuperar a carteira.',
                  style: TextStyle(color: kTextMuted, height: 1.5, fontSize: 15),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Não tire foto e não salve no celular.',
                  style: TextStyle(color: kGold, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 20),
                Expanded(
                  child: GridView.builder(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 3.4,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    itemCount: words.length,
                    itemBuilder: (BuildContext context, int i) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      decoration: BoxDecoration(
                        color: kSurface,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: <Widget>[
                          SizedBox(
                            width: 26,
                            child: Text(
                              (i + 1).toString(),
                              style: const TextStyle(color: kTextMuted, fontSize: 13),
                            ),
                          ),
                          Expanded(
                            child: Text(
                              words[i],
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => ConfirmBackupScreen(
                        mnemonic: _mnemonic,
                        vault: widget.vault,
                      ),
                    ),
                  ),
                  child: const Text('Anotei, continuar'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
