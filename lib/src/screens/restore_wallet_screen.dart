import 'package:flutter/material.dart';

import '../security/secure_screen.dart';
import '../seed/bip39.dart';
import '../theme.dart';
import '../vault/seed_vault.dart';
import 'pin_setup_screen.dart';

/// Restauração a partir das 12 palavras anotadas.
class RestoreWalletScreen extends StatefulWidget {
  const RestoreWalletScreen({super.key, required this.vault});

  final SeedVault vault;

  @override
  State<RestoreWalletScreen> createState() => _RestoreWalletScreenState();
}

class _RestoreWalletScreenState extends State<RestoreWalletScreen> {
  final TextEditingController _input = TextEditingController();
  String? _error;

  void _continue() {
    final String phrase = _input.text.trim();
    // A validação é local e inclui o checksum do BIP39: palavra trocada ou fora
    // de ordem é recusada aqui, em vez de abrir uma carteira vazia e diferente.
    if (!isValidMnemonic(phrase)) {
      setState(() => _error =
          'Essa frase não confere. Verifique se são 12 palavras, na ordem certa e sem erro de digitação.');
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PinSetupScreen(mnemonic: phrase, vault: widget.vault),
      ),
    );
  }

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SecureScreen(
      child: Scaffold(
        appBar: AppBar(title: const Text('Restaurar carteira')),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Text(
                  'Digite as 12 palavras na ordem, separadas por espaço.',
                  style: TextStyle(color: kTextMuted, height: 1.5, fontSize: 15),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _input,
                  maxLines: 5,
                  autocorrect: false,
                  enableSuggestions: false,
                  textCapitalization: TextCapitalization.none,
                  onChanged: (_) {
                    if (_error != null) setState(() => _error = null);
                  },
                  decoration: const InputDecoration(
                    hintText: 'palavra1 palavra2 palavra3 ...',
                  ),
                ),
                if (_error != null) ...<Widget>[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: kDanger, height: 1.4)),
                ],
                const SizedBox(height: 28),
                FilledButton(onPressed: _continue, child: const Text('Continuar')),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
