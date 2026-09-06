import express, { Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { constructIbsSystemInstruction } from './src/lib/clinicalKnowledgeBase';
import { NutritionLogEntry, GutHealthLogEntry } from './src/types';

import 'dotenv/config';

const PORT = 3000;

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } }) 
  : null;

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Robust Gemini model invoker with exponential backoff retry and automatic model fallback.
 * Solves 503 "model experiencing high demand" spikes.
 */
async function callGeminiWithRetryAndFallback(
  ai: GoogleGenAI,
  generateParams: {
    contents: any;
    config: any;
  }
) {
  // Ordered models: standard primary, latest flash alias, and lightweight flash lite
  const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini API] Requesting ${model} (attempt ${attempt}/2)...`);
        const response = await ai.models.generateContent({
          model,
          contents: generateParams.contents,
          config: generateParams.config,
        });

        if (response && response.text) {
          console.log(`[Gemini API] Success with model: ${model}`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isTransient =
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('rate limit');

        console.warn(`[Gemini API] Model ${model} attempt ${attempt} failed: ${errMsg}`);

        if (isTransient && attempt < 2) {
          // Wait 1.5s then retry this model
          await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
          continue;
        }

        // If transient and attempts exhausted on this model, proceed to the next fallback model
        if (isTransient) {
          break;
        }

        // Non-transient error (e.g. invalid arguments/format), rethrow directly
        throw err;
      }
    }
  }

  throw (
    lastError ||
    new Error(
      'The AI models are currently experiencing temporary high demand across endpoints. Please retry shortly.'
    )
  );
}

async function startServer() {
  const app = express();

  // Support up to 25MB payloads for high-resolution food photo uploads
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // 1. Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // 2. GET logs (from Supabase PostgreSQL)
  app.get('/api/logs', async (req: Request, res: Response) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase backend not configured.' });
    const userId = req.query.userId as string | undefined;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    try {
      const { data: nutData, error: nutErr } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (nutErr) throw nutErr;

      const { data: gutData, error: gutErr } = await supabase
        .from('gut_health_logs')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (gutErr) throw gutErr;

      const formatNutrition = (row: any) => ({
        id: row.id,
        userId: row.user_id,
        timestamp: row.timestamp,
        meal: row.meal,
        portion: row.portion,
        calories: Number(row.calories) || 0,
        protein: Number(row.protein) || 0,
        carbs: Number(row.carbs) || 0,
        fat: Number(row.fat) || 0,
        fiber: Number(row.fiber) || 0,
        sodium: Number(row.sodium) || 0,
        potassium: Number(row.potassium) || 0,
        keyVitamins: Array.isArray(row.key_vitamins) ? row.key_vitamins : [],
        isEstimated: Boolean(row.is_estimated),
        confidence: Number(row.confidence) || 90,
        notes: row.notes || '',
      });

      const formatGut = (row: any) => ({
        id: row.id,
        userId: row.user_id,
        timestamp: row.timestamp,
        mealReferenceId: row.meal_reference_id,
        mealName: row.meal_name,
        ibsRiskLevel: row.ibs_risk_level as any,
        identifiedTriggers: Array.isArray(row.identified_triggers) ? row.identified_triggers : [],
        fodmapCategories: {
          fructans: Number(row.fodmap_fructans) || 0,
          lactose: Number(row.fodmap_lactose) || 0,
          excess_fructose: Number(row.fodmap_excess_fructose) || 0,
          polyols: Number(row.fodmap_polyols) || 0,
          gos: Number(row.fodmap_gos) || 0,
        },
        predictiveDigestiveReaction: row.predictive_digestive_reaction || '',
        aiRecommendation: row.ai_recommendation || '',
        groundingReference: row.grounding_reference || '',
      });

      res.json({
        nutrition: (nutData || []).map(formatNutrition),
        gutHealth: (gutData || []).map(formatGut),
      });
    } catch (err: any) {
      console.error('Fetch logs error:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch logs' });
    }
  });

  // 3. POST new entry
  app.post('/api/logs', async (req: Request, res: Response) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase backend not configured.' });
    
    try {
      const { nutrition, gutHealth, userId } = req.body;
      if (!nutrition || !gutHealth || !userId) {
        return res.status(400).json({ error: 'userId, nutrition, and gutHealth are required.' });
      }

      // Insert nutrition log
      const { error: nutErr } = await supabase.from('nutrition_logs').insert({
        id: nutrition.id,
        user_id: userId,
        timestamp: nutrition.timestamp,
        meal: nutrition.meal,
        portion: nutrition.portion,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        fiber: nutrition.fiber,
        sodium: nutrition.sodium,
        potassium: nutrition.potassium,
        key_vitamins: nutrition.keyVitamins || [],
        is_estimated: nutrition.isEstimated,
        confidence: nutrition.confidence,
        notes: nutrition.notes || '',
      });

      if (nutErr) throw nutErr;

      // Insert gut health log
      const { error: gutErr } = await supabase.from('gut_health_logs').insert({
        id: gutHealth.id,
        user_id: userId,
        timestamp: gutHealth.timestamp,
        meal_reference_id: nutrition.id,
        meal_name: gutHealth.mealName || nutrition.meal,
        ibs_risk_level: gutHealth.ibsRiskLevel,
        identified_triggers: gutHealth.identifiedTriggers || [],
        fodmap_fructans: gutHealth.fodmapCategories?.fructans || 0,
        fodmap_lactose: gutHealth.fodmapCategories?.lactose || 0,
        fodmap_excess_fructose: gutHealth.fodmapCategories?.excess_fructose || 0,
        fodmap_polyols: gutHealth.fodmapCategories?.polyols || 0,
        fodmap_gos: gutHealth.fodmapCategories?.gos || 0,
        predictive_digestive_reaction: gutHealth.predictiveDigestiveReaction || '',
        ai_recommendation: gutHealth.aiRecommendation || '',
        grounding_reference: gutHealth.groundingReference || '',
      });

      if (gutErr) throw gutErr;

      res.status(201).json({ success: true });
    } catch (err: any) {
      console.error('Error adding log:', err);
      res.status(500).json({ error: err.message || 'Failed to save log entry' });
    }
  });

  // 4. DELETE log
  app.delete('/api/logs/:id', async (req: Request, res: Response) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase backend not configured.' });
    const { id } = req.params;
    const userId = req.query.userId as string | undefined;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    try {
      const { error } = await supabase
        .from('nutrition_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
        
      if (error) throw error;
      return res.json({ success: true, message: 'Record removed successfully' });
    } catch (err: any) {
      console.error('Error deleting log:', err);
      return res.status(500).json({ error: 'Failed to delete log entry' });
    }
  });

  // 4b. PUT update log
  app.put('/api/logs/:id', async (req: Request, res: Response) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase backend not configured.' });
    const { id } = req.params;
    const { nutrition, gutHealth, userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    try {
      if (nutrition) {
        const { error: nutErr } = await supabase
          .from('nutrition_logs')
          .update({
            timestamp: nutrition.timestamp,
            meal: nutrition.meal,
            portion: nutrition.portion,
            calories: nutrition.calories,
            protein: nutrition.protein,
            carbs: nutrition.carbs,
            fat: nutrition.fat,
            fiber: nutrition.fiber,
            sodium: nutrition.sodium,
            potassium: nutrition.potassium,
            key_vitamins: nutrition.keyVitamins || [],
            is_estimated: nutrition.isEstimated,
            confidence: nutrition.confidence,
            notes: nutrition.notes || '',
          })
          .eq('id', id)
          .eq('user_id', userId);
        if (nutErr) throw nutErr;
      }

      if (gutHealth) {
        const { error: gutErr } = await supabase
          .from('gut_health_logs')
          .update({
            timestamp: gutHealth.timestamp,
            meal_name: gutHealth.mealName || nutrition?.meal,
            ibs_risk_level: gutHealth.ibsRiskLevel,
            identified_triggers: gutHealth.identifiedTriggers || [],
            fodmap_fructans: gutHealth.fodmapCategories?.fructans || 0,
            fodmap_lactose: gutHealth.fodmapCategories?.lactose || 0,
            fodmap_excess_fructose: gutHealth.fodmapCategories?.excess_fructose || 0,
            fodmap_polyols: gutHealth.fodmapCategories?.polyols || 0,
            fodmap_gos: gutHealth.fodmapCategories?.gos || 0,
            predictive_digestive_reaction: gutHealth.predictiveDigestiveReaction || '',
            ai_recommendation: gutHealth.aiRecommendation || '',
            grounding_reference: gutHealth.groundingReference || '',
          })
          .eq('meal_reference_id', id)
          .eq('user_id', userId);
        if (gutErr) throw gutErr;
      }

      return res.json({ success: true, message: 'Record updated successfully' });
    } catch (err: any) {
      console.error('Error updating log:', err);
      return res.status(500).json({ error: 'Failed to update log entry' });
    }
  });

  // 6. POST analyze-food (Multimodal Gemini with Notebook Grounding)
  app.post('/api/analyze-food', async (req: Request, res: Response) => {
    try {
      const { textDescription, imageBase64, imageMimeType, customRules, userTolerance } = req.body;

      if (!textDescription && !imageBase64) {
        return res.status(400).json({
          error: 'Please provide either a meal photo upload or a text meal description.',
        });
      }

      const ai = getGeminiClient();

      // Formulate system instruction grounded with clinical rules and personal tolerance profile
      const systemInstruction = constructIbsSystemInstruction(customRules, userTolerance);

      // Assemble multimodal payload
      const contentsParts: any[] = [];

      if (imageBase64) {
        // Strip data URI prefix if present
        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
        contentsParts.push({
          inlineData: {
            mimeType: imageMimeType || 'image/jpeg',
            data: cleanBase64,
          },
        });
      }

      let userPrompt = `Analyze this meal thoroughly for macronutrients, micronutrients, portion sizes, and clinical IBS / FODMAP risk:\n`;
      if (textDescription) {
        userPrompt += `Meal Description & Ingredients: "${textDescription}"\n`;
      } else {
        userPrompt += `Analyze the food items shown in the attached photograph.\n`;
      }
      userPrompt += `Follow the grounded clinical criteria. If the image is partially obscured or portions are uncertain, flag isEstimated as true and assign an honest confidence score (0-100%). Return strictly formatted JSON.`;

      contentsParts.push({ text: userPrompt });

      // Call Gemini with structured schema, automatic exponential backoff, and model fallback
      const response = await callGeminiWithRetryAndFallback(ai, {
        contents: { parts: contentsParts },
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mealName: {
                type: Type.STRING,
                description: 'Clear, concise name of the analyzed meal or food item.',
              },
              portionEstimate: {
                type: Type.STRING,
                description: 'Estimated portions with units (e.g. 1 bowl, 180g, 1 slice).',
              },
              calories: {
                type: Type.NUMBER,
                description: 'Estimated total calories (kcal).',
              },
              protein_g: {
                type: Type.NUMBER,
                description: 'Estimated protein in grams.',
              },
              carbs_g: {
                type: Type.NUMBER,
                description: 'Estimated total carbohydrates in grams.',
              },
              fat_g: {
                type: Type.NUMBER,
                description: 'Estimated total fats in grams.',
              },
              fiber_g: {
                type: Type.NUMBER,
                description: 'Estimated dietary fiber in grams.',
              },
              sodium_mg: {
                type: Type.NUMBER,
                description: 'Estimated sodium in milligrams.',
              },
              potassium_mg: {
                type: Type.NUMBER,
                description: 'Estimated potassium in milligrams.',
              },
              keyVitamins: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Top micronutrients / vitamins present with daily value percentage or milligram amounts.',
              },
              isEstimated: {
                type: Type.BOOLEAN,
                description: 'True if image was blurry, ingredients uncertain, or portion had to be estimated.',
              },
              confidence: {
                type: Type.NUMBER,
                description: 'Overall confidence rating from 0 to 100 for this nutritional estimation.',
              },
              ibsRiskLevel: {
                type: Type.STRING,
                description: 'Overall IBS gut health risk: strictly "Low", "Medium", or "High".',
              },
              highFodmapTriggers: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Specific identified high or moderate FODMAP ingredients, e.g. "Garlic (Fructans)".',
              },
              fodmapScores: {
                type: Type.OBJECT,
                description: 'Scores from 0 (none) to 5 (high concentration) for each FODMAP group.',
                properties: {
                  fructans: { type: Type.NUMBER },
                  lactose: { type: Type.NUMBER },
                  excess_fructose: { type: Type.NUMBER },
                  polyols: { type: Type.NUMBER },
                  gos: { type: Type.NUMBER },
                },
                required: ['fructans', 'lactose', 'excess_fructose', 'polyols', 'gos'],
              },
              predictiveDigestiveReaction: {
                type: Type.STRING,
                description: 'Open-minded physiological prediction of digestive transit and symptoms. Do not limit solely to diarrhea; address potential motility effects in both directions (rapid transit vs constipation/bloating/gas distension or alternating patterns), along with latency.',
              },
              aiRecommendation: {
                type: Type.STRING,
                description: 'Actionable culinary or clinical substitutions (e.g. hing instead of garlic paste, tempered ginger/curry leaves, steamed vs fried, balanced soluble fiber) to make this meal gut-safe across diverse IBS presentations.',
              },
              groundingCitation: {
                type: Type.STRING,
                description: 'Specific clinical research reference from the user library (e.g., Holtmann et al. 2016, Mayer et al. 2023, StatPearls 2026, or WGO 2015).',
              },
              analysisSummary: {
                type: Type.STRING,
                description: '2-sentence overarching synthesis of nutritional balance and gut compatibility.',
              },
            },
            required: [
              'mealName',
              'portionEstimate',
              'calories',
              'protein_g',
              'carbs_g',
              'fat_g',
              'fiber_g',
              'sodium_mg',
              'potassium_mg',
              'keyVitamins',
              'isEstimated',
              'confidence',
              'ibsRiskLevel',
              'highFodmapTriggers',
              'fodmapScores',
              'predictiveDigestiveReaction',
              'aiRecommendation',
              'groundingCitation',
              'analysisSummary',
            ],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini API returned an empty response.');
      }

      const parsed = JSON.parse(responseText);

      // Construct normalized objects
      const timestamp = new Date().toISOString();
      const mealId = 'meal-' + Date.now();

      const normalizedRisk: 'Low' | 'Medium' | 'High' =
        parsed.ibsRiskLevel === 'Low' || parsed.ibsRiskLevel === 'Medium' || parsed.ibsRiskLevel === 'High'
          ? parsed.ibsRiskLevel
          : 'Medium';

      const nutrition: NutritionLogEntry = {
        id: 'nut-' + Date.now(),
        timestamp,
        meal: parsed.mealName || 'Analyzed Meal',
        portion: parsed.portionEstimate || 'Standard portion',
        calories: Math.round(parsed.calories || 0),
        protein: Math.round((parsed.protein_g || 0) * 10) / 10,
        carbs: Math.round((parsed.carbs_g || 0) * 10) / 10,
        fat: Math.round((parsed.fat_g || 0) * 10) / 10,
        fiber: Math.round((parsed.fiber_g || 0) * 10) / 10,
        sodium: Math.round(parsed.sodium_mg || 0),
        potassium: Math.round(parsed.potassium_mg || 0),
        keyVitamins: Array.isArray(parsed.keyVitamins) ? parsed.keyVitamins : [],
        isEstimated: Boolean(parsed.isEstimated),
        confidence: Math.min(100, Math.max(0, Math.round(parsed.confidence || 85))),
        notes: parsed.analysisSummary || '',
      };

      const gutHealth: GutHealthLogEntry = {
        id: 'gut-' + Date.now(),
        timestamp,
        mealReferenceId: nutrition.id,
        mealName: parsed.mealName || 'Analyzed Meal',
        ibsRiskLevel: normalizedRisk,
        identifiedTriggers: Array.isArray(parsed.highFodmapTriggers) ? parsed.highFodmapTriggers : [],
        fodmapCategories: {
          fructans: Math.min(5, Math.max(0, parsed.fodmapScores?.fructans || 0)),
          lactose: Math.min(5, Math.max(0, parsed.fodmapScores?.lactose || 0)),
          excess_fructose: Math.min(5, Math.max(0, parsed.fodmapScores?.excess_fructose || 0)),
          polyols: Math.min(5, Math.max(0, parsed.fodmapScores?.polyols || 0)),
          gos: Math.min(5, Math.max(0, parsed.fodmapScores?.gos || 0)),
        },
        predictiveDigestiveReaction: parsed.predictiveDigestiveReaction || 'Neutral digestion anticipated.',
        aiRecommendation: parsed.aiRecommendation || 'Maintain balanced portions and hydration.',
        groundingReference: parsed.groundingCitation || 'Monash University Low-FODMAP Diet Standards',
      };

      res.json({
        nutrition,
        gutHealth,
        analysisSummary: parsed.analysisSummary || 'Analysis completed successfully.',
      });
    } catch (err: any) {
      console.error('Error in /api/analyze-food:', err);
      const errMsg = err?.message || String(err);
      const isHighDemand =
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        errMsg.includes('Resource has been exhausted') ||
        errMsg.includes('429');

      const statusCode = isHighDemand ? 503 : 500;
      const userMessage = isHighDemand
        ? 'Google AI models are currently experiencing temporary high demand. Please click "Retry Analysis" to re-send.'
        : errMsg || 'An error occurred while evaluating nutritional and gut health data.';

      res.status(statusCode).json({
        error: userMessage,
        isHighDemand,
        canRetry: true,
      });
    }
  });

  // Vite development middleware or static production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
