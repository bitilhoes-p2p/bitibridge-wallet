// Marca circular de cada ativo.
//
// Hoje são desenhos NOSSOS, simples e neutros — não são os logos oficiais. Eles
// existem para o layout ficar pronto e não parecer imagem quebrada.
//
// COMO TROCAR PELO LOGO OFICIAL: substitua o conteúdo de cada <svg> pelo arquivo
// oficial. O desenho precisa ficar EMBUTIDO aqui (ou virar data URI), porque a
// política de segurança do site proíbe carregar imagem de outro endereço — o que
// também evita que um servidor de terceiro saiba que alguém abriu a carteira.

export function DepixIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="DePix">
      <circle cx="20" cy="20" r="20" fill="#0E7C86" />
      <circle cx="20" cy="20" r="13" fill="none" stroke="#7FE7DC" strokeWidth="2.5" />
      <path
        d="M15 13.5h4.5c3.6 0 6.5 2.9 6.5 6.5s-2.9 6.5-6.5 6.5H15z"
        fill="none"
        stroke="#7FE7DC"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LbtcIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="L-BTC">
      <circle cx="20" cy="20" r="20" fill="#1E8E8A" />
      <text
        x="20"
        y="27"
        textAnchor="middle"
        fontSize="20"
        fontWeight="700"
        fill="#F7F9FA"
        fontFamily="Inter, system-ui, sans-serif"
      >
        B
      </text>
    </svg>
  );
}
