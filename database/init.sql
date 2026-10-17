CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL,
  description TEXT,
  prix DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  "categorieId" INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO categories (nom, description)
SELECT 'Informatique', 'Ordinateurs, composants et périphériques'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE nom = 'Informatique');

INSERT INTO categories (nom, description)
SELECT 'Audio', 'Casques, écouteurs et enceintes'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE nom = 'Audio');

INSERT INTO categories (nom, description)
SELECT 'Accessoires', 'Accessoires et gadgets divers'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE nom = 'Accessoires');

INSERT INTO categories (nom, description)
SELECT 'Mobiles', 'Smartphones, tablettes et accessoires mobiles'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE nom = 'Mobiles');

INSERT INTO categories (nom, description)
SELECT 'Gaming', 'Consoles, jeux et équipement gaming'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE nom = 'Gaming');

INSERT INTO categories (nom, description)
SELECT 'Maison Connectée', 'Objets connectés et domotique'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE nom = 'Maison Connectée');

INSERT INTO products (nom, description, prix, stock, "categorieId")
SELECT 'Ordinateur Portable', 'Ordinateur portable haute performance 16Go RAM', 899.99, 10, (SELECT id FROM categories WHERE nom = 'Informatique')
WHERE NOT EXISTS (SELECT 1 FROM products WHERE nom = 'Ordinateur Portable');

INSERT INTO products (nom, description, prix, stock, "categorieId")
SELECT 'Souris Sans Fil', 'Souris ergonomique sans fil', 29.99, 50, (SELECT id FROM categories WHERE nom = 'Informatique')
WHERE NOT EXISTS (SELECT 1 FROM products WHERE nom = 'Souris Sans Fil');

INSERT INTO products (nom, description, prix, stock, "categorieId")
SELECT 'Clavier Mécanique', 'Clavier mécanique RGB rétroéclairé', 79.99, 30, (SELECT id FROM categories WHERE nom = 'Gaming')
WHERE NOT EXISTS (SELECT 1 FROM products WHERE nom = 'Clavier Mécanique');
