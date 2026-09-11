import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../security/secure_screen.dart';
import '../theme.dart';
import '../vault/seed_vault.dart';
import 'welcome_screen.dart';

/// Define o PIN de 6 dígitos e só então grava a carteira no aparelho.
class PinSetupScreen extends StatefulWidget {
  const PinSetupScreen({super.key, required this.mnemonic, required this.vault});

  final String mnemonic;
  final SeedVault vault;

  @override
  State<PinSetupScreen> createState() => _PinSetupScreenState();
}

class _PinSetupScreenState extends State<PinSetupScreen> {
  final TextEditingController _pin = TextEditingController();
  final TextEditingController _confirm = TextEditingController();
  String? _error;
  bool _saving = false;

  Future<void> _save() async {
    final String pin = _pin.text.trim();
    if (pin.length != 6) {
      setState(() => _error = 'O PIN precisa ter 6 dígitos.');
      return;
    }
    if (pin != _confirm.text.trim()) {
      setState(() => _error = 'Os dois PINs não são iguais.');
      return;
    }
    setState(() {
      _error = null;
      _saving = true;
    });
    await widget.vault.saveSeed(widget.mnemonic, pin);
    if (!mounted) return;
    goHome(context, widget.vault);
  }

  @override
  void dispose() {
    _pin.dispose();
    _confirm.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SecureScreen(
      child: Scaffold(
        appBar: AppBar(title: const Text('Criar o PIN')),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const Text(
                  'O PIN protege a carteira neste aparelho. Ele não substitui as 12 palavras: se você trocar de celular, quem traz a carteira de volta são elas.',
                  style: TextStyle(color: kTextMuted, height: 1.5, fontSize: 15),
                ),
                const SizedBox(height: 24),
                _PinField(controller: _pin, label: 'PIN de 6 dígitos'),
                const SizedBox(height: 16),
                _PinField(controller: _confirm, label: 'Digite de novo'),
                if (_error != null) ...<Widget>[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: kDanger)),
                ],
                const SizedBox(height: 28),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? 'Guardando...' : 'Criar carteira'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PinField extends StatelessWidget {
  const _PinField({required this.controller, required this.label});

  final TextEditingController controller;
  final String label;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: true,
      keyboardType: TextInputType.number,
      maxLength: 6,
      inputFormatters: <TextInputFormatter>[FilteringTextInputFormatter.digitsOnly],
      style: const TextStyle(fontSize: 22, letterSpacing: 8),
      decoration: InputDecoration(labelText: label, counterText: ''),
    );
  }
}
