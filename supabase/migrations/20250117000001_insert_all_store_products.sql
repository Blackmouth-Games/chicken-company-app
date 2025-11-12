-- Insert or update all store products with complete data
-- This migration ensures all products have their names, descriptions, prices, and content_items set correctly

-- Starter Pack
INSERT INTO public.store_products (product_key, name, description, price_ton, content_items, store_image_url, detail_image_url, is_active, sort_order)
VALUES (
  'starter_pack',
  'Starter Pack',
  'Paquete inicial para comenzar tu granja',
  15,
  ARRAY['Subida de nivel de Maria la Pollera a nivel 2', 'Nuevo corral', 'Nuevo Granjero Juan'],
  '/images/store/starter-pack.png',
  '/images/store/starter-pack-detail.png',
  true,
  1
)
ON CONFLICT (product_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_ton = EXCLUDED.price_ton,
  content_items = EXCLUDED.content_items,
  store_image_url = COALESCE(EXCLUDED.store_image_url, store_products.store_image_url),
  detail_image_url = COALESCE(EXCLUDED.detail_image_url, store_products.detail_image_url),
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Christmas Pack
INSERT INTO public.store_products (product_key, name, description, price_ton, content_items, store_image_url, detail_image_url, is_active, sort_order)
VALUES (
  'christmas_pack',
  'Christmas Pack',
  'Edición especial de Navidad',
  2.5,
  ARRAY['Decoraciones navideñas', 'Market especial', 'Bonus de temporada'],
  '/images/store/christmas-pack.png',
  '/images/store/christmas-pack-detail.png',
  true,
  2
)
ON CONFLICT (product_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_ton = EXCLUDED.price_ton,
  content_items = EXCLUDED.content_items,
  store_image_url = COALESCE(EXCLUDED.store_image_url, store_products.store_image_url),
  detail_image_url = COALESCE(EXCLUDED.detail_image_url, store_products.detail_image_url),
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Winter Chickens
INSERT INTO public.store_products (product_key, name, description, price_ton, content_items, store_image_url, detail_image_url, is_active, sort_order)
VALUES (
  'winter_chickens',
  'Winter Chickens',
  'Pack de 200 gallinas de invierno',
  202,
  ARRAY['200 gallinas de invierno', 'Resistentes al frío'],
  '/images/store/winter-chickens.png',
  '/images/store/winter-chickens-detail.png',
  true,
  3
)
ON CONFLICT (product_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_ton = EXCLUDED.price_ton,
  content_items = EXCLUDED.content_items,
  store_image_url = COALESCE(EXCLUDED.store_image_url, store_products.store_image_url),
  detail_image_url = COALESCE(EXCLUDED.detail_image_url, store_products.detail_image_url),
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Support Builders
INSERT INTO public.store_products (product_key, name, description, price_ton, content_items, store_image_url, detail_image_url, is_active, sort_order)
VALUES (
  'support_builders',
  'Support Builders',
  'Apoyo a los constructores',
  10,
  ARRAY['Trabajador adicional', 'Velocidad de construcción aumentada'],
  '/images/store/support-builders.png',
  '/images/store/support-builders-detail.png',
  true,
  4
)
ON CONFLICT (product_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_ton = EXCLUDED.price_ton,
  content_items = EXCLUDED.content_items,
  store_image_url = COALESCE(EXCLUDED.store_image_url, store_products.store_image_url),
  detail_image_url = COALESCE(EXCLUDED.detail_image_url, store_products.detail_image_url),
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Basic Skins Pack
INSERT INTO public.store_products (product_key, name, description, price_ton, content_items, store_image_url, detail_image_url, is_active, sort_order)
VALUES (
  'basic_skins_pack',
  'Pack de Skins Básico',
  'Colección de 5 skins únicos para tus edificios',
  0.5,
  ARRAY['corral_1B', 'corral_2B', 'corral_3B', 'warehouse_1B', 'market_1B'],
  '/images/store/skins-pack.png',
  '/images/store/skins-pack-detail.png',
  true,
  5
)
ON CONFLICT (product_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_ton = EXCLUDED.price_ton,
  content_items = EXCLUDED.content_items,
  store_image_url = COALESCE(EXCLUDED.store_image_url, store_products.store_image_url),
  detail_image_url = COALESCE(EXCLUDED.detail_image_url, store_products.detail_image_url),
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

