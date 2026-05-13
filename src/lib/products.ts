export type Product = {
  id: string;
  name: string;
  oldPrice: number;
  price: number;
};

export type Section = {
  title: string;
  products: Product[];
};

export const SECTIONS: Section[] = [
  {
    title: "Streaming",
    products: [
      { id: "1", name: "TELA - PARAMOUNT", oldPrice: 34.0, price: 12.0 },
      { id: "2", name: "TELA - HBO MAX", oldPrice: 44.0, price: 10.0 },
      { id: "3", name: "IPTV - MENSAL", oldPrice: 99.0, price: 16.9 },
      { id: "4", name: "YouTube Premium - Família", oldPrice: 53.9, price: 8.9 },
      { id: "5", name: "IPTV - TRIMESTRAL", oldPrice: 199.0, price: 39.9 },
      { id: "6", name: "IPTV - SEMESTRAL", oldPrice: 599.0, price: 69.9 },
    ],
  },
  {
    title: "Contas Premium",
    products: [
      { id: "7", name: "Conta Premium - Mensal", oldPrice: 49.9, price: 14.9 },
      { id: "8", name: "Conta Pro - Anual", oldPrice: 299.0, price: 89.9 },
      { id: "9", name: "Pacote Família", oldPrice: 79.9, price: 19.9 },
    ],
  },
  {
    title: "Música",
    products: [
      { id: "10", name: "Spotify Premium - Mensal", oldPrice: 21.9, price: 7.9 },
      { id: "11", name: "Deezer HiFi - Mensal", oldPrice: 34.9, price: 9.9 },
      { id: "12", name: "Apple Music - Mensal", oldPrice: 21.9, price: 8.9 },
    ],
  },
];

export function formatBRL(v: number) {
  return v.toFixed(2).replace(".", ",");
}

export function discount(oldP: number, p: number) {
  return Math.round(((oldP - p) / oldP) * 100);
}
