/**
 * MALKAZ Luxury E-Commerce - Product Attributes Schema & Description Generator
 */

export interface AttributeDefinition {
  key: string;
  label: string;
  options: readonly string[];
}

export const COMMON_ATTRIBUTES: Record<string, AttributeDefinition> = {
  material: {
    key: 'material',
    label: 'Material',
    options: [
      'Alloy',
      'Brass',
      'Copper',
      'Stainless Steel',
      'Silver Plated',
      'Gold Plated',
      'Oxidised Silver',
      'Fabric',
      'Organza',
      'Plastic',
      'Acrylic',
      'Resin',
    ],
  },
  plating: {
    key: 'plating',
    label: 'Plating',
    options: [
      'Gold Plated',
      'Silver Plated',
      'Rose Gold Plated',
      'Rhodium Plated',
      'Oxidised',
      'Matte Gold',
      'No Plating',
    ],
  },
  stoneType: {
    key: 'stoneType',
    label: 'Stone Type',
    options: [
      'AD Stone',
      'American Diamond',
      'Cubic Zirconia',
      'Artificial Stone',
      'Kundan',
      'Pearl',
      'Rhinestone',
      'Crystal',
      'No Stone',
      'Diamond Look',
    ],
  },
  stoneColor: {
    key: 'stoneColor',
    label: 'Stone Color',
    options: [
      'White',
      'Pink',
      'Green',
      'Red',
      'Multicolor',
      'Champagne',
      'Black',
    ],
  },
  colorFinish: {
    key: 'colorFinish',
    label: 'Color / Finish',
    options: [
      'Golden',
      'Silver',
      'Rose Gold',
      'Oxidised Black',
      'Multicolor',
      'Yellow',
      'Pink',
      'Cream',
    ],
  },
  occasion: {
    key: 'occasion',
    label: 'Occasion',
    options: [
      'Daily Wear',
      'Party',
      'Wedding',
      'Festive',
      'Casual',
      'Office',
      'Gifting',
    ],
  },
  target: {
    key: 'target',
    label: 'Target Audience',
    options: ['Women', 'Girls', 'Kids', 'Unisex'],
  },
  skinFriendly: {
    key: 'skinFriendly',
    label: 'Skin Friendly',
    options: ['Hypoallergenic', 'Nickel Free', 'Lead Free', 'Skin Safe Certified'],
  },
};

export const CATEGORY_ATTRIBUTES: Record<string, AttributeDefinition[]> = {
  earrings: [
    {
      key: 'earringType',
      label: 'Earring Type',
      options: ['Studs', 'Drops', 'Dangler', 'Jhumka', 'Chandbali', 'Hoops', 'Clip-on'],
    },
    {
      key: 'closure',
      label: 'Closure',
      options: ['Push Back', 'Screw Back', 'Fish Hook', 'Lever Back', 'Clip-on'],
    },
    {
      key: 'length',
      label: 'Length',
      options: ['Small (< 2 cm)', 'Medium (2-5 cm)', 'Long (> 5 cm)'],
    },
    {
      key: 'weight',
      label: 'Weight',
      options: ['Light Weight', 'Medium Weight', 'Heavy Statement'],
    },
  ],
  necklace: [
    {
      key: 'setIncludes',
      label: 'Set Includes',
      options: ['Necklace Only', 'Necklace + Earrings', 'Necklace + Earrings + Maang Tikka'],
    },
    {
      key: 'necklaceType',
      label: 'Necklace Type',
      options: ['Choker', 'Collar', 'Princess', 'Matinee', 'Opera', 'Rani Haar', 'Pendant Necklace'],
    },
    {
      key: 'chainLength',
      label: 'Chain Length',
      options: ['14-16 inches (Choker)', '16-18 inches (Princess)', '20-24 inches (Matinee)', 'Adjustable Dori'],
    },
    {
      key: 'backClosure',
      label: 'Back Closure',
      options: ['Adjustable Dori / Thread', 'Lobster Clasp', 'S-Hook', 'Drawstring'],
    },
  ],
  ring: [
    {
      key: 'ringType',
      label: 'Ring Type',
      options: ['Solitaire', 'Band', 'Cocktail / Statement', 'Adjustable Ring', 'Midi Ring'],
    },
    {
      key: 'ringSize',
      label: 'Ring Size',
      options: ['Adjustable (Free Size)', 'Size 6', 'Size 7', 'Size 8', 'Size 9', 'Size 10'],
    },
    {
      key: 'fit',
      label: 'Fit',
      options: ['Comfort Fit', 'Standard Fit', 'Adjustable Band'],
    },
  ],
  bracelet: [
    {
      key: 'braceletType',
      label: 'Bracelet / Bangle Type',
      options: ['Tennis Bracelet', 'Cuff / Kada', 'Charm Bracelet', 'Bangle Set (Pair)', 'Bangle Set (4 pcs)', 'Chain Bracelet'],
    },
    {
      key: 'size',
      label: 'Size',
      options: ['Adjustable (Free Size)', '2.4', '2.6', '2.8', 'Small', 'Medium', 'Large'],
    },
    {
      key: 'closure',
      label: 'Closure',
      options: ['Openable / Screw Lock', 'Lobster Clasp', 'Magnetic Clasp', 'Elastic / Stretchable', 'Slip-on'],
    },
  ],
  anklet: [
    {
      key: 'ankletType',
      label: 'Payal / Anklet Type',
      options: ['Single Leg Payal', 'Pair (Both Legs)', 'Charm Anklet', 'Bridal Heavy Payal'],
    },
    {
      key: 'length',
      label: 'Length',
      options: ['Standard (10 inches)', 'Adjustable (9-11 inches)'],
    },
    {
      key: 'ghungroo',
      label: 'Ghungroo',
      options: ['With Ghungroo (Sounding)', 'Without Ghungroo (Silent)'],
    },
  ],
  hair: [
    {
      key: 'hairAccessoryType',
      label: 'Accessory Type',
      options: ['Hair Claw / Clip', 'Scrunchie', 'Hair Band', 'Bobby Pins Set', 'Tiara / Crown', 'Maang Tikka / Matha Patti', 'Juda Pin'],
    },
    {
      key: 'clipType',
      label: 'Clip / Fastener Type',
      options: ['Alligator Clip', 'French Barrette', 'Claw Clamp', 'Snap Clip', 'Bobby Pin', 'Elastic Band'],
    },
    {
      key: 'hairType',
      label: 'Hair Type Suitability',
      options: ['All Hair Types', 'Thick Hair', 'Thin / Fine Hair', 'Curly Hair'],
    },
    {
      key: 'size',
      label: 'Size',
      options: ['Mini', 'Medium', 'Jumbo / Large'],
    },
  ],
};

