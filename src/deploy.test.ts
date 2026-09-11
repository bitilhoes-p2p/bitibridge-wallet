// Travas do que vai para o ar.
//
// A política de segurança de conteúdo é a defesa que impede um script injetado de
// ler a seed do usuário. Afrouxá-la é fácil e silencioso — por isso está travada
// aqui, e não só documentada.

import { describe, expect, it } from "vitest";

import dockerfile from "../Dockerfile?raw";
import nginxConf from "../nginx.conf?raw";

/**
 * Remove as linhas de comentário antes de verificar.
 *
 * Sem isto a trava acusa o próprio comentário que EXPLICA o que é proibido — erro
 * que já aconteceu três vezes neste repositório. A regra vale para o que o
 * servidor executa, não para o texto que documenta a regra.
 */
const semComentarios = (texto: string): string =>
  texto
    .split(/\r?\n/)
    .filter((linha) => !linha.trim().startsWith("#"))
    .join(" ");

const CSP = semComentarios(nginxConf);
const DOCKER = semComentarios(dockerfile);

describe("política de segurança do site", () => {
  it("não permite script nem estilo em linha", () => {
    // 'unsafe-inline' derruba a proteção inteira: com ele, um script injetado em
    // qualquer ponto da página executa normalmente.
    expect(CSP).not.toContain("'unsafe-inline'");
  });

  it("libera WebAssembly, mas não o eval comum", () => {
    // A Liquid Wallet Kit é WebAssembly e precisa de 'wasm-unsafe-eval'. Essa
    // permissão é estreita: deixa compilar módulo WebAssembly e NÃO deixa
    // executar texto como código, que é o que o 'unsafe-eval' comum permitiria.
    expect(CSP).toContain("'wasm-unsafe-eval'");
    expect(CSP).not.toContain("'unsafe-eval'");
  });

  it("o indexador é liberado nominalmente, e só ele", () => {
    // A carteira só pode falar com o servidor que consulta a blockchain. Qualquer
    // outro destino — inclusive um servidor nosso — está barrado pelo navegador.
    const connect = CSP.split("connect-src ")[1]?.split(";")[0] ?? "";
    expect(connect).toContain("'self'");
    expect(connect).toContain("https://blockstream.info");
    // Nenhum curinga: 'https:' ou '*' liberaria a internet inteira.
    expect(connect).not.toContain("*");
    expect(connect.includes("https: ")).toBe(false);
  });

  it("proíbe a carteira de ser embutida em iframe", () => {
    // Sem isto, um site de golpe embute wallet.bitibridge.com num iframe
    // invisível e captura os cliques do usuário.
    expect(CSP).toContain("frame-ancestors 'none'");
    expect(CSP).toContain('X-Frame-Options "DENY"');
  });

  it("nada é permitido por padrão", () => {
    expect(CSP).toContain("default-src 'none'");
  });

  it("a carteira não pode enviar dados para fora", () => {
    // Enquanto não houver integração com a rede Liquid, connect-src fica em
    // 'self' — ou seja, a carteira é incapaz de falar com qualquer servidor.
    expect(CSP).toContain("connect-src 'self'");
  });
});

describe("build de produção", () => {
  it("não injeta configuração em tempo de build", () => {
    // A carteira não tem chave, endereço de servidor nem flag. O que está no
    // repositório é o que roda — sem valor injetado que mude o comportamento.
    expect(DOCKER).not.toContain("ARG ");
    expect(DOCKER).not.toContain("ENV ");
  });

  it("respeita o lock das dependências", () => {
    // `npm install` resolveria versões novas a cada build, e o que sobe deixaria
    // de ser o que foi testado.
    expect(DOCKER).toContain("npm ci");
    expect(DOCKER).not.toContain("npm install");
  });
});
