import Link from "next/link";

/**
 * Porta de entrada.
 *
 * Duas superfícies, dois públicos, nenhuma ambiguidade. O motorista chega aqui
 * pelo QR code ou pelo link que o diretor mandou no grupo, e não pode ter que
 * decidir nada — o caminho dele é o botão grande.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-10 px-6 py-16">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
          Race Logistic
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
          Direção de prova ao vivo
        </h1>
        <p className="mt-3 text-ink-muted">
          Posições de apoio no mapa em tempo real, janela entre carro de
          abertura e vassoura calculada pelo percurso, e alertas que chegam à
          direção com o apoio mais próximo já sugerido.
        </p>
      </header>

      <nav className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/motorista"
          className="touch-target group rounded-xl border border-border-strong bg-surface-2 p-6 transition hover:border-info hover:bg-surface-3"
        >
          <span className="text-2xl">🚗</span>
          <h2 className="mt-3 text-lg font-semibold text-ink">Sou motorista</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Digite o código de 6 caracteres que a direção passou e o celular
            vira o GPS da sua posição.
          </p>
        </Link>

        <Link
          href="/dashboard"
          className="touch-target group rounded-xl border border-border bg-surface-1 p-6 transition hover:border-border-strong hover:bg-surface-2"
        >
          <span className="text-2xl">🎛️</span>
          <h2 className="mt-3 text-lg font-semibold text-ink">
            Sou da direção
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Cadastrar prova, carregar percurso, gerar códigos e acompanhar a
            operação.
          </p>
        </Link>
      </nav>
    </main>
  );
}
