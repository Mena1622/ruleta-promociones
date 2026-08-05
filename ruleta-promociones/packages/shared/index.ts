export interface Prize {
  id: string;
  name: string;
  price: number;
}

export const PRIZES: Prize[] = [
  { id: '1', name: 'Limpieza facial', price: 25000 },
  { id: '2', name: 'Hollywood peel', price: 25000 },
  { id: '3', name: 'Hydrafacial', price: 25000 },
  { id: '4', name: 'Myolift', price: 25000 },
  { id: '5', name: 'Facial iluminador', price: 25000 },
];
