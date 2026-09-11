import 'package:flutter/material.dart';

import '../backup/backup_challenge.dart';
import '../security/secure_screen.dart';
import '../theme.dart';
import '../vault/seed_vault.dart';
import 'pin_setup_screen.dart';

/// Pede 3 palavras sorteadas. Sem passar por aqui, a carteira não é criada.
class ConfirmBackupScreen extends StatefulWidget {
  const ConfirmBackupScreen({
    super.key,
    required this.mnemonic,
    required this.vault,
  });

  final String mnemonic;
  final SeedVault vault;

  @override
  State<ConfirmBackupScreen> createState() => _ConfirmBackupScreenState();
}

class _ConfirmBackupScreenState extends State<ConfirmBackupScreen> {
  late final BackupChallenge _challenge = createBackupChallenge(12);
  final Map<int, String> _answers = <int, String>{};
  bool _wrong = false;

  void _submit() {
    final bool ok = isBackupChallengeComplete(widget.mnemonic, _challenge, _answers);
    if (!ok) {
      setState(() => _wrong = true);
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PinSetupScreen(mnemonic: widget.mnemonic, vault: widget.vault),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SecureScreen(
      child: Scaffold(
        appBar: AppBar(title: const Text('Conferir o backup')),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Text(
                  'Só para ter certeza de que você anotou: digite as palavras abaixo, olhando o seu papel.',
                  style: TextStyle(color: kTextMuted, height: 1.5, fontSize: 15),
                ),
                const SizedBox(height: 24),
                for (final int position in _challenge.positions) ...<Widget>[
                  Text(
                    'Palavra número ${position + 1}',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    key: ValueKey<int>(position),
                    autocorrect: false,
                    enableSuggestions: false,
                    textCapitalization: TextCapitalization.none,
                    onChanged: (String v) {
                      _answers[position] = v;
                      if (_wrong) setState(() => _wrong = false);
                    },
                    decoration: const InputDecoration(hintText: 'digite aqui'),
                  ),
                  const SizedBox(height: 18),
                ],
                if (_wrong)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 12),
                    child: Text(
                      'Alguma palavra não confere. Olhe o papel com calma — é melhor descobrir agora do que depois.',
                      style: TextStyle(color: kDanger, height: 1.4),
                    ),
                  ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: _submit,
                  child: const Text('Confirmar'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
