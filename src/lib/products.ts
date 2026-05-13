export type Product = {
  id: string;
  name: string;
  oldPrice: number;
  price: number;
  sold?: number;
  description?: string;
  rating?: number;
  reviews?: number;
};

export type Section = {
  title: string;
  products: Product[];
};

const defaultDesc = `Entrega 100% automática após confirmação do pagamento.

✅ Produto original e garantido
✅ Suporte 24/7 via Telegram e e-mail
✅ Acesso vitalício ao painel de gerenciamento
✅ Garantia de reposição em caso de problemas

Antes de comprar, crie sua conta na loja. Após a compra, o produto será enviado automaticamente para o e-mail cadastrado.`;

export const SECTIONS: Section[] = [
  {
    title: "Streaming",
    products: [
      { id: "1", name: "TELA - PARAMOUNT", oldPrice: 34.0, price: 12.0, sold: 1240, rating: 4.9, reviews: 312, description: defaultDesc },
      { id: "2", name: "TELA - HBO MAX", oldPrice: 44.0, price: 10.0, sold: 980, rating: 4.8, reviews: 220, description: defaultDesc },
      { id: "3", name: "IPTV - MENSAL", oldPrice: 99.0, price: 16.9, sold: 2150, rating: 4.9, reviews: 540, description: defaultDesc },
      { id: "4", name: "YouTube Premium - Família", oldPrice: 53.9, price: 8.9, sold: 1780, rating: 4.9, reviews: 412, description: defaultDesc },
      { id: "5", name: "IPTV - TRIMESTRAL", oldPrice: 199.0, price: 39.9, sold: 640, rating: 4.8, reviews: 180, description: defaultDesc },
      { id: "6", name: "IPTV - SEMESTRAL", oldPrice: 599.0, price: 69.9, sold: 320, rating: 4.9, reviews: 95, description: defaultDesc },
    ],
  },
  {
    title: "Contas Premium",
    products: [
      { id: "7", name: "Conta Premium - Mensal", oldPrice: 49.9, price: 14.9, sold: 870, rating: 4.8, reviews: 210, description: defaultDesc },
      { id: "8", name: "Conta Pro - Anual", oldPrice: 299.0, price: 89.9, sold: 410, rating: 4.9, reviews: 120, description: defaultDesc },
      { id: "9", name: "Pacote Família", oldPrice: 79.9, price: 19.9, sold: 1100, rating: 4.9, reviews: 290, description: defaultDesc },
    ],
  },
  {
    title: "Música",
    products: [
      { id: "10", name: "Spotify Premium - Mensal", oldPrice: 21.9, price: 7.9, sold: 3200, rating: 4.9, reviews: 820, description: defaultDesc },
      { id: "11", name: "Deezer HiFi - Mensal", oldPrice: 34.9, price: 9.9, sold: 540, rating: 4.7, reviews: 130, description: defaultDesc },
      { id: "12", name: "Apple Music - Mensal", oldPrice: 21.9, price: 8.9, sold: 1450, rating: 4.8, reviews: 360, description: defaultDesc },
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
