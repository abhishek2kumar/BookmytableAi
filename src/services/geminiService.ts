import { GoogleGenAI, Type } from "@google/genai";
import { Restaurant, CUISINES } from "../types";

// In Vite, process.env is handled via 'define' in vite.config.ts for build time
// For runtime in AI Studio, it's injected from secrets.
const apiKey = (process.env.GEMINI_API_KEY || '').trim();

if (!apiKey || apiKey.length < 10) {
  console.warn("GEMINI_API_KEY is missing or invalid. Please ensure it is set in Settings > Secrets.");
}

const ai = new GoogleGenAI({ apiKey });

export async function searchRealRestaurants(query: string = "Bangalore"): Promise<Partial<Restaurant>[]> {
  try {
    const searchResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Search for the top 15 most popular and highly-rated restaurants in or around "${query}", India. 
      For each, provide: name, precise location, cuisine, avg cost for two, coordinates, 1-sentence description, opening hours, facilities, offers, and a sample menu.`,
      tools: [{ googleSearch: { searchTypes: { webSearch: {} } } }]
    } as any);

    const parseResponse = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Convert the following real restaurant search results into a clean JSON array.
      - Use ONLY these Cuisines: ${CUISINES.join(', ')}.
      RAW DATA: ${searchResponse.text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              cuisine: { type: Type.STRING },
              avgPrice: { type: Type.NUMBER },
              location: { type: Type.STRING },
              image: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              openingHours: { 
                type: Type.OBJECT, 
                properties: { 
                  open: { type: Type.STRING },
                  close: { type: Type.STRING },
                  days: { type: Type.STRING }
                }
              },
              facilities: { type: Type.ARRAY, items: { type: Type.STRING } },
              offers: { type: Type.ARRAY, items: { type: Type.STRING } },
              menu: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: { 
                    name: { type: Type.STRING }, 
                    price: { type: Type.NUMBER }, 
                    description: { type: Type.STRING } 
                  } 
                } 
              }
            },
            required: ['name', 'location', 'cuisine', 'avgPrice']
          }
        }
      }
    });

    const parsed = JSON.parse(parseResponse.text || '[]');
    return parsed.map((item: any) => ({
      ...item,
      image: `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800&sig=${Math.random()}`.replace('photo-1517248135467-4c7edcad34c4', getPhotoId(item.cuisine || 'fine dining')),
      lat: item.lat || (18.5204 + (Math.random() - 0.5) * 0.1),
      lng: item.lng || (73.8567 + (Math.random() - 0.5) * 0.1)
    }));
  } catch (error) {
    console.error("Error searching real restaurants:", error);
    return [];
  }
}

function getPhotoId(keyword: string): string {
  const map: Record<string, string> = {
    'south indian': 'photo-1589302168068-964664d93dc0',
    'north indian': 'photo-1585937421612-70a008356fbe',
    'chinese': 'photo-1525755662778-989d0524087e',
    'italian': 'photo-1551183053-bf91a1d81141',
    'fine dining': 'photo-1517248135467-4c7edcad34c4'
  };
  const key = keyword.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v;
  }
  return 'photo-1517248135467-4c7edcad34c4';
}

export async function summarizeGoogleReviews(restaurantName: string, location: string): Promise<string> {
  if (!apiKey || apiKey.length < 10) return "AI Summary is unavailable (API Key missing or invalid). Please configured GEMINI_API_KEY in Secrets.";
  
  try {
    const prompt = `Search for recent Google reviews for the restaurant "${restaurantName}" in "${location}". 
    Summarize in a concise paragraph (max 100 words).`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      tools: [{ googleSearch: { searchTypes: { webSearch: {} } } }]
    } as any);

    return response.text || "No reviews found to summarize.";
  } catch (error: any) {
    console.error("Gemini Review Summary Error:", error);
    if (error.message?.includes("API key not valid")) {
      return "The Gemini API key is reported as invalid by Google. Please verify it in Settings > Secrets.";
    }
    return "The AI summary feature is currently unavailable. Please try again later.";
  }
}
