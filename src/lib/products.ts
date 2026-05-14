import perfilBR from "@/assets/perfil-br.jpg";
import perfilExpert from "@/assets/perfil-expert.jpg";
import perfilUSA from "@/assets/perfil-usa.jpg";
import perfilPro from "@/assets/perfil-pro.jpg";

export type Product = {
  id: string;
  name: string;
  oldPrice: number;
  price: number;
  sold?: number;
  description?: string;
  rating?: number;
  reviews?: number;
  image?: string;
  badge?: string;
  stock?: number | null;
  tags?: string[];
};

export type Section = {
  title: string;
  products: Product[];
};

const defaultDesc = `Entrega 100% automática após confirmação do pagamento.

✅ Perfil original e garantido
✅ Suporte 24/7 via Telegram
✅ Reposição em caso de queda nas primeiras 24h
✅ Tutorial completo de uso

Antes de comprar, leia atentamente a descrição. Após o pagamento via Pix, o acesso é enviado para o seu e-mail cadastrado em poucos minutos.`;

export const SECTIONS: Section[] = [
  {
    title: "🇧🇷 Perfis Brasileiros — Básicos (sem aquecimento)",
    products: [
      { id: "br-comum", name: "Perfil BR — Comum", oldPrice: 149, price: 90, sold: 1240, rating: 4.9, reviews: 312, image: perfilBR, description: defaultDesc },
      { id: "br-verificado", name: "Perfil BR — Verificado", oldPrice: 179, price: 110, sold: 980, rating: 4.9, reviews: 220, image: perfilBR, description: defaultDesc },
      { id: "br-restabelecido", name: "Perfil BR — Restabelecido", oldPrice: 219, price: 135, sold: 740, rating: 4.8, reviews: 180, image: perfilBR, description: defaultDesc },
    ],
  },
  {
    title: "🇧🇷 Prontos pra Rodar (com BM 300)",
    products: [
      { id: "br-bm-comum", name: "BM 300 — Comum", oldPrice: 249, price: 150, sold: 860, rating: 4.9, reviews: 240, image: perfilBR, badge: "BM 300", description: defaultDesc },
      { id: "br-bm-verificado", name: "BM 300 — Verificado", oldPrice: 299, price: 180, sold: 640, rating: 4.9, reviews: 190, image: perfilBR, badge: "BM 300", description: defaultDesc },
      { id: "br-bm-restabelecido", name: "BM 300 — Restabelecido", oldPrice: 329, price: 197, sold: 510, rating: 4.9, reviews: 160, image: perfilBR, badge: "BM 300", description: defaultDesc },
    ],
  },
  {
    title: "🔺 Linha Expert (Restabelecidos)",
    products: [
      { id: "expert-junior", name: "Expert Júnior", oldPrice: 329, price: 197, sold: 420, rating: 4.9, reviews: 130, image: perfilExpert, badge: "Expert", description: defaultDesc },
      { id: "expert-premium", name: "Expert Premium (1–2 meses)", oldPrice: 429, price: 257, sold: 310, rating: 4.9, reviews: 95, image: perfilExpert, badge: "Premium", description: defaultDesc },
      { id: "expert-master", name: "Expert Máster (3+ meses)", oldPrice: 497, price: 297, sold: 220, rating: 5.0, reviews: 70, image: perfilExpert, badge: "Máster", description: defaultDesc },
    ],
  },
  {
    title: "🇺🇸 Opções Gringas (USA) — Novo Método",
    products: [
      { id: "usa-aquecido", name: "USA — Perfil Aquecido", oldPrice: 329, price: 197, sold: 380, rating: 4.9, reviews: 110, image: perfilUSA, badge: "USA", description: defaultDesc },
      { id: "usa-aquecido-bm", name: "USA — Aquecido + BM", oldPrice: 419, price: 250, sold: 290, rating: 4.9, reviews: 88, image: perfilUSA, badge: "USA + BM", description: defaultDesc },
      { id: "usa-aquecido-bm-proxy", name: "USA — Aquecido + BM + Proxy", oldPrice: 497, price: 297, sold: 210, rating: 5.0, reviews: 64, image: perfilUSA, badge: "USA Full", description: defaultDesc },
    ],
  },
  {
    title: "🔺🇧🇷 Perfil PRO (Restabelecido Selfie) — Mais vendidos",
    products: [
      { id: "pro-junior", name: "PRO Júnior — 30 dias", oldPrice: 469, price: 279, sold: 1820, rating: 5.0, reviews: 410, image: perfilPro, badge: "TOP", description: defaultDesc },
      { id: "pro-premium", name: "PRO Premium — 90 dias", oldPrice: 749, price: 447, sold: 1240, rating: 5.0, reviews: 320, image: perfilPro, badge: "TOP", description: defaultDesc },
      { id: "pro-master", name: "PRO Máster — 180 dias", oldPrice: 919, price: 547, sold: 880, rating: 5.0, reviews: 240, image: perfilPro, badge: "TOP", description: defaultDesc },
    ],
  },
];

export const ALL_PRODUCTS: Product[] = SECTIONS.flatMap((s) => s.products);

export function getProduct(id: string): Product | undefined {
  return ALL_PRODUCTS.find((p) => p.id === id);
}

export function formatBRL(v: number) {
  return v.toFixed(2).replace(".", ",");
}

export function discount(oldP: number, p: number) {
  return Math.round(((oldP - p) / oldP) * 100);
}
