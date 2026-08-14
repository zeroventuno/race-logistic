import { describe, expect, it } from "vitest";

import {
  BIND_CODE_LENGTH,
  formatBindCode,
  generateBindCode,
  generateUniqueBindCode,
  normalizeBindCode,
} from "@/lib/codes/bind-code";
import {
  bearerFromHeader,
  generateSessionToken,
  hashSessionToken,
  timingSafeEqual,
} from "@/lib/codes/session-token";

describe("generateBindCode", () => {
  it("gera códigos do tamanho certo e só com símbolos do alfabeto", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateBindCode();
      expect(code).toHaveLength(BIND_CODE_LENGTH);
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{6}$/);
      expect(code).not.toMatch(/[ILOU]/);
    }
  });

  it("não colide de forma perceptível em 20 mil gerações", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20_000; i++) seen.add(generateBindCode());
    // Com 32^6 ≈ 1,07e9 posições, o esperado é ~0,2 colisão em 20 mil.
    expect(seen.size).toBeGreaterThan(19_990);
  });

  it("distribui os símbolos sem viés grosseiro", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 5_000; i++) {
      for (const ch of generateBindCode()) {
        counts.set(ch, (counts.get(ch) ?? 0) + 1);
      }
    }

    expect(counts.size).toBe(32);

    const values = [...counts.values()];
    const expected = (5_000 * BIND_CODE_LENGTH) / 32;
    for (const v of values) {
      expect(v).toBeGreaterThan(expected * 0.75);
      expect(v).toBeLessThan(expected * 1.25);
    }
  });

  it("evita códigos já usados", () => {
    // Gerador viciado que sempre devolve o mesmo byte na primeira chamada.
    let call = 0;
    const fakeRandom = (n: number) => {
      const bytes = new Uint8Array(n);
      bytes.fill(call === 0 ? 5 : 7);
      call++;
      return bytes;
    };

    const first = generateBindCode(fakeRandom);
    call = 0;
    const code = generateUniqueBindCode(new Set([first]), 20, fakeRandom);

    expect(code).not.toBe(first);
  });
});

describe("normalizeBindCode", () => {
  it("aceita a forma canônica", () => {
    expect(normalizeBindCode("A1B2C3")).toBe("A1B2C3");
  });

  it("aceita minúsculas, hífen e espaços", () => {
    expect(normalizeBindCode("a1b-2c3")).toBe("A1B2C3");
    expect(normalizeBindCode("  A1B 2C3 ")).toBe("A1B2C3");
    expect(normalizeBindCode("a1b.2c3")).toBe("A1B2C3");
  });

  it("corrige as confusões clássicas de leitura", () => {
    // O motorista leu "O" onde estava "0", "I" onde estava "1".
    expect(normalizeBindCode("ABCDIO")).toBe("ABCD10");
    expect(normalizeBindCode("LLLLLL")).toBe("111111");
  });

  it("NÃO mexe em Q, que é símbolo válido do alfabeto", () => {
    // Regressão: mapear Q→0 fazia todo código sorteado com Q ser recusado.
    expect(normalizeBindCode("QQQQQQ")).toBe("QQQQQQ");
    expect(normalizeBindCode("Q0Q0Q0")).toBe("Q0Q0Q0");
  });

  it("recusa U em vez de adivinhar", () => {
    // U não está no alfabeto, então é erro de digitação — mas convertê-lo em V
    // poderia acertar o código de outra posição e vincular o veículo errado.
    expect(normalizeBindCode("UUUUUU")).toBeNull();
    expect(normalizeBindCode("ABCDEU")).toBeNull();
  });

  it("rejeita comprimento errado e lixo", () => {
    expect(normalizeBindCode("A1B2C")).toBeNull();
    expect(normalizeBindCode("A1B2C34")).toBeNull();
    expect(normalizeBindCode("")).toBeNull();
    expect(normalizeBindCode("!!!!!!")).toBeNull();
    // @ts-expect-error entrada não-string vem de JSON não confiável
    expect(normalizeBindCode(null)).toBeNull();
    // @ts-expect-error idem
    expect(normalizeBindCode(12345)).toBeNull();
  });

  it("um código gerado sempre sobrevive à normalização", () => {
    for (let i = 0; i < 1_000; i++) {
      const code = generateBindCode();
      expect(normalizeBindCode(code)).toBe(code);
      expect(normalizeBindCode(formatBindCode(code))).toBe(code);
      expect(normalizeBindCode(code.toLowerCase())).toBe(code);
    }
  });
});

describe("token de sessão", () => {
  it("gera tokens únicos e opacos", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1_000; i++) {
      const t = generateSessionToken();
      expect(t.length).toBeGreaterThanOrEqual(42);
      expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
      seen.add(t);
    }
    expect(seen.size).toBe(1_000);
  });

  it("o hash é estável e diferente do token", async () => {
    const token = generateSessionToken();
    const h1 = await hashSessionToken(token);
    const h2 = await hashSessionToken(token);

    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
    expect(h1).not.toBe(token);
    expect(await hashSessionToken(generateSessionToken())).not.toBe(h1);
  });

  it("timingSafeEqual compara corretamente", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
    expect(timingSafeEqual("", "")).toBe(true);
  });

  it("extrai o token do cabeçalho Authorization", () => {
    expect(bearerFromHeader("Bearer abc123")).toBe("abc123");
    expect(bearerFromHeader("bearer abc123")).toBe("abc123");
    expect(bearerFromHeader("  Bearer   abc123  ")).toBe("abc123");
    expect(bearerFromHeader("Basic abc123")).toBeNull();
    expect(bearerFromHeader(null)).toBeNull();
    expect(bearerFromHeader("Bearer")).toBeNull();
    expect(bearerFromHeader("")).toBeNull();
  });
});
