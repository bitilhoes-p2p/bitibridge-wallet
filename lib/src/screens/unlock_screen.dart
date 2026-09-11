import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme.dart';
import '../vault/pin_crypto.dart';
import '../vault/seed_vault.dart';
import 'home_screen.dart';

/// Porta de entrada de quem já tem carteira neste aparelho.
class UnlockScreen extends StatefulWidget {
  const UnlockScreen({super.key, required this.vault});

  final SeedVault vault;

  @override
  State<UnlockScreen> createState() => _UnlockScreenState();
}

class _UnlockScreenState extends State<UnlockScreen> {
  final TextEditingController _pin = TextEditingController();
  String? _error;
  bool _busy = false;

  Future<void> _unlock() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.vault.unlock(_pin.text.trim());
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute<void>(builder: (_) => HomeScreen(vault: widget.vault)),
      );
    } on WrongPinException {
      final int left = await widget.vault.remainingAttempts();
      if (!mounted) return;
      setState(() {
        _pin.clear();
        _error = left > 0
            ? 'PIN incorreto. Restam $left tentativas antes de o app apagar a carteira deste aparelho.'
            : 'A carteira foi apagada deste aparelho. Restaure com as suas 12 palavras.';
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _pin.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const Text(
                'Digite seu PIN',
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, color: Colors.white),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: _pin,
                obscureText: true,
                autofocus: true,
                keyboardType: TextInputType.number,
                maxLength: 6,
                inputFormatters: <TextInputFormatter>[FilteringTextInputFormatter.digitsOnly],
                style: const TextStyle(fontSize: 22, letterSpacing: 8),
                decoration: const InputDecoration(counterText: ''),
              ),
              if (_error != null) ...<Widget>[
                const SizedBox(height: 12),
                Text(_error!, style: const TextStyle(color: kDanger, height: 1.4)),
              ],
              const SizedBox(height: 28),
              FilledButton(
                onPressed: _busy ? null : _unlock,
                child: Text(_busy ? 'Abrindo...' : 'Entrar'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
