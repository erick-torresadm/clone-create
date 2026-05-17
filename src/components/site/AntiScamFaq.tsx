import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";

const FAQ = [
  {
    q: "Como sei que isso não é golpe?",
    a: (
      <>
        Trabalhamos com pagamento via PIX intermediado pela <b>Asaas</b> (instituição de pagamento
        regulada pelo Banco Central). Você só recebe o produto após o pagamento ser confirmado, e
        nós oferecemos garantia de <b>7 dias</b> com reposição automática. Se o perfil não logar,
        substituímos ou devolvemos o dinheiro. Veja nossa{" "}
        <Link to="/garantia" className="text-primary underline-offset-2 hover:underline">
          política de garantia completa
        </Link>
        .
      </>
    ),
  },
  {
    q: "E se o produto não funcionar?",
    a: (
      <>
        Tem <b>7 dias de garantia de login</b>. Se o perfil não logar nesse período, fazemos a
        reposição imediata. Se não tivermos estoque pra repor, devolvemos 100% do valor pago via
        PIX em até 2 dias úteis na mesma chave da origem do pagamento.
      </>
    ),
  },
  {
    q: "Quanto tempo demora a entrega?",
    a: (
      <>
        A entrega é <b>100% automática</b> após a confirmação do PIX (geralmente menos de 2
        minutos). Os dados de acesso são enviados pra dentro da sua conta no site e também por
        e-mail. Você não precisa esperar atendimento humano pra receber.
      </>
    ),
  },
  {
    q: "Vocês têm CNPJ? Posso pedir nota fiscal?",
    a: (
      <>
        Sim. Operamos com CNPJ ativo e emitimos nota fiscal para clientes pessoa jurídica
        mediante solicitação. Basta abrir um chamado pelo{" "}
        <Link to="/contato" className="text-primary underline-offset-2 hover:underline">
          suporte
        </Link>{" "}
        informando os dados de faturamento.
      </>
    ),
  },
  {
    q: "Posso falar com alguém antes de comprar?",
    a: (
      <>
        Claro. Use o botão de chat no canto inferior direito ou a{" "}
        <Link to="/contato" className="text-primary underline-offset-2 hover:underline">
          página de contato
        </Link>
        . Respondemos em até <b>5 minutos</b> no horário comercial (seg-sex 9h–22h, sáb 9h–18h).
      </>
    ),
  },
  {
    q: "O perfil é meu pra sempre?",
    a: (
      <>
        Sim, depois da entrega o perfil passa a ser de sua responsabilidade. A garantia cobre que
        ele logue normalmente. Bloqueios feitos pela Meta após o uso (descumprimento das políticas
        de anúncio, IP ruim, etc) <b>não são cobertos</b> — leia as{" "}
        <Link to="/dicas" className="text-primary underline-offset-2 hover:underline">
          dicas de aquecimento
        </Link>{" "}
        antes de subir campanha.
      </>
    ),
  },
];

export function AntiScamFaq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="mt-16 sm:mt-20">
      <div className="mb-6 text-center sm:mb-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <HelpCircle className="h-3.5 w-3.5" /> Dúvidas frequentes
        </span>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          As perguntas que todo mundo faz antes de comprar
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Respostas honestas, sem enrolação.
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-2">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className={`overflow-hidden rounded-xl border transition-colors ${
                isOpen ? "border-primary/40 bg-primary/5" : "border-border bg-card"
              }`}
            >
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-foreground sm:text-base">{item.q}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
