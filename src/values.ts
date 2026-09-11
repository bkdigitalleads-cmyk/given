/**
 * Fair-market-value guide for common donated goods.
 *
 * The IRS lets you deduct the fair market value of donated clothing and
 * household items — what a willing buyer would pay a thrift store for them
 * today, not what you paid. Clothing and household items must be in at
 * least "good used condition" to be deductible at all (Publication 561 /
 * Form 8283 instructions).
 *
 * These ranges are typical U.S. thrift-store resale prices, compiled from
 * hands-on secondhand-market experience; they are a starting point the
 * user adjusts for condition, brand, and local market. They are NOT IRS
 * figures — the IRS publishes no official price list. The report notes the
 * valuation method the user chose.
 */
export interface ValueGuideItem {
  name: string;
  category: string;
  /** Low / high in whole dollars for an item in good used condition. */
  low: number;
  high: number;
}

export const VALUE_CATEGORIES = [
  'Clothing',
  'Shoes & accessories',
  'Kids & baby',
  'Furniture',
  'Kitchen',
  'Electronics',
  'Books & media',
  'Sports & outdoors',
  'Home & decor',
] as const;

export const VALUE_GUIDE: ValueGuideItem[] = [
  // Clothing (adult)
  { name: 'T-shirt', category: 'Clothing', low: 1, high: 6 },
  { name: 'Blouse or dress shirt', category: 'Clothing', low: 3, high: 12 },
  { name: 'Sweater', category: 'Clothing', low: 4, high: 15 },
  { name: 'Jeans', category: 'Clothing', low: 4, high: 20 },
  { name: 'Slacks or dress pants', category: 'Clothing', low: 4, high: 15 },
  { name: 'Shorts', category: 'Clothing', low: 2, high: 8 },
  { name: 'Skirt', category: 'Clothing', low: 3, high: 12 },
  { name: 'Dress (casual)', category: 'Clothing', low: 4, high: 20 },
  { name: 'Dress (formal or evening)', category: 'Clothing', low: 10, high: 60 },
  { name: 'Suit (2-piece)', category: 'Clothing', low: 15, high: 75 },
  { name: 'Sport coat or blazer', category: 'Clothing', low: 8, high: 40 },
  { name: 'Light jacket', category: 'Clothing', low: 5, high: 25 },
  { name: 'Winter coat', category: 'Clothing', low: 10, high: 60 },
  { name: 'Raincoat', category: 'Clothing', low: 5, high: 25 },
  { name: 'Pajamas or robe', category: 'Clothing', low: 2, high: 10 },
  { name: 'Swimsuit', category: 'Clothing', low: 2, high: 10 },
  { name: 'Athletic wear (top or bottom)', category: 'Clothing', low: 3, high: 12 },
  // Shoes & accessories
  { name: 'Sneakers', category: 'Shoes & accessories', low: 5, high: 30 },
  { name: 'Dress shoes', category: 'Shoes & accessories', low: 5, high: 30 },
  { name: 'Boots', category: 'Shoes & accessories', low: 8, high: 40 },
  { name: 'Sandals', category: 'Shoes & accessories', low: 2, high: 12 },
  { name: 'Handbag or purse', category: 'Shoes & accessories', low: 4, high: 30 },
  { name: 'Belt', category: 'Shoes & accessories', low: 2, high: 8 },
  { name: 'Hat or cap', category: 'Shoes & accessories', low: 1, high: 8 },
  { name: 'Scarf or gloves', category: 'Shoes & accessories', low: 1, high: 8 },
  { name: 'Tie', category: 'Shoes & accessories', low: 1, high: 6 },
  { name: 'Costume jewelry (piece)', category: 'Shoes & accessories', low: 1, high: 10 },
  // Kids & baby
  { name: 'Kids top or shirt', category: 'Kids & baby', low: 1, high: 5 },
  { name: 'Kids pants or jeans', category: 'Kids & baby', low: 2, high: 8 },
  { name: 'Kids dress', category: 'Kids & baby', low: 2, high: 10 },
  { name: 'Kids coat', category: 'Kids & baby', low: 4, high: 20 },
  { name: 'Kids shoes', category: 'Kids & baby', low: 2, high: 12 },
  { name: 'Baby clothing (piece)', category: 'Kids & baby', low: 1, high: 4 },
  { name: 'Stroller', category: 'Kids & baby', low: 15, high: 75 },
  { name: 'Crib', category: 'Kids & baby', low: 25, high: 100 },
  { name: 'High chair', category: 'Kids & baby', low: 10, high: 40 },
  { name: 'Car seat (unexpired)', category: 'Kids & baby', low: 10, high: 40 },
  { name: 'Toy or game', category: 'Kids & baby', low: 1, high: 15 },
  { name: 'Bicycle (kids)', category: 'Kids & baby', low: 10, high: 50 },
  // Furniture
  { name: 'Sofa', category: 'Furniture', low: 40, high: 250 },
  { name: 'Loveseat', category: 'Furniture', low: 30, high: 150 },
  { name: 'Armchair or recliner', category: 'Furniture', low: 20, high: 120 },
  { name: 'Coffee table', category: 'Furniture', low: 15, high: 75 },
  { name: 'End table or nightstand', category: 'Furniture', low: 10, high: 50 },
  { name: 'Dining table', category: 'Furniture', low: 40, high: 200 },
  { name: 'Dining chair (each)', category: 'Furniture', low: 8, high: 40 },
  { name: 'Desk', category: 'Furniture', low: 25, high: 125 },
  { name: 'Office chair', category: 'Furniture', low: 15, high: 75 },
  { name: 'Bookcase', category: 'Furniture', low: 15, high: 80 },
  { name: 'Dresser', category: 'Furniture', low: 30, high: 150 },
  { name: 'Bed frame', category: 'Furniture', low: 30, high: 150 },
  { name: 'Mattress (clean, no stains)', category: 'Furniture', low: 20, high: 100 },
  { name: 'Lamp (floor or table)', category: 'Furniture', low: 5, high: 35 },
  { name: 'Rug', category: 'Furniture', low: 10, high: 90 },
  // Kitchen
  { name: 'Dishes (set)', category: 'Kitchen', low: 8, high: 40 },
  { name: 'Glassware (set)', category: 'Kitchen', low: 4, high: 20 },
  { name: 'Pots and pans (set)', category: 'Kitchen', low: 10, high: 50 },
  { name: 'Small appliance (toaster, blender)', category: 'Kitchen', low: 5, high: 30 },
  { name: 'Coffee maker', category: 'Kitchen', low: 5, high: 30 },
  { name: 'Microwave', category: 'Kitchen', low: 15, high: 50 },
  { name: 'Utensils or flatware (set)', category: 'Kitchen', low: 4, high: 25 },
  // Electronics
  { name: 'Flat-screen TV (working)', category: 'Electronics', low: 30, high: 200 },
  { name: 'Laptop (working)', category: 'Electronics', low: 50, high: 300 },
  { name: 'Tablet (working)', category: 'Electronics', low: 25, high: 150 },
  { name: 'Smartphone (working)', category: 'Electronics', low: 25, high: 200 },
  { name: 'Printer', category: 'Electronics', low: 10, high: 50 },
  { name: 'Speaker or stereo', category: 'Electronics', low: 10, high: 75 },
  { name: 'Video game console', category: 'Electronics', low: 25, high: 150 },
  { name: 'Computer monitor', category: 'Electronics', low: 15, high: 75 },
  // Books & media
  { name: 'Paperback book', category: 'Books & media', low: 1, high: 3 },
  { name: 'Hardcover book', category: 'Books & media', low: 2, high: 6 },
  { name: 'Textbook (current edition)', category: 'Books & media', low: 5, high: 40 },
  { name: 'DVD or Blu-ray', category: 'Books & media', low: 1, high: 4 },
  { name: 'Vinyl record', category: 'Books & media', low: 1, high: 10 },
  { name: 'Board game or puzzle', category: 'Books & media', low: 2, high: 12 },
  // Sports & outdoors
  { name: 'Bicycle (adult)', category: 'Sports & outdoors', low: 25, high: 150 },
  { name: 'Golf clubs (set)', category: 'Sports & outdoors', low: 25, high: 150 },
  { name: 'Tennis racket', category: 'Sports & outdoors', low: 5, high: 30 },
  { name: 'Exercise equipment (small)', category: 'Sports & outdoors', low: 5, high: 40 },
  { name: 'Treadmill or exercise bike', category: 'Sports & outdoors', low: 40, high: 200 },
  { name: 'Camping tent', category: 'Sports & outdoors', low: 10, high: 60 },
  { name: 'Sleeping bag', category: 'Sports & outdoors', low: 5, high: 30 },
  { name: 'Luggage (piece)', category: 'Sports & outdoors', low: 5, high: 40 },
  // Home & decor
  { name: 'Bedding (sheets or comforter)', category: 'Home & decor', low: 4, high: 25 },
  { name: 'Blanket or throw', category: 'Home & decor', low: 3, high: 15 },
  { name: 'Towels (set)', category: 'Home & decor', low: 3, high: 12 },
  { name: 'Curtains (pair)', category: 'Home & decor', low: 4, high: 25 },
  { name: 'Framed picture or art', category: 'Home & decor', low: 3, high: 40 },
  { name: 'Mirror', category: 'Home & decor', low: 5, high: 40 },
  { name: 'Vase or decorative item', category: 'Home & decor', low: 2, high: 15 },
  { name: 'Holiday decorations (box)', category: 'Home & decor', low: 3, high: 20 },
  { name: 'Vacuum cleaner', category: 'Home & decor', low: 10, high: 50 },
  { name: 'Sewing machine', category: 'Home & decor', low: 20, high: 100 },
  { name: 'Power tool', category: 'Home & decor', low: 8, high: 50 },
  { name: 'Hand tools (set)', category: 'Home & decor', low: 5, high: 30 },
];

/** Midpoint used when the user taps a guide item, in cents. */
export function guideMidCents(item: ValueGuideItem): number {
  return Math.round(((item.low + item.high) / 2) * 100);
}
