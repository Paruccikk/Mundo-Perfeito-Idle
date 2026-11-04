ALTER TABLE "Character"
  ADD COLUMN "title" TEXT,
  ADD COLUMN "guildName" TEXT,
  ADD COLUMN "constitution" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "strength" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "intelligence" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "dexterity" INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "attributePoints" INTEGER NOT NULL DEFAULT 0;

-- Patrulheiro passa a se chamar Arqueiro sem perder o personagem existente.
UPDATE "Character" SET "classId" = 'archer' WHERE "classId" = 'ranger';

-- Converte os personagens existentes para os atributos iniciais da classe
-- e concede os pontos que teriam recebido nos níveis já conquistados.
UPDATE "Character" SET "constitution" = 8, "strength" = 8, "intelligence" = 2, "dexterity" = 4
WHERE "classId" = 'warrior' AND "constitution" = 5 AND "strength" = 5 AND "intelligence" = 5 AND "dexterity" = 5;
UPDATE "Character" SET "constitution" = 3, "strength" = 2, "intelligence" = 10, "dexterity" = 5
WHERE "classId" = 'mage' AND "constitution" = 5 AND "strength" = 5 AND "intelligence" = 5 AND "dexterity" = 5;
UPDATE "Character" SET "constitution" = 4, "strength" = 5, "intelligence" = 3, "dexterity" = 9
WHERE "classId" = 'archer' AND "constitution" = 5 AND "strength" = 5 AND "intelligence" = 5 AND "dexterity" = 5;
UPDATE "Character" SET "attributePoints" = GREATEST("attributePoints", ("level" - 1) * 5);

ALTER TABLE "ItemDefinition"
  ADD COLUMN "description" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "slot" TEXT,
  ADD COLUMN "stackable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "maxStack" INTEGER NOT NULL DEFAULT 99,
  ADD COLUMN "levelReq" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "stats" JSONB;

ALTER TABLE "InventoryItem"
  ADD CONSTRAINT "InventoryItem_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "ItemDefinition"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CharacterEquipment" (
  "id" TEXT NOT NULL,
  "characterId" TEXT NOT NULL,
  "slot" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "equippedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CharacterEquipment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CharacterEquipment_characterId_slot_key"
  ON "CharacterEquipment"("characterId", "slot");
CREATE INDEX "CharacterEquipment_characterId_idx"
  ON "CharacterEquipment"("characterId");

ALTER TABLE "CharacterEquipment"
  ADD CONSTRAINT "CharacterEquipment_characterId_fkey"
  FOREIGN KEY ("characterId") REFERENCES "Character"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CharacterEquipment_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "ItemDefinition"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "ItemDefinition" ("id","name","description","rarity","category","slot","stackable","maxStack","tradeable","levelReq","stats") VALUES
('rusty-sword','Espada Enferrujada','Uma espada simples para aventureiros iniciantes.','common','weapon','weapon',false,1,false,1,'{"strength":1,"physicalDamage":2}'::jsonb),
('apprentice-robe','Manto do Aprendiz','Um manto leve com proteção mágica.','common','armor','chest',false,1,false,1,'{"intelligence":1,"magicDefense":2}'::jsonb),
('small-potion','Poção de Vida Pequena','Recupera vida quando o sistema de consumíveis for ativado.','common','consumable',NULL,true,99,false,1,'{}'::jsonb),
('slime-gel','Geleia de Slime','Material viscoso deixado por Slimes.','common','material',NULL,true,99,false,1,'{}'::jsonb),
('boar-hide','Couro de Javali','Couro resistente deixado por javalis.','common','material',NULL,true,99,false,1,'{}'::jsonb),
('wolf-pelt','Pele de Lobo','Pele macia deixada por lobos.','common','material',NULL,true,99,false,1,'{}'::jsonb)
ON CONFLICT ("id") DO NOTHING;

-- Equipamento inicial fica disponível no inventário; o jogador escolhe quando equipar.
