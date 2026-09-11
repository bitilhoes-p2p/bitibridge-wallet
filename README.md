# Carteira BitiBridge

Carteira **Liquid não-custodial** da BitiBridge. As suas 12 palavras nascem no seu
aparelho, ficam no seu aparelho e nunca são enviadas para lugar nenhum.

> ⚠️ **Em construção.** Já dá para criar e restaurar a carteira, mas ela ainda não
> fala com a rede Liquid — não mostra saldo nem envia. Este repositório é aberto
> desde o primeiro dia justamente para que a parte mais sensível — a geração da sua
> seed — possa ser conferida por qualquer pessoa, antes de existir produto.

## O que já funciona

| | |
|---|---|
| Criar carteira | 12 palavras geradas no aparelho |
| Backup obrigatório | o app sorteia 3 palavras e pede de volta |
| Restaurar | a partir das 12 palavras, com conferência de checksum |
| PIN de 6 dígitos | a seed é **cifrada com o PIN** antes de ser guardada |
| Cofre do sistema | Keystore no Android, Keychain no iOS |
| Captura de tela | bloqueada em toda tela que mostra as palavras |
| Limite de tentativas | 10 PINs errados apagam a carteira do aparelho |

**Ainda não:** saldo, endereço de recebimento, envio (dependem da integração com a
rede Liquid) e desbloqueio por biometria.

### Como a sua seed é guardada

A frase **não** fica em claro em lugar nenhum. Ela é cifrada em AES-256-GCM com uma
chave derivada do seu PIN (PBKDF2-SHA256, 210 mil iterações), e só o resultado
cifrado vai para o cofre do sistema. São duas camadas independentes: o cofre impede
que outro aplicativo leia o arquivo; a cifragem protege caso alguém consiga o
arquivo mesmo assim.

Sendo honesto sobre o limite: um PIN de 6 dígitos tem só um milhão de combinações.
Quem segura o ataque de verdade é o cofre do sistema somado ao limite de 10
tentativas. O PIN protege o aparelho — **quem garante o seu dinheiro são as 12
palavras no papel.**

## O que "não-custodial" significa aqui

A BitiBridge **não tem** e **não pode obter** as chaves da sua carteira. Isso tem
um lado bom e um lado sério:

- **Bom:** ninguém pode bloquear, congelar ou gastar o seu saldo. Nem nós, nem
  ninguém que nos pressione.
- **Sério:** se você perder as 12 palavras e o aparelho, **nós não temos como
  recuperar**. Não existe "esqueci minha senha". Anote as palavras no papel.

## Como conferir a geração da sua seed

Esta é a pergunta que importa: *"como sei que vocês não conseguem adivinhar minha
carteira?"*. São três arquivos pequenos, e você não precisa acreditar em nós — os
testes provam.

| Arquivo | O que faz |
|---|---|
| [`lib/src/seed/entropy.dart`](lib/src/seed/entropy.dart) | De onde vem a aleatoriedade. ~45 linhas. |
| [`lib/src/seed/bip39.dart`](lib/src/seed/bip39.dart) | Transforma aleatoriedade em 12 palavras. ~110 linhas. |
| [`lib/src/seed/wordlist_english.dart`](lib/src/seed/wordlist_english.dart) | As 2048 palavras oficiais do padrão. |

**A aleatoriedade vem do gerador criptográfico do sistema operacional** do seu
celular (`Random.secure()` do Dart), o mesmo que o sistema usa para chaves de
criptografia — nunca de um gerador comum, de relógio, ou de qualquer dado seu.
Se o aparelho não oferecer essa fonte, o app **falha** em vez de gerar uma seed
fraca.

### Rodando os testes você mesmo

```
flutter test
```

O que eles provam:

1. **Compatibilidade com o padrão mundial.** Os 8 vetores oficiais do BIP39 estão
   em [`test/bip39_test.dart`](test/bip39_test.dart). São entradas e saídas fixas,
   publicadas na especificação. Se batem, a sua frase abre a mesma carteira no
   Green, no SideSwap, no Ledger, no Trezor — em qualquer carteira do mundo. Você
   nunca fica preso a nós.
2. **Lista de palavras intacta.** O teste confere o SHA-256 da lista contra o valor
   canônico `2f5eed53…3b24dbda`. Uma única palavra trocada quebra o teste.
3. **Nenhuma semente fixa.** 50 seeds seguidas, 50 resultados diferentes — o teste
   falha se alguém tentar entregar a mesma carteira para todo mundo.

## Promessas de código

Estas regras valem para sempre neste repositório, e qualquer violação é bug grave:

- A seed, a chave privada e o descritor **nunca** são gravados em log.
- **Nunca** são enviados a servidor nenhum, nosso ou de terceiro.
- **Nunca** entram em analytics ou relatório de erro.
- As telas que mostram as palavras **bloqueiam captura de tela**.

## Estrutura

```
lib/src/seed/    geração e validação das 12 palavras (auditável, sem dependências)
test/            vetores oficiais do BIP39 e travas anti-adulteração
assets/          lista oficial de palavras, cópia literal da especificação
```

## Licença

MIT — veja [LICENSE](LICENSE).
