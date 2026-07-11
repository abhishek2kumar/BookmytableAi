import re

with open('server.ts', 'r') as f:
    content = f.read()

cache_init = """let vite: any;
let restaurantSlugCache: Record<string, any> = {};
let lastCacheUpdate = 0;
"""

content = content.replace("let vite: any;", cache_init)

query_block = """              const q = query(collection(db, 'restaurants'));
              const querySnapshot = await getDocs(q);
              const slugify = (text: string) => {
                if (!text) return '';
                return text.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
              };
              for (const docSnap of querySnapshot.docs) {
                 const data = docSnap.data();
                 const rNameSlug = slugify(data.name || 'restaurant');
                 const rLocSlug = slugify(data.location || '');
                 const combined = rLocSlug ? `${rNameSlug}-${rLocSlug}` : rNameSlug;
                 if (combined === slug) {
                    restaurantData = { id: docSnap.id, ...data };
                    break;
                 }
              }"""

cached_query_block = """              const now = Date.now();
              if (now - lastCacheUpdate > 1000 * 60 * 15 || !restaurantSlugCache[slug]) { // 15 min cache
                const q = query(collection(db, 'restaurants'));
                const querySnapshot = await getDocs(q);
                const slugify = (text: string) => {
                  if (!text) return '';
                  return text.toString().toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                };
                for (const docSnap of querySnapshot.docs) {
                   const data = docSnap.data();
                   const rNameSlug = slugify(data.name || 'restaurant');
                   const rLocSlug = slugify(data.location || '');
                   const combined = rLocSlug ? `${rNameSlug}-${rLocSlug}` : rNameSlug;
                   restaurantSlugCache[combined] = { id: docSnap.id, ...data };
                }
                lastCacheUpdate = now;
              }
              
              if (restaurantSlugCache[slug]) {
                 restaurantData = restaurantSlugCache[slug];
              }"""

content = content.replace(query_block, cached_query_block)

with open('server.ts', 'w') as f:
    f.write(content)