/**
 * Returns category-specific attribute definitions by matching category name
 */
export function getCategoryAttributes(categoryName?: string | null): AttributeDefinition[] {
  if (!categoryName) return [];
  const normalized = categoryName.toLowerCase().trim();

  if (normalized.includes('ear') || normalized.includes('jhumka') || normalized.includes('bali') || normalized.includes('stud')) {
    return CATEGORY_ATTRIBUTES.earrings;
  }
  if (normalized.includes('neck') || normalized.includes('haar') || normalized.includes('choker') || normalized.includes('pendant') || normalized.includes('chain')) {
    return CATEGORY_ATTRIBUTES.necklace;
  }
  if (normalized.includes('ring') || normalized.includes('anguthi') || normalized.includes('band')) {
    return CATEGORY_ATTRIBUTES.ring;
  }
  if (normalized.includes('bangle') || normalized.includes('bracelet') || normalized.includes('kada') || normalized.includes('churi') || normalized.includes('cuff')) {
    return CATEGORY_ATTRIBUTES.bracelet;
  }
  if (normalized.includes('anklet') || normalized.includes('payal') || normalized.includes('pajeb')) {
    return CATEGORY_ATTRIBUTES.anklet;
  }
  if (normalized.includes('hair') || normalized.includes('scrunchie') || normalized.includes('claw') || normalized.includes('clip') || normalized.includes('tiara')) {
    return CATEGORY_ATTRIBUTES.hair;
  }

  return [];
}

/**
 * Clean readable label lookup for attributes
 */
export const ATTRIBUTE_LABEL_MAP: Record<string, string> = {
  material: 'Material',
  plating: 'Plating',
  stoneType: 'Stone Type',
  stoneColor: 'Stone Color',
  colorFinish: 'Color / Finish',
  occasion: 'Occasion',
  target: 'Target Audience',
  skinFriendly: 'Skin Friendly',
  earringType: 'Earring Type',
  closure: 'Closure',
  length: 'Length',
  weight: 'Weight',
  setIncludes: 'Set Includes',
  necklaceType: 'Necklace Type',
  chainLength: 'Chain Length',
  backClosure: 'Back Closure',
  ringType: 'Ring Type',
  ringSize: 'Ring Size',
  fit: 'Fit',
  braceletType: 'Bracelet / Bangle Type',
  size: 'Size',
  ankletType: 'Payal Type',
  ghungroo: 'Ghungroo',
  hairAccessoryType: 'Accessory Type',
  clipType: 'Clip Type',
  hairType: 'Hair Suitability',
};

export function getAttributeLabel(key: string): string {
  if (ATTRIBUTE_LABEL_MAP[key]) return ATTRIBUTE_LABEL_MAP[key];
  // Convert camelCase or snake_case to Title Case
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

/**
 * Auto Description Template Generator
 */
export function generateProductDescriptionTemplate(
  productName: string,
  categoryName: string,
  attributes: Record<string, string> = {}
): string {
  const name = productName?.trim() || 'Exquisite Jewellery Piece';
  const category = categoryName?.trim() || 'MALKAZ Collection';

  // Extract non-empty attributes
  const specEntries = Object.entries(attributes)
    .filter(([_, val]) => val && typeof val === 'string' && val.trim().length > 0)
    .map(([key, val]) => `• ${getAttributeLabel(key)}: ${val.trim()}`);

  const lines: string[] = [];

  // Elegant luxury hook
  lines.push(`Elevate your personal style with the ${name}, an iconic creation from the MALKAZ ${category} range. Designed with exquisite attention to detail, this piece effortlessly blends royal heritage with contemporary grace.`);
  lines.push('');

  // Specifications
  if (specEntries.length > 0) {
    lines.push('Product Specifications:');
    specEntries.forEach((entry) => lines.push(entry));
    lines.push('');
  }

  // Why You'll Love It
  lines.push("Why You'll Love It:");
  lines.push('• High-Lustre Finish: Hand-polished for enduring brilliance and royal radiance.');
  lines.push('• Skin-Friendly & Safe: Crafted with hypoallergenic materials free from harsh nickel and lead.');
  lines.push('• Versatile Elegance: Perfect for festive celebrations, weddings, evening parties, or statement everyday wear.');
  lines.push('• Signature MALKAZ Presentation: Comes packaged in a premium velvet pouch and signature gift box.');
  lines.push('');

  // Care Instructions
  lines.push('Jewellery Care Instructions:');
  lines.push('• Avoid direct contact with perfume, hairspray, body lotions, and water.');
  lines.push('• Gently wipe with a dry, soft microfiber cloth after each wear.');
  lines.push('• Store in the provided MALKAZ airtight box or pouch to prevent oxidation.');

  return lines.join('\n');
}

