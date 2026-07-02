import { config } from "dotenv";
import { prisma } from "../../src/lib/prisma.js";

config();

const ORGANIZATION_ID = "motorworld-inn-boeblingen";
const STORAGE_LOCATION_ID = "mwbb-live-stock-location";
const STORAGE_LOCATION_NAME = "Demo Site Alpha Live-Bestand";
const ACTOR_USER_ID = "system-pdf-import";
const SOURCE_NOTE = "PDF Import Demo Site Alpha 2026-06-01";

type StockCategory = {
  name: string;
  items: Array<{
    name: string;
    quantity: number;
    unit?: string;
  }>;
};

const stockCategories: StockCategory[] = [
  {
    name: "Wasser",
    items: [
      { name: "Teinacher Medium 0,25l", quantity: 5 },
      { name: "Teinacher Naturell 0,25l", quantity: 5 },
      { name: "Teinacher Medium 0,75l", quantity: 10 },
      { name: "Teinacher Naturell 0,75l", quantity: 10 },
      { name: "Teinacher Naturell 0,5l", quantity: 6 }
    ]
  },
  {
    name: "Säfte",
    items: [
      { name: "Vaihing Rhabarbersaft 1,0l", quantity: 4 },
      { name: "Vaihing Orangensaft 1,0l", quantity: 5 },
      { name: "Vaihing Apfelsaft 1,0l", quantity: 5 },
      { name: "Vaihing Maracujasaft 1,0l", quantity: 5 },
      { name: "Vaihing Johannisbeere 1,0l", quantity: 5 },
      { name: "Vaihing Mango 1,0l", quantity: 4 }
    ]
  },
  {
    name: "Softdrinks",
    items: [
      { name: "Coca Cola 0,2l", quantity: 6 },
      { name: "Coca Cola zero 0,2l", quantity: 6 },
      { name: "Paulaner Spezi 0,33l", quantity: 6 },
      { name: "Sprite 0,2l", quantity: 4 },
      { name: "Fanta 0,2l", quantity: 4 },
      { name: "Bitter Lemon 0,2l", quantity: 3 },
      { name: "Ginger Ale 0,2l", quantity: 3 },
      { name: "Tonic Water 0,2l", quantity: 3 },
      { name: "Teinacher Eistee Zitrone 0,33l", quantity: 5 },
      { name: "Teinacher Eistee Pfirsich 0,33l", quantity: 5 },
      { name: "Teinacher Limo Rhabarber 0,33l", quantity: 5 },
      { name: "Teinacher Limo Zitrone", quantity: 5 },
      { name: "Teinacher Limo Mango", quantity: 5 }
    ]
  },
  {
    name: "Bier / Fass",
    items: [
      { name: "Alkfreies Weissgold 0,33l", quantity: 5 },
      { name: "Alkfreies Hefeweizen 0,5l", quantity: 5 },
      { name: "Corona 0,33l", quantity: 3 },
      { name: "Fass Hefeweizen 30l gelb", quantity: 6, unit: "Fass" },
      { name: "Fass Weiß-Gold 30l blau", quantity: 8, unit: "Fass" }
    ]
  },
  {
    name: "Mixer / Energy",
    items: [
      { name: "Ginger Ale 1,0l", quantity: 5 },
      { name: "Wildberry 1,0l", quantity: 5 },
      { name: "Ginger Beer 1,0l", quantity: 5 },
      { name: "Tonic Water 1,0l", quantity: 5 },
      { name: "Bitter Lemon 1,0l", quantity: 5 },
      { name: "Sprite 1,0l", quantity: 2 },
      { name: "Cola 1,0l", quantity: 1 },
      { name: "Redbull", quantity: 2, unit: "Stk." },
      { name: "Sanbitter", quantity: 2, unit: "Stk." }
    ]
  },
  {
    name: "Schaumwein / Wein",
    items: [
      { name: "Prosecco Reguta", quantity: 30 },
      { name: "Demo Sekt Brut", quantity: 18 },
      { name: "Roederer Brut", quantity: 6 },
      { name: "Ruinart Rosé", quantity: 6 },
      { name: "Knauß Weiß", quantity: 24 },
      { name: "Pinot Grigio", quantity: 24 },
      { name: "Idler Riesling", quantity: 12 },
      { name: "Lugana DOC", quantity: 12 },
      { name: "Grüner Veltliner Kremstal", quantity: 6 },
      { name: "Grauburgunder Schnaitmann", quantity: 24 },
      { name: "Weißburgunder Aldinger", quantity: 6 },
      { name: "Chardonnay Sand Point", quantity: 24 },
      { name: "Sancerre Domaine Renaissance", quantity: 6 },
      { name: "Chablis 1er Cru", quantity: 6 },
      { name: "Chardonnay Anderson Valley", quantity: 6 },
      { name: "Nero di Troia Caiaffa", quantity: 24 },
      { name: "Club Rosé", quantity: 6 },
      { name: "Evoé Rosé", quantity: 24 },
      { name: "Lemberger Fellbacher Weingärtner", quantity: 18 },
      { name: "Primitivo iMuri", quantity: 24 },
      { name: "Lemberger Knauß", quantity: 24 },
      { name: "Rioja Tarón", quantity: 12 },
      { name: "Chianti Classico Castagnoli", quantity: 24 },
      { name: "Spätburgunder Aldinger", quantity: 6 },
      { name: "Malbec Casa de Uco", quantity: 6 },
      { name: "Le Volte dell'Ornellia", quantity: 6 },
      { name: "Château d'Aiguilhe", quantity: 6 },
      { name: "Cuvée X Wöhrwag", quantity: 6 },
      { name: "Pinot Noir Anderson Valley", quantity: 6 }
    ]
  },
  {
    name: "Kaffee / Tee",
    items: [
      { name: "Darjeeling", quantity: 12, unit: "Stk." },
      { name: "Pfefferminztee", quantity: 12, unit: "Stk." },
      { name: "Earl Grey", quantity: 12, unit: "Stk." },
      { name: "Grüntee", quantity: 8, unit: "Stk." },
      { name: "Früchtetee", quantity: 12, unit: "Stk." },
      { name: "Domori Schokolade", quantity: 1, unit: "Pack" },
      { name: "Espressobohnen", quantity: 6, unit: "Pack" },
      { name: "Kaffeebohnen", quantity: 6, unit: "Pack" },
      { name: "Koffeinfreier Kaffee", quantity: 12, unit: "Pack" },
      { name: "Filterkaffeepulver", quantity: 8, unit: "Pack" }
    ]
  },
  {
    name: "Sirups",
    items: [
      { name: "Blue Curacao Sirup", quantity: 3 },
      { name: "Monin Maracujasirup", quantity: 2 },
      { name: "Giffard Holunderblütensirup 1,0l", quantity: 3 },
      { name: "Giffard Zuckerrohr 1,0l", quantity: 4 },
      { name: "Giffard Vanille 1,0l", quantity: 1 },
      { name: "Fee Foam 150ml", quantity: 1 },
      { name: "Pulco Zitronensaft", quantity: 12 },
      { name: "Pulco Limettensaft", quantity: 12 },
      { name: "Charles Limejuice", quantity: 3 }
    ]
  },
  {
    name: "Aperitife",
    items: [
      { name: "Aperol", quantity: 10 },
      { name: "Lillet Blanc", quantity: 6 },
      { name: "Campari", quantity: 6 },
      { name: "St. Germain Holunderlikör", quantity: 3 }
    ]
  },
  {
    name: "Gin",
    items: [
      { name: "Bombay Sapphire", quantity: 6 },
      { name: "GinSTR", quantity: 4 },
      { name: "The Duke Munich Dry Gin", quantity: 1 },
      { name: "Ferdinands Saar Dry Gin", quantity: 1 },
      { name: "Bud Spencer Dry Gin", quantity: 1 },
      { name: "Ortiz IV Gin", quantity: 1 }
    ]
  },
  {
    name: "Rum",
    items: [
      { name: "Bacardi Carta Blanca", quantity: 3 },
      { name: "Bacardi 8 Years", quantity: 1 },
      { name: "Havana Club 7 Years", quantity: 3 },
      { name: "Flor de Cana Rum 12 Years", quantity: 1 },
      { name: "Plantation Rum, XO, 20 Years", quantity: 1 },
      { name: "Ron Niko Golden Spiced Rum, 10", quantity: 1 }
    ]
  },
  {
    name: "Martini",
    items: [
      { name: "Martini Fiero", quantity: 6 },
      { name: "Martini Dry", quantity: 1 },
      { name: "Martini Rosso", quantity: 3 },
      { name: "Martini Bianco", quantity: 1 }
    ]
  },
  {
    name: "Vodka",
    items: [
      { name: "42 Below Vodka", quantity: 4 },
      { name: "Grey Goose", quantity: 1 }
    ]
  },
  {
    name: "Liköre",
    items: [
      { name: "Cointreau", quantity: 2 },
      { name: "Kahlua", quantity: 3 },
      { name: "Bols Blue Curacao Likör", quantity: 1 },
      { name: "Villa Massa Limoncello", quantity: 4 }
    ]
  },
  {
    name: "Schnäpse / Bitters",
    items: [
      { name: "Ziegler Mirabelle", quantity: 1 },
      { name: "Ziegler Haselnuss", quantity: 1 },
      { name: "Morand Kirsche", quantity: 1 },
      { name: "Lantenhammer Rote Williamsbirne", quantity: 2 },
      { name: "Lantenhammer Marille", quantity: 2 },
      { name: "Lantenhammer Obstbrände", quantity: 2 },
      { name: "Averna", quantity: 1 },
      { name: "Ramazotti", quantity: 1 },
      { name: "Jägermeister", quantity: 1 },
      { name: "Angostura Bitters", quantity: 3 }
    ]
  },
  {
    name: "Tequila / Cachaca",
    items: [
      { name: "Sauza Tequila", quantity: 1 },
      { name: "Don Julio Tequila", quantity: 1 },
      { name: "Cachaca Nega Fulo", quantity: 2 }
    ]
  },
  {
    name: "Whiskey",
    items: [
      { name: "Woodford Reserve Bourbon", quantity: 3 },
      { name: "Makers Mark", quantity: 2 },
      { name: "Jack Daniels", quantity: 1 },
      { name: "Red Label Whiskey", quantity: 1 },
      { name: "Jameson Whiskey", quantity: 1 },
      { name: "Tullamore Dew Whiskey", quantity: 1 },
      { name: "Chivas Regal 12 Years", quantity: 1 }
    ]
  }
];

