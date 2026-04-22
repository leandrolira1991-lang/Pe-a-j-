export interface Product {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  priceNatural: number;
  priceCold: number;
  priceHot?: number;
  packQuantity?: number;
  pricePackNatural?: number;
  pricePackCold?: number;
  isCombo?: boolean;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  type: 'unit' | 'pack';
  temp: 'natural' | 'cold' | 'hot';
}

export interface Customer {
  name: string;
  phone: string;
  address: string;
  neighborhood: string;
  photoUrl?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface AppSettings {
  storeName: string;
  whatsappNumber: string;
  minOrder?: number;
  logoUrl?: string;
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
  paymentMethods?: {
    pix: boolean;
    money: boolean;
    debit: boolean;
    credit: boolean;
  };
}

export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  link?: string;
}

export interface Combo {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  productIds: string[];
}
