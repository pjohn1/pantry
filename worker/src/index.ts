export interface Env {
  ALLOWED_ORIGINS: string;
}

interface RecipeResult {
  title: string;
  url: string;
  ingredients: string[];
  description?: string;
  image?: string;
  totalTime?: string;
  recipeYield?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(request, env);
    }

    if (request.method !== 'GET') {
      return jsonError('Method not allowed', 405, request, env);
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return jsonError('Missing "url" query parameter', 400, request, env);
    }

    // Validate URL
    try {
      const parsed = new URL(targetUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return jsonError('URL must use http or https', 400, request, env);
      }
    } catch {
      return jsonError('Invalid URL', 400, request, env);
    }

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'PantryTracker-RecipeParser/1.0',
          'Accept': 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        return jsonError(`Failed to fetch URL: ${response.status}`, 502, request, env);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('xhtml')) {
        return jsonError('URL did not return HTML content', 400, request, env);
      }

      // Limit response size to 5MB
      const body = await response.text();
      if (body.length > 5 * 1024 * 1024) {
        return jsonError('Page too large to process', 413, request, env);
      }

      const recipes = extractRecipesFromHTML(body);

      if (recipes.length === 0) {
        return jsonError(
          'No Recipe structured data found on this page. Try a recipe from AllRecipes, Food Network, or similar sites.',
          404,
          request,
          env
        );
      }

      return jsonResponse({ recipes }, request, env);
    } catch (err) {
      return jsonError(`Fetch error: ${(err as Error).message}`, 500, request, env);
    }
  },
};

function extractRecipesFromHTML(html: string): RecipeResult[] {
  const results: RecipeResult[] = [];

  // Match all <script type="application/ld+json"> blocks
  const scriptRegex = /<script\s+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      const items = Array.isArray(json) ? json : [json];

      for (const item of items) {
        // Handle @graph pattern (WordPress recipe plugins)
        if (item['@graph'] && Array.isArray(item['@graph'])) {
          for (const graphItem of item['@graph']) {
            const recipe = tryExtractRecipe(graphItem);
            if (recipe) results.push(recipe);
          }
        } else {
          const recipe = tryExtractRecipe(item);
          if (recipe) results.push(recipe);
        }
      }
    } catch {
      // Skip invalid JSON
    }
  }

  return results;
}

function tryExtractRecipe(obj: Record<string, unknown>): RecipeResult | null {
  if (!obj) return null;

  const type = obj['@type'];
  const isRecipe =
    type === 'Recipe' ||
    (Array.isArray(type) && type.includes('Recipe'));

  if (!isRecipe) return null;

  const ingredients: string[] = [];
  if (Array.isArray(obj.recipeIngredient)) {
    for (const ing of obj.recipeIngredient) {
      if (typeof ing === 'string' && ing.trim()) {
        ingredients.push(ing.trim());
      }
    }
  }

  if (ingredients.length === 0) return null;

  return {
    title: (typeof obj.name === 'string' ? obj.name : 'Untitled Recipe'),
    url: (typeof obj.url === 'string' ? obj.url : ''),
    ingredients,
    description: typeof obj.description === 'string' ? obj.description : undefined,
    image: typeof obj.image === 'string'
      ? obj.image
      : (obj.image && typeof (obj.image as Record<string, unknown>).url === 'string')
        ? (obj.image as Record<string, unknown>).url as string
        : undefined,
    totalTime: typeof obj.totalTime === 'string' ? obj.totalTime : undefined,
    recipeYield: typeof obj.recipeYield === 'string' ? obj.recipeYield : undefined,
  };
}

function getCORSHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim());
  const isAllowed = allowed.includes('*') || allowed.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? (allowed.includes('*') ? '*' : origin) : '',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function handleCORS(request: Request, env: Env): Response {
  return new Response(null, {
    status: 204,
    headers: getCORSHeaders(request, env),
  });
}

function jsonResponse(data: unknown, request: Request, env: Env): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...getCORSHeaders(request, env),
    },
  });
}

function jsonError(message: string, status: number, request: Request, env: Env): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCORSHeaders(request, env),
    },
  });
}
