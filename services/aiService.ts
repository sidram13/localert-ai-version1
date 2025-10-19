
import { GoogleGenAI, Type } from "@google/genai";
import { Coordinates } from "../types";

// The API key is now expected to be injected from the environment.
const apiKey = process.env.API_KEY;

// Initialize with the key if it exists.
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Checks if the API key is available and the ai instance is initialized.
 * Throws a user-friendly error if not.
 */
function checkApiKey() {
  if (!ai) {
    throw new Error("Failed to call the Gemini API: API key is missing. Please add your key in the 'Secrets' panel and refresh the page.");
  }
}

/**
 * A utility function to retry an async operation with exponential backoff.
 * @param asyncFn The async function to retry.
 * @param retries The number of retries. Default is 3.
 * @returns A promise that resolves with the result of the async function.
 */
async function withRetry<T>(asyncFn: () => Promise<T>, retries = 3): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      return await asyncFn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.warn(`API call failed. Retrying in ${delay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Geocodes a destination string into coordinates using the Gemini API.
 * @param destination - The destination address or place name.
 * @param userLocation - The user's current location to provide context.
 * @returns A promise that resolves to a Coordinates object or null if not found.
 */
export async function getCoordinatesForDestination(destination: string, userLocation: Coordinates | null): Promise<Coordinates | null> {
  checkApiKey();
  try {
    return await withRetry(async () => {
      const locationContext = userLocation
        ? `The user is currently near latitude ${userLocation.latitude} and longitude ${userLocation.longitude}.`
        : 'The user is likely in India.';

      const prompt = `Provide the precise geographic coordinates (latitude and longitude) for the following location: "${destination}". ${locationContext} Prioritize results in India.`;

      const response = await ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              latitude: {
                type: Type.NUMBER,
                description: "The latitude of the location."
              },
              longitude: {
                type: Type.NUMBER,
                description: "The longitude of the location."
              }
            },
            required: ["latitude", "longitude"]
          }
        }
      });

      const jsonText = response.text.trim();
      if (!jsonText) {
          console.error("Geocoding API returned an empty response.");
          return null;
      }

      const parsed = JSON.parse(jsonText);
      
      if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
        return parsed as Coordinates;
      } else {
        console.error("Geocoded data is in the wrong format:", parsed);
        return null;
      }
    });
  } catch (error) {
    console.error("Error geocoding destination after retries:", error);
    if (error instanceof Error) {
        throw new Error(`After multiple attempts, the AI service failed. Please check your internet connection and try again.`);
    }
    return null;
  }
}

/**
 * Fetches location suggestions based on a query string.
 * @param query - The user's input string.
 * @param userLocation - The user's current location to provide context.
 * @returns A promise that resolves to an array of suggestion strings or null.
 */
export async function getDestinationSuggestions(query: string, userLocation: Coordinates | null): Promise<string[] | null> {
  checkApiKey();
  if (query.length < 3) {
    return [];
  }
  try {
    return await withRetry(async () => {
      const locationContext = userLocation
        ? `The user is searching from near latitude ${userLocation.latitude} and longitude ${userLocation.longitude}.`
        : 'The user is likely in India.';
        
      const prompt = `Provide up to 5 relevant location name suggestions for the search term "${query}". ${locationContext} The suggestions should be concise and relevant for a location search box, prioritizing locations in India.`;

      const response = await ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                  description: 'A single location suggestion name (e.g., "Eiffel Tower, Paris" or "Union Station, Los Angeles").'
                },
                description: "An array of location suggestion strings."
              }
            },
            required: ["suggestions"]
          }
        }
      });

      const jsonText = response.text.trim();
      if (!jsonText) {
          console.error("Suggestion API returned an empty response.");
          return null;
      }

      const parsed = JSON.parse(jsonText);
      
      if (Array.isArray(parsed.suggestions)) {
        return parsed.suggestions as string[];
      } else {
        console.error("Suggestion data is in the wrong format:", parsed);
        return null;
      }
    });
  } catch (error) {
    console.error("Error getting suggestions after retries:", error);
    if (error instanceof Error) {
        throw new Error(`After multiple attempts, the AI service failed. Please check your internet connection and try again.`);
    }
    return null;
  }
}


/**
 * Geocodes a natural language description of a location into coordinates.
 * @param description - The user's textual description of the destination.
 * @param userLocation - The user's current location for context.
 * @returns A promise that resolves to an object with the place name and coordinates, or null.
 */
export async function getCoordinatesFromDescription(description: string, userLocation: Coordinates | null): Promise<{ name: string; coords: Coordinates } | null> {
  checkApiKey();
  try {
    return await withRetry(async () => {
      const locationContext = userLocation
        ? `The user is currently near latitude ${userLocation.latitude} and longitude ${userLocation.longitude}.`
        : 'The user is likely in India.';

      const prompt = `A user wants to set a destination for a commute alert. They described the location as: "${description}". 
Based on this description and their current location context (${locationContext}), identify the most likely specific place (like a store, park, intersection, or building) they are referring to. 
Provide the official or common name of that place and its precise geographic coordinates. Prioritize well-known public places and transport hubs in India if the context is ambiguous.`;

      const response = await ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              placeName: {
                type: Type.STRING,
                description: "The official or common name of the identified location."
              },
              latitude: {
                type: Type.NUMBER,
                description: "The latitude of the location."
              },
              longitude: {
                type: Type.NUMBER,
                description: "The longitude of the location."
              }
            },
            required: ["placeName", "latitude", "longitude"]
          }
        }
      });

      const jsonText = response.text.trim();
      if (!jsonText) {
          console.error("AI description API returned an empty response.");
          return null;
      }

      const parsed = JSON.parse(jsonText);
      
      if (parsed.placeName && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
        return {
          name: parsed.placeName,
          coords: {
            latitude: parsed.latitude,
            longitude: parsed.longitude,
          }
        };
      } else {
        console.error("AI description data is in the wrong format:", parsed);
        return null;
      }
    });
  } catch (error) {
    console.error("Error geocoding from description after retries:", error);
    if (error instanceof Error) {
        throw new Error(`After multiple attempts, the AI service failed. Please check your internet connection and try again.`);
    }
    return null;
  }
}
