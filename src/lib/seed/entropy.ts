// De onde nascem as 12 palavras.
//
// Este é o arquivo que responde à pergunta "posso confiar que vocês não
// conseguem adivinhar minha seed?". São poucas linhas de propósito: quanto menor,
// mais fácil de auditar.
//
// A aleatoriedade vem de `crypto.getRandomValues`, o gerador criptográfico do
// navegador — o mesmo usado para gerar chaves de TLS e sessões bancárias. Não é
// o `Math.random()`, que é previsível e JAMAIS pode aparecer neste arquivo.
//
// O que NUNCA pode entrar aqui:
//   - `Math.random()`, em nenhuma hipótese;
//   - semente fixa, "para facilitar o teste";
//   - qualquer valor derivado de e-mail, CPF, horário ou identificador do navegador.

import { ALLOWED_ENTROPY_BITS, Bip39Error, entropyToMnemonic } from "./bip39";

/**
 * Gera `bits` de entropia criptográfica. O padrão, 128 bits, dá 12 palavras.
 *
 * 128 bits significam 2^128 seeds possíveis — o mesmo patamar de segurança que
 * protege a maior parte do Bitcoin em circulação.
 */
export function generateEntropy(bits = 128): Uint8Array {
  if (!(ALLOWED_ENTROPY_BITS as readonly number[]).includes(bits)) {
    throw new Bip39Error(`Entropia de ${bits} bits não é válida no BIP39`);
  }
  const bytes = new Uint8Array(bits / 8);
  crypto.getRandomValues(bytes);
  return bytes;
}

/**
 * Gera uma frase nova de 12 palavras, pronta para o usuário anotar.
 *
 * É a ÚNICA porta de criação de carteira do app — não existe outro caminho que
 * produza seed.
 */
export async function generateMnemonic(bits = 128): Promise<string> {
  return entropyToMnemonic(generateEntropy(bits));
}
