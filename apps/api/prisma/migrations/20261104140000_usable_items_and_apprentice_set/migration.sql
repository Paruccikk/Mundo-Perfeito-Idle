-- Consumíveis funcionais, armas por classe e Conjunto do Aprendiz.
INSERT INTO "ItemDefinition" ("id","name","description","rarity","category","slot","stackable","maxStack","tradeable","levelReq","stats") VALUES
('training-sword','Espada de Treino','Arma inicial do Guerreiro.','common','weapon','weapon',false,1,false,1,'{"strength":2,"physicalDamage":4}'::jsonb),
('apprentice-staff','Cajado do Aprendiz','Arma inicial do Mago.','common','weapon','weapon',false,1,false,1,'{"intelligence":2,"magicDamage":5,"maxMp":8}'::jsonb),
('apprentice-mace','Maça do Aprendiz','Arma inicial do Sacerdote.','common','weapon','weapon',false,1,false,1,'{"intelligence":1,"constitution":1,"magicDamage":3,"physicalDefense":1}'::jsonb),
('training-bow','Arco de Treino','Arma inicial do Arqueiro.','common','weapon','weapon',false,1,false,1,'{"dexterity":2,"physicalDamage":4,"critChance":0.01}'::jsonb),
('apprentice-hood','Capuz do Aprendiz','Parte do Conjunto do Aprendiz.','common','armor','head',false,1,false,1,'{"constitution":1,"magicDefense":1}'::jsonb),
('apprentice-chest','Túnica do Aprendiz','Parte do Conjunto do Aprendiz.','common','armor','chest',false,1,false,1,'{"constitution":1,"physicalDefense":1,"magicDefense":1}'::jsonb),
('apprentice-legs','Calças do Aprendiz','Parte do Conjunto do Aprendiz.','common','armor','legs',false,1,false,1,'{"constitution":1,"physicalDefense":1}'::jsonb),
('apprentice-boots','Botas do Aprendiz','Parte do Conjunto do Aprendiz.','common','armor','boots',false,1,false,1,'{"dexterity":1}'::jsonb),
('apprentice-ring','Anel do Aprendiz','Parte do Conjunto do Aprendiz.','common','accessory','accessory',false,1,false,1,'{"intelligence":1,"maxMp":5}'::jsonb),
('small-potion','Poção de Vida Pequena','Recupera 80 pontos de HP.','common','consumable',NULL,true,99,false,1,'{"hpRestore":80}'::jsonb),
('mp-potion','Poção de Mana Pequena','Recupera 60 pontos de MP.','common','consumable',NULL,true,99,false,1,'{"mpRestore":60}'::jsonb),
('revive-potion','Poção da Ressurreição','Revive automaticamente o personagem no mesmo local após uma derrota.','uncommon','consumable',NULL,true,20,false,1,'{"revive":1}'::jsonb)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "rarity" = EXCLUDED."rarity",
  "category" = EXCLUDED."category",
  "slot" = EXCLUDED."slot",
  "stackable" = EXCLUDED."stackable",
  "maxStack" = EXCLUDED."maxStack",
  "levelReq" = EXCLUDED."levelReq",
  "stats" = EXCLUDED."stats";

-- Entrega o conjunto e consumíveis iniciais também a personagens já existentes.
INSERT INTO "InventoryItem" ("id","characterId","itemId","quantity")
SELECT md5(c."id" || ':' || starter."itemId"), c."id", starter."itemId", starter."quantity"
FROM "Character" c
CROSS JOIN LATERAL (
  VALUES
    (CASE c."classId" WHEN 'mage' THEN 'apprentice-staff' WHEN 'priest' THEN 'apprentice-mace' WHEN 'archer' THEN 'training-bow' ELSE 'training-sword' END, 1),
    ('apprentice-hood', 1),
    ('apprentice-chest', 1),
    ('apprentice-legs', 1),
    ('apprentice-boots', 1),
    ('apprentice-ring', 1),
    ('small-potion', 5),
    ('mp-potion', 3),
    ('revive-potion', 1)
) AS starter("itemId","quantity")
WHERE NOT EXISTS (
  SELECT 1 FROM "InventoryItem" i WHERE i."characterId" = c."id" AND i."itemId" = starter."itemId"
);
