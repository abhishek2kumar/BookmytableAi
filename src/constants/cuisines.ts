export interface CuisineInfo {
  id: string;
  name: string;
  image: string;
  description: string;
}

export const CUISINE_DATA: CuisineInfo[] = [
  {
    id: 'north-indian',
    name: 'North Indian',
    image: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&q=80&w=400',
    description: 'Indulge with the best of North Indian cuisines, featuring rich gravies and tandoori delights.'
  },
  {
    id: 'biryani',
    name: 'South Indian', // Mapping to South Indian as requested/implied or staying true to current list
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=400',
    description: 'Aromatic and flavorful South Indian delicacies that will take you on a culinary journey.'
  },
  {
    id: 'chinese',
    name: 'Chinese',
    image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&q=80&w=400',
    description: 'Authentic Chinese flavors, from spicy Schezwan to classic Manchurian.'
  },
  {
    id: 'desserts',
    name: 'Desserts',
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=400',
    description: 'Satisfy your sweet tooth with our collection of heavenly desserts.'
  },
  {
    id: 'burger',
    name: 'Fast Food',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=400',
    description: 'Quick, delicious, and satisfying fast food favorites for any time of the day.'
  },
  {
    id: 'pizza',
    name: 'Italian',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=400',
    description: 'Experience the true taste of Italy with our freshly baked pizzas and pastas.'
  },
  {
    id: 'mexican',
    name: 'Mexican',
    image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=400',
    description: 'Vibrant and spicy Mexican dishes that pack a punch of flavor.'
  },
  {
    id: 'thai',
    name: 'Thai',
    image: 'https://images.unsplash.com/photo-1559311648-d46f4d8593d8?auto=format&fit=crop&q=80&w=400',
    description: 'Balanced and aromatic Thai cuisine featuring fresh herbs and spices.'
  }
];
