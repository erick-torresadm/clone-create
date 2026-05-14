import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { BookOpen, Play, Download, KeyRound, Lock, Users, Building2, Flame, Mail, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/dicas")({
  head: () => ({
    meta: [
      { title: "Dicas & Tutoriais — Como usar seu perfil com segurança" },
      { name: "description", content: "Passo a passo de acesso, 2FA, troca de senha, criação de Fanpage, BM, aquecimento e e-mail temporário." },
      { property: "og:title", content: "Dicas & Tutoriais" },
      { property: "og:description", content: "Tudo que você precisa saber para acessar e aquecer seu perfil corretamente." },
    ],
  }),
  component: DicasPage,
});

function DicasPage() {
  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <BookOpen className="h-3.5 w-3.5" /> Manual do cliente
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Dicas & Tutoriais
          </h1>
          <p className="mt-3 text-muted-foreground">
            Tudo o que você precisa para acessar, configurar e aquecer seu perfil sem queimá-lo.
          </p>
        </div>

        {/* Vídeos */}
        <Section icon={<Play className="h-5 w-5" />} title="Tutoriais em vídeo">
          <div className="grid gap-3 sm:grid-cols-2">
            <VideoLink title="Como acessar o perfil com Cookies e Login/Senha" url="https://youtu.be/G4xxMqaAQQ4" />
            <VideoLink title="Erros comuns / Código 2FA / Acessar e-mail" url="https://youtu.be/iwGP759tnm4" />
            <VideoLink title="Erro de página que não cria" url="https://youtu.be/Erf4elV66QE" />
            <VideoLink title="Como logar um Proxy no Dolphin Anty" url="https://www.youtube.com/watch?v=d2-4OZ9oJCs" />
          </div>
        </Section>

        {/* Ferramentas */}
        <Section icon={<Download className="h-5 w-5" />} title="Baixar ferramentas">
          <div className="grid gap-3 sm:grid-cols-2">
            <ToolLink name="Lauth (gerador 2FA)" url="http://lauth.io/E6R9T" />
            <ToolLink name="Dolphin Anty (anti-detect)" url="https://tinyurl.com/torrescontigencia" />
          </div>
        </Section>

        {/* Dolphin */}
        <Section icon={<Lock className="h-5 w-5" />} title="Configurar o Dolphin Anty">
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Baixe o Dolphin Anty.</li>
            <li>Crie uma conta no Dolphin Anty.</li>
            <li>Instale o programa.</li>
            <li>Faça login com a conta criada.</li>
            <li>Conecte o proxy ao perfil.</li>
          </ol>
        </Section>

        {/* Login */}
        <Section icon={<KeyRound className="h-5 w-5" />} title="Login no perfil do Facebook">
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Abra o Dolphin Anty com o perfil criado.</li>
            <li>No navegador que abrir, acesse <code className="rounded bg-muted px-1">facebook.com</code>.</li>
            <li>Insira o login e senha fornecidos na entrega.</li>
            <li>Se pedir código 2FA, use o gerador (próxima seção).</li>
          </ol>
          <Tip>Se tiver problemas no login, assista ao tutorial de erros comuns.</Tip>
        </Section>

        {/* 2FA */}
        <Section icon={<ShieldCheck className="h-5 w-5" />} title="Acessar via 2FA (autenticação de 2 fatores)">
          <p className="mb-3 text-muted-foreground">
            Esse é o passo <b>mais importante</b> para evitar que o Facebook peça verificação por SMS.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Abra o navegador (ou perfil no Dolphin) com os cookies importados, se houver.</li>
            <li>Insira login e senha no Facebook.</li>
            <li>Quando pedir o código de 6 dígitos, acesse <a className="text-primary hover:underline" href="https://2fa.live/" target="_blank" rel="noreferrer">2fa.live</a>.</li>
            <li>Cole a <b>chave secreta</b> (recebida na entrega) no campo indicado e clique em <b>Submit</b>.</li>
            <li>Copie o código gerado e cole no Facebook.</li>
          </ol>
          <Tip>Mantenha o 2fa.live aberto ao lado do Facebook para copiar o código em tempo real.</Tip>
        </Section>

        {/* Trocar senha */}
        <Section icon={<Lock className="h-5 w-5" />} title="Trocar senha do Facebook" tone="warn">
          <p className="mb-3 text-muted-foreground">
            <b>Atenção:</b> trocar a senha logo após o login pode disparar checkpoint. Aguarde de <b>12h a 24h</b>.
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Vá em <b>Configurações e Privacidade → Configurações → Central de Contas (Meta)</b>.</li>
            <li>Clique em <b>Senha e Segurança → Alterar senha</b>.</li>
            <li>Selecione o perfil, digite a senha atual e a nova.</li>
            <li>Quando o Facebook perguntar se quer desconectar outros aparelhos, selecione <b>Sim</b>.</li>
          </ol>
        </Section>

        {/* Fanpage */}
        <Section icon={<Users className="h-5 w-5" />} title="Criar uma Fanpage">
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>No feed, clique em <b>Páginas</b> no menu lateral.</li>
            <li>Clique em <b>Criar nova página</b>, defina nome, categoria e biografia.</li>
            <li>Adicione foto de perfil e capa para dar veracidade ao perfil perante o algoritmo.</li>
            <li>Para vincular uma página existente: <b>Configurações da Página → Nova Experiência → Adicionar Novo</b> e insira o e-mail do perfil.</li>
          </ol>
        </Section>

        {/* BM */}
        <Section icon={<Building2 className="h-5 w-5" />} title="Adicionar Business Manager (BM)">
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>O cliente copia o <b>link de convite</b> da BM.</li>
            <li>Cola o link na barra de endereços do navegador onde o perfil comprado está aberto.</li>
            <li>Digite o nome que deseja usar dentro da BM (qualquer um).</li>
            <li>Clique em <b>Continuar</b> e finalize com a senha do perfil, se solicitado.</li>
          </ol>
        </Section>

        {/* Aquecimento */}
        <Section icon={<Flame className="h-5 w-5" />} title="Checklist de aquecimento (pós-venda)">
          <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
            <li><b>Não suba campanha nas primeiras 24h.</b> Deixe o perfil "respirar" no novo IP.</li>
            <li><b>Interaja como humano:</b> curta 2-3 fotos, assista um vídeo no Watch.</li>
            <li><b>Verifique o IP:</b> use proxies de qualidade ou 4G — sempre IPs brasileiros ou compatíveis.</li>
          </ul>

          <h3 className="mt-6 text-base font-bold text-foreground">Perfil sem aquecer (primeiros 4 dias)</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>No primeiro acesso, deixe parado no IP por <b>40 a 50 minutos</b>.</li>
            <li>Entre em <b>3 a 5 grupos</b> da sua região.</li>
            <li>Compartilhe <b>3 a 5 posts</b> com interesses variados.</li>
            <li>Assista vídeos por <b>30 a 50 minutos</b>.</li>
            <li>Repita por cerca de 4 dias.</li>
          </ol>

          <h3 className="mt-6 text-base font-bold text-foreground">Perfil aquecido (após 4 dias)</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Continue compartilhando algumas publicações.</li>
            <li>Antes de qualquer ação, deixe parado no IP por ~40 minutos.</li>
            <li>Entre cada ação para subir anúncio, espere alguns minutos. <b>Nunca faça tudo de uma vez.</b></li>
            <li>Se der erro, espere <b>1 a 2 horas</b> antes de tentar novamente.</li>
          </ol>
          <Tip>O segredo é parecer um usuário real. Ações graduais e pausas entre elas são fundamentais.</Tip>
        </Section>

        {/* E-mail temporário */}
        <Section icon={<Mail className="h-5 w-5" />} title="E-mail temporário (Invertexto)">
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>Acesse <a className="text-primary hover:underline" href="https://invertexto.com/gerador-email-temporario" target="_blank" rel="noreferrer">invertexto.com/gerador-email-temporario</a>.</li>
            <li>Um endereço aleatório é gerado automaticamente.</li>
            <li>Copie o e-mail clicando no botão ao lado do endereço.</li>
            <li>Não feche a aba — a caixa de entrada fica logo abaixo.</li>
            <li>Quando a mensagem chegar, clique para visualizar e copiar o código.</li>
            <li>Se demorar, clique em <b>Atualizar</b> para forçar a busca.</li>
          </ol>
          <Tip>Mantenha a aba aberta enquanto aguarda códigos de verificação.</Tip>
        </Section>

        <div className="mt-12 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Ainda com dúvidas?</p>
          <Link to="/contato" className="mt-2 inline-block text-base font-semibold text-primary hover:underline">
            Falar com o suporte →
          </Link>
        </div>
      </div>
    </Layout>
  );
}

function Section({ icon, title, children, tone }: { icon: React.ReactNode; title: string; children: React.ReactNode; tone?: "warn" }) {
  return (
    <section className={`mt-8 rounded-2xl border p-6 ${tone === "warn" ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        <h2 className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
      💡 <b>Dica:</b> {children}
    </p>
  );
}

function VideoLink({ title, url }: { title: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition hover:border-primary/50"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-500">
        <Play className="h-4 w-4 fill-current" />
      </span>
      <span className="text-sm font-medium text-foreground group-hover:text-primary">{title}</span>
    </a>
  );
}

function ToolLink({ name, url }: { name: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-xl border border-border bg-background p-3 transition hover:border-primary/50"
    >
      <span className="text-sm font-medium text-foreground">{name}</span>
      <Download className="h-4 w-4 text-muted-foreground" />
    </a>
  );
}