async function main() {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.storageLocation.upsert({
      where: { id: STORAGE_LOCATION_ID },
      update: {
        organizationId: ORGANIZATION_ID,
        name: STORAGE_LOCATION_NAME,
        type: "lager",
        isActive: true,
        updatedAt: now
      },
      create: {
        id: STORAGE_LOCATION_ID,
        organizationId: ORGANIZATION_ID,
        name: STORAGE_LOCATION_NAME,
        type: "lager",
        isActive: true
      }
    });

    const activeItemIds = new Set<string>();

    for (const [categoryIndex, category] of stockCategories.entries()) {
      const categoryId = `mwbb-cat-${slug(category.name)}`;
      await tx.inventoryCategory.upsert({
        where: { id: categoryId },
        update: {
          organizationId: ORGANIZATION_ID,
          name: category.name,
          displayOrder: categoryIndex + 1,
          updatedAt: now
        },
        create: {
          id: categoryId,
          organizationId: ORGANIZATION_ID,
          name: category.name,
          displayOrder: categoryIndex + 1
        }
      });

      for (const [itemIndex, item] of category.items.entries()) {
        const itemId = `mwbb-item-${slug(`${category.name}-${item.name}`)}`;
        const unit = item.unit ?? inferUnit(item.name, category.name);
        const displayOrder = (categoryIndex + 1) * 1000 + itemIndex + 1;
        activeItemIds.add(itemId);

        await tx.inventoryItem.upsert({
          where: { id: itemId },
          update: {
            organizationId: ORGANIZATION_ID,
            categoryId,
            name: item.name,
            defaultUnit: unit,
            minStock: item.quantity,
            targetStock: item.quantity,
            displayOrder,
            storageLocationId: STORAGE_LOCATION_ID,
            isActive: true,
            updatedAt: now
          },
          create: {
            id: itemId,
            organizationId: ORGANIZATION_ID,
            categoryId,
            name: item.name,
            defaultUnit: unit,
            minStock: item.quantity,
            targetStock: item.quantity,
            displayOrder,
            storageLocationId: STORAGE_LOCATION_ID,
            isActive: true
          }
        });

        await tx.inventoryMovement.upsert({
          where: { idempotencyKey: `mwbb-live-stock:${itemId}` },
          update: {
            organizationId: ORGANIZATION_ID,
            quantity: item.quantity,
            unit,
            actorUserId: ACTOR_USER_ID,
            storageLocationId: STORAGE_LOCATION_ID,
            note: SOURCE_NOTE
          },
          create: {
            id: `mwbb-movement-${slug(itemId)}`,
            idempotencyKey: `mwbb-live-stock:${itemId}`,
            organizationId: ORGANIZATION_ID,
            inventoryItemId: itemId,
            type: "goods_received",
            quantity: item.quantity,
            unit,
            actorUserId: ACTOR_USER_ID,
            storageLocationId: STORAGE_LOCATION_ID,
            note: SOURCE_NOTE,
            createdAt: now
          }
        });

        await tx.inventoryStockSnapshot.upsert({
          where: {
            inventoryItemId_storageLocationId: {
              inventoryItemId: itemId,
              storageLocationId: STORAGE_LOCATION_ID
            }
          },
          update: {
            quantity: item.quantity,
            unit,
            calculatedAt: now
          },
          create: {
            id: `mwbb-stock-${slug(itemId)}`,
            inventoryItemId: itemId,
            storageLocationId: STORAGE_LOCATION_ID,
            quantity: item.quantity,
            unit,
            calculatedAt: now
          }
        });
      }
    }

    await tx.inventoryItem.updateMany({
      where: {
        organizationId: ORGANIZATION_ID,
        AND: [{ id: { startsWith: "mwbb-item-" } }, { id: { notIn: [...activeItemIds] } }]
      },
      data: {
        isActive: false,
        updatedAt: now
      }
    });
  }, { timeout: 60_000 });

  const itemCount = stockCategories.reduce((sum, category) => sum + category.items.length, 0);
  console.log(
    `Imported ${stockCategories.length} categories and ${itemCount} live-stock items for ${ORGANIZATION_ID}.`
  );
}

function inferUnit(name: string, categoryName: string): string {
  if (/fass/i.test(name)) return "Fass";
  if (/(wein|gin|rum|martini|vodka|likör|schnaps|whiskey|aperitif|sirup)/i.test(categoryName)) {
    return "Fl.";
  }
  if (/(kaffee|tee)/i.test(categoryName)) return "Stk.";
  if (/\d+(?:,\d+)?\s*l|ml/i.test(name)) return "Fl.";
  return "Stk.";
}

function slug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
