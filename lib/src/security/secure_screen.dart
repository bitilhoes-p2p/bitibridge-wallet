// Liga e desliga o bloqueio de captura de tela do sistema.
//
// Envolva qualquer tela que mostre as 12 palavras no widget [SecureScreen]: ele
// liga o FLAG_SECURE ao entrar e desliga ao sair. Com a flag ligada, o Android
// recusa print, gravação de tela e até a miniatura no alternador de aplicativos.
//
// Importante: isso NÃO protege contra alguém fotografando a tela com outro
// celular. É por isso que o texto na tela manda anotar no papel, e não tirar foto.

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

const MethodChannel _channel = MethodChannel('com.bitibridge/secure_screen');

Future<void> enableSecureScreen() async {
  try {
    await _channel.invokeMethod<bool>('enable');
  } on PlatformException {
    // Plataforma sem suporte (ex.: teste, desktop) não derruba o fluxo.
  } on MissingPluginException {
    // idem
  }
}

Future<void> disableSecureScreen() async {
  try {
    await _channel.invokeMethod<bool>('disable');
  } on PlatformException {
    // ignora
  } on MissingPluginException {
    // ignora
  }
}

/// Envolve uma tela sensível: liga o bloqueio ao entrar, desliga ao sair.
class SecureScreen extends StatefulWidget {
  const SecureScreen({super.key, required this.child});

  final Widget child;

  @override
  State<SecureScreen> createState() => _SecureScreenState();
}

class _SecureScreenState extends State<SecureScreen> {
  @override
  void initState() {
    super.initState();
    enableSecureScreen();
  }

  @override
  void dispose() {
    disableSecureScreen();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
