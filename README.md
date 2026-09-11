# Carteira BitiBridge

Carteira **Liquid não-custodial** da BitiBridge, que roda no navegador em
[wallet.bitibridge.com](https://wallet.bitibridge.com). As suas 12 palavras nascem
no seu navegador, ficam no seu navegador e nunca são enviadas para lugar nenhum.

> ⚠️ **Em construção.** Já dá para criar e restaurar a carteira, mas ela ainda não
> fala com a rede Liquid — não mostra saldo nem envia. Este repositório é aberto
> desde o primeiro dia justamente para que a parte mais sensível — a geração da sua
> seed — possa ser conferida por qualquer pessoa, antes de existir produto.

## O que já funciona

| | |
|---|---|
| Criar carteira | 12 palavras geradas no seu navegador |
| Backup obrigatório | o app sorteia 3 palavras e pede de volta |
| Restaurar | a partir das 12 palavras, com conferência de checksum |
| PIN de 6 dígitos | a seed é **cifrada com o PIN** antes de ser guardada |
| Limite de tentativas | 10 PINs errados apagam a carteira deste navegador |

**Ainda não:** saldo, endereço de recebimento e envio — dependem da integração com
a rede Liquid, que é a próxima etapa.

## Como conferir a geração da sua seed

Esta é a pergunta que importa: *"como sei que vocês não conseguem adivinhar minha
carteira?"*. São três arquivos pequenos, e você não precisa acreditar em nós — os
testes provam.

| Arquivo | O que faz |
|---|---|
| [`src/lib/seed/entropy.ts`](src/lib/seed/entropy.ts) | De onde vem a aleatoriedade. ~40 linhas. |
| [`src/lib/seed/bip39.ts`](src/lib/seed/bip39.ts) | Transforma aleatoriedade em 12 palavras. ~105 linhas. |
| [`src/lib/seed/wordlist.ts`](src/lib/seed/wordlist.ts) | As 2048 palavras oficiais do padrão. |

**A aleatoriedade vem de `crypto.getRandomValues`**, o gerador criptográfico do
navegador — o mesmo que gera as chaves das suas conexões seguras. Nunca do
`Math.random()`, que é previsível; o CI falha se essa função aparecer no caminho da
seed.

### Rodando os testes você mesmo

```
npm install
npm test
```

O que eles provam:

1. **Compatibilidade com o padrão mundial.** Os 8 vetores oficiais do BIP39 estão
   em [`src/lib/seed/bip39.test.ts`](src/lib/seed/bip39.test.ts). São entradas e
   saídas fixas, publicadas na especificação. Se batem, a sua frase abre a mesma
   carteira no Green, no SideSwap, no Ledger, no Trezor — em qualquer carteira do
   mundo. Você nunca fica preso a nós.
2. **Lista de palavras intacta.** O teste confere o SHA-256 da lista contra o valor
   canônico `2f5eed53…3b24dbda`. Uma única palavra trocada quebra o teste.
3. **Nenhuma semente fixa.** 50 seeds seguidas, 50 resultados diferentes — o teste
   falha se alguém tentar entregar a mesma carteira para todo mundo.

## Como a sua seed é guardada

A frase **não** fica em claro em lugar nenhum. Ela é cifrada em AES-256-GCM com uma
chave derivada do seu PIN (PBKDF2-SHA256, 210 mil iterações), usando o WebCrypto do
próprio navegador — sem biblioteca de terceiros. Só o resultado cifrado é gravado.

**Sendo honesto sobre o limite, porque num navegador ele é maior:** um PIN de 6
dígitos tem só um milhão de combinações, e aqui não existe cofre de hardware para
frear as tentativas como num aplicativo instalado. O PIN protege contra alguém que
sente no seu computador; ele não protege contra tudo. **Quem garante o seu dinheiro
são as 12 palavras no papel** — e, por enquanto, não guarde valores altos aqui.

## Conferindo o que o servidor entregou

Toda build publica no [CI](../../actions) o SHA-256 de cada arquivo gerado. Quem
quiser verificar que `wallet.bitibridge.com` está servindo exatamente o que este
repositório compilou pode baixar os arquivos e comparar os hashes.

É a conferência possível num site, e ela tem um limite honesto: o código é
reentregue pelo servidor a cada visita, então a verificação vale para o momento em
que você a fez.

## Promessas de código

Estas regras valem para sempre neste repositório, e qualquer violação é bug grave:

- A seed e a chave privada **nunca** vão para console, analytics ou rede.
- **Nunca** são enviadas a servidor nenhum, nosso ou de terceiro.
- `Math.random()` **nunca** entra no caminho da seed.

As três são verificadas pelo CI a cada alteração.

## Estrutura

```
src/lib/seed/     geração e validação das 12 palavras (auditável, sem dependências)
src/lib/vault/    cifragem com o PIN e armazenamento no navegador
src/lib/backup/   sorteio e conferência das 3 palavras
src/App.tsx       o fluxo das telas
assets/           lista oficial de palavras, cópia literal da especificação
```

## Licença

MIT — veja [LICENSE](LICENSE).
