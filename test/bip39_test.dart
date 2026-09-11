// Testes da geração das 12 palavras.
//
// Os oito vetores abaixo são os OFICIAIS do BIP39 (os de 128 bits do vectors.json
// da implementação de referência). Eles não são invenção nossa: qualquer carteira
// do mundo que implemente o padrão produz exatamente estas saídas para estas
// entradas. Se este teste passa, a nossa geração é compatível com Green, SideSwap,
// Ledger, Trezor e as demais — a mesma frase abre a mesma carteira em qualquer uma.

import "dart:convert";
import "dart:typed_data";

import "package:bitibridge_wallet/src/seed/bip39.dart";
import "package:bitibridge_wallet/src/seed/entropy.dart";
import "package:bitibridge_wallet/src/seed/wordlist_english.dart";
import "package:crypto/crypto.dart";
import "package:flutter_test/flutter_test.dart";

const List<Map<String, String>> kOfficialVectors = <Map<String, String>>[
  <String, String>{"entropy": "00000000000000000000000000000000", "mnemonic": "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"},
  <String, String>{"entropy": "7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f", "mnemonic": "legal winner thank year wave sausage worth useful legal winner thank yellow"},
  <String, String>{"entropy": "80808080808080808080808080808080", "mnemonic": "letter advice cage absurd amount doctor acoustic avoid letter advice cage above"},
  <String, String>{"entropy": "ffffffffffffffffffffffffffffffff", "mnemonic": "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong"},
  <String, String>{"entropy": "9e885d952ad362caeb4efe34a8e91bd2", "mnemonic": "ozone drill grab fiber curtain grace pudding thank cruise elder eight picnic"},
  <String, String>{"entropy": "c0ba5a8e914111210f2bd131f3d5e08d", "mnemonic": "scheme spot photo card baby mountain device kick cradle pact join borrow"},
  <String, String>{"entropy": "23db8160a31d3e0dca3688ed941adbf3", "mnemonic": "cat swing flag economy stadium alone churn speed unique patch report train"},
  <String, String>{"entropy": "f30f8c1da665478f49b001d94c5fc452", "mnemonic": "vessel ladder alter error federal sibling chat ability sun glass valve picture"},
];

Uint8List _hex(String s) {
  final Uint8List out = Uint8List(s.length ~/ 2);
  for (int i = 0; i < out.length; i++) {
    out[i] = int.parse(s.substring(i * 2, i * 2 + 2), radix: 16);
  }
  return out;
}

void main() {
  group("lista oficial de palavras", () {
    test("tem exatamente 2048 palavras, nas bordas certas", () {
      expect(kBip39English.length, 2048);
      expect(kBip39English.first, "abandon");
      expect(kBip39English.last, "zoo");
    });

    test("é byte a byte a lista canônica do BIP39", () {
      // Trava anti-adulteração: uma única palavra trocada muda este hash, e uma
      // seed gerada com a lista errada não abre em nenhuma outra carteira.
      final String joined = "${kBip39English.join("
")}
";
      expect(
        sha256.convert(utf8.encode(joined)).toString(),
        "2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda",
      );
    });

    test("não tem palavra repetida", () {
      expect(kBip39English.toSet().length, 2048);
    });
  });

  group("vetores oficiais do BIP39", () {
    for (final Map<String, String> v in kOfficialVectors) {
      test("entropia ${v["entropy"]} gera a frase esperada", () {
        expect(entropyToMnemonic(_hex(v["entropy"]!)), v["mnemonic"]);
      });

      test("a frase de ${v["entropy"]} volta à mesma entropia", () {
        expect(mnemonicToEntropy(v["mnemonic"]!), _hex(v["entropy"]!));
      });
    }
  });

  group("frase inválida é recusada", () {
    test("palavra fora da lista", () {
      expect(
        isValidMnemonic(
            "bitibridge abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about"),
        isFalse,
      );
    });

    test("checksum quebrado (última palavra trocada)", () {
      expect(
        isValidMnemonic(
            "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abuse"),
        isFalse,
      );
    });

    test("quantidade de palavras fora do padrão", () {
      expect(isValidMnemonic("abandon abandon abandon"), isFalse);
    });

    test("espaços extras e maiúsculas não invalidam uma frase correta", () {
      expect(
        isValidMnemonic(
            "  ABANDON abandon  abandon abandon abandon abandon abandon abandon abandon abandon abandon ABOUT "),
        isTrue,
      );
    });
  });

  group("geração de seed nova", () {
    test("entropia padrão tem 128 bits", () {
      expect(generateEntropy().length, 16);
    });

    test("tamanho fora do padrão é recusado", () {
      expect(() => generateEntropy(bits: 64), throwsArgumentError);
      expect(() => generateEntropy(bits: 129), throwsArgumentError);
    });

    test("gera 12 palavras válidas", () {
      final String m = generateMnemonic();
      expect(m.split(" ").length, 12);
      expect(isValidMnemonic(m), isTrue);
    });

    test("cinquenta seeds seguidas nunca se repetem", () {
      // Não prova aleatoriedade, mas pega o erro mais grave possível: uma semente
      // fixa entregando a MESMA carteira para todo mundo.
      final Set<String> seen = <String>{};
      for (int i = 0; i < 50; i++) {
        seen.add(generateMnemonic());
      }
      expect(seen.length, 50);
    });
  });
}
