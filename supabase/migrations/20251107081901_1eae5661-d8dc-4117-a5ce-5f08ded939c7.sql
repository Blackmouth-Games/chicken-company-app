-- Create store_products table
CREATE TABLE public.store_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_key text NOT NULL UNIQUE, -- Unique identifier for redirecting
  name text NOT NULL,
  description text,
  price_ton numeric NOT NULL,
  content_items text[], -- Array of content items (e.g., ["Subida de nivel de Maria la Pollera a nivel 2", "Nuevo corral"])
  store_image_url text NOT NULL, -- Image shown in store grid
  detail_image_url text NOT NULL, -- Image shown in popup
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active products
CREATE POLICY "Active products are viewable by everyone"
ON public.store_products
FOR SELECT
USING (is_active = true);

-- Create index for product_key lookups
CREATE INDEX idx_store_products_product_key ON public.store_products(product_key);

-- Create index for sort order
CREATE INDEX idx_store_products_sort_order ON public.store_products(sort_order);

-- Add trigger for updated_at
CREATE TRIGGER update_store_products_updated_at
BEFORE UPDATE ON public.store_products
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert sample products
INSERT INTO public.store_products (product_key, name, description, price_ton, content_items, store_image_url, detail_image_url, sort_order) VALUES
('starter_pack', 'Starter Pack', 'Paquete inicial para comenzar tu granja', 15, ARRAY['Subida de nivel de Maria la Pollera a nivel 2', 'Nuevo corral', 'Nuevo Granjero Juan'], 'https://placeholder.com/store-starter.png', 'https://placeholder.com/detail-starter.png', 1),
('christmas_pack', 'Christmas Pack', 'Edición especial de Navidad', 2.5, ARRAY['Decoraciones navideñas', 'Market especial', 'Bonus de temporada'], 'https://placeholder.com/store-christmas.png', 'https://placeholder.com/detail-christmas.png', 2),
('winter_chickens', 'Winter Chickens', 'Pack de 200 gallinas de invierno', 202, ARRAY['200 gallinas de invierno', 'Resistentes al frío'], 'https://placeholder.com/store-winter.png', 'https://placeholder.com/detail-winter.png', 3),
('support_builders', 'Support Builders', 'Apoyo a los constructores', 10, ARRAY['Trabajador adicional', 'Velocidad de construcción aumentada'], 'https://placeholder.com/store-builders.png', 'https://placeholder.com/detail-builders.png', 4);
