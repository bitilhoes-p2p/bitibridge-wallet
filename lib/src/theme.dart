// Tema da carteira — mesmo visual do painel BitiBridge (dark fintech).
//
// As cores vêm do design system já usado no site e nos e-mails: fundo #0a0e1a e
// acento ciano #00e0ff. Manter igual importa porque o usuário precisa reconhecer
// que é o mesmo produto — um app de dinheiro com cara diferente parece golpe.

import 'package:flutter/material.dart';

const Color kBackground = Color(0xFF0A0E1A);
const Color kSurface = Color(0xFF121829);
const Color kCyan = Color(0xFF00E0FF);
const Color kGold = Color(0xFFF5B301);
const Color kDanger = Color(0xFFFF5A5A);
const Color kTextMuted = Color(0xFF8A93A8);

ThemeData buildWalletTheme() {
  final ColorScheme scheme = const ColorScheme.dark().copyWith(
    primary: kCyan,
    secondary: kGold,
    surface: kSurface,
    error: kDanger,
    onPrimary: kBackground,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: kBackground,
    fontFamily: 'Roboto',
    appBarTheme: const AppBarTheme(
      backgroundColor: kBackground,
      elevation: 0,
      centerTitle: true,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: kCyan,
        foregroundColor: kBackground,
        minimumSize: const Size.fromHeight(52),
        textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: kCyan,
        minimumSize: const Size.fromHeight(52),
        side: const BorderSide(color: kCyan),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: kSurface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
    ),
  );
}
