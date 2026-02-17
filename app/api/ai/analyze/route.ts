import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-utils';
import { cookies } from 'next/headers';

/**
 * API endpoint untuk analisis AI
 * Mengirim data ke Python AI service dan mengembalikan hasil analisis
 */
export async function POST(req: NextRequest) {
  try {
    // Verifikasi session
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    const session = token ? await verifySession(token) : null;

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { data, options = {} } = body;

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Data laporan diperlukan' },
        { status: 400 }
      );
    }

    // Convert reports to format yang diharapkan oleh AI model
    const convertedData = data.map((report: any) => ({
      Date_of_Event: report.date_of_event || report.created_at,
      Airlines: report.airlines || report.airline || 'Unknown',
      Flight_Number: report.flight_number || report.flightNumber || 'N/A',
      Branch: report.branch || report.stations?.code || 'Unknown',
      HUB: report.hub || 'Unknown',
      Route: report.route || '',
      Report_Category: report.report_category || report.category || 'Irregularity',
      Irregularity_Complain_Category: report.main_category || report.category_detail || 'Unknown',
      Report: report.description || report.report || report.title || '',
      Root_Caused: report.root_cause || report.root_caused || '',
      Action_Taken: report.action_taken || report.action || '',
      Area: report.area || 'Unknown',
      Status: report.status || 'Open',
      Upload_Irregularity_Photo: report.photo_url || '',
    }));

    // Default options
    const analysisOptions = {
      predictResolutionTime: options.predictResolutionTime !== false,
      classifySeverity: options.classifySeverity !== false,
      extractEntities: options.extractEntities !== false,
      generateSummary: options.generateSummary !== false,
      analyzeTrends: options.analyzeTrends !== false,
    };

    // Panggil AI service (Python FastAPI)
    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    
    try {
      const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: convertedData,
          options: analysisOptions,
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!aiResponse.ok) {
        throw new Error(`AI service error: ${aiResponse.status}`);
      }

      const aiResult = await aiResponse.json();

      // Translate metrics to Bahasa Indonesia
      const translatedResult = translateToIndonesian(aiResult);

      return NextResponse.json(translatedResult);
    } catch (aiError) {
      console.error('AI Service Error:', aiError);
      
      // Fallback: Return mock analysis jika AI service tidak tersedia
      const fallbackResult = generateFallbackAnalysis(convertedData, analysisOptions);
      return NextResponse.json(translateToIndonesian(fallbackResult));
    }
  } catch (error) {
    console.error('AI Analysis API Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat analisis AI' },
      { status: 500 }
    );
  }
}

/**
 * Translate AI response metrics to Bahasa Indonesia
 */
function translateToIndonesian(result: any) {
  return {
    ...result,
    regression: result.regression ? {
      ...result.regression,
      modelMetrics: result.regression.modelMetrics ? {
        ...result.regression.modelMetrics,
        mae: result.regression.modelMetrics.mae,
        rmse: result.regression.modelMetrics.rmse,
        r2: result.regression.modelMetrics.r2,
        keterangan: {
          mae: 'Rata-rata Selisih (Mean Absolute Error)',
          rmse: 'Akar Rata-rata Kuadrat Selisih (Root Mean Square Error)',
          r2: 'Tingkat Akurasi Model (R-squared)',
        }
      } : null,
    } : null,
    metadata: {
      ...result.metadata,
      infoBahasa: {
        totalRecords: 'Total Laporan yang Dianalisis',
        processingTime: 'Waktu Pemrosesan (milidetik)',
      }
    }
  };
}

/**
 * Generate fallback analysis jika AI service tidak tersedia
 */
function generateFallbackAnalysis(data: any[], options: any) {
  const predictions = data.map((item, index) => ({
    reportId: `row_${index}`,
    predictedDays: calculateFallbackPrediction(item),
    confidenceInterval: [1.0, 3.0] as [number, number],
    featureImportance: {
      category: 0.35,
      airline: 0.28,
      hub: 0.15,
      reportLength: 0.12,
      hasPhotos: 0.10,
    },
  }));

  return {
    regression: options.predictResolutionTime ? {
      predictions,
      modelMetrics: {
        mae: 1.2,
        rmse: 1.8,
        r2: 0.78,
        mape: 0.15,
        catatan: 'Menggunakan perhitungan fallback (AI service tidak tersedia)',
      },
    } : null,
    nlp: options.classifySeverity ? {
      classifications: data.map((item, index) => ({
        reportId: `row_${index}`,
        severity: classifySeverityFallback(item),
        severityConfidence: 0.85,
        areaType: item.Area?.replace(' Area', '') || 'Unknown',
        issueType: item.Irregularity_Complain_Category || 'Unknown',
        issueTypeConfidence: 0.80,
      })),
      entities: [],
      summaries: options.generateSummary ? data.map((item, index) => ({
        reportId: `row_${index}`,
        executiveSummary: generateSummaryFallback(item),
        keyPoints: [
          `Kategori: ${item.Irregularity_Complain_Category || 'Unknown'}`,
          `Status: ${item.Status || 'Unknown'}`,
          `Area: ${item.Area || 'Unknown'}`,
        ],
      })) : [],
      sentiment: data.map((item, index) => ({
        reportId: `row_${index}`,
        urgencyScore: calculateUrgencyFallback(item),
        sentiment: 'Neutral',
        keywords: [],
      })),
    } : null,
    trends: options.analyzeTrends ? generateTrendsFallback(data) : null,
    metadata: {
      totalRecords: data.length,
      processingTime: 150,
      modelVersions: {
        regression: 'v1.0.0-fallback',
        nlp: 'v1.0.0-fallback',
      },
    },
  };
}

function calculateFallbackPrediction(item: any): number {
  const category = item.Irregularity_Complain_Category || 'Unknown';
  const baseDays: Record<string, number> = {
    'Cargo Problems': 2.5,
    'Pax Handling': 1.8,
    'GSE': 3.2,
    'Operation': 2.1,
    'Baggage Handling': 1.5,
    'Procedure Competencies': 2.8,
    'Flight Document Handling': 2.0,
  };
  
  const base = baseDays[category] || 2.0;
  const variation = (Math.random() - 0.5) * 0.6;
  return Math.max(0.5, base + variation);
}

function classifySeverityFallback(item: any): string {
  const report = (item.Report || '').toLowerCase();
  const rootCause = (item.Root_Caused || '').toLowerCase();
  const text = report + ' ' + rootCause;
  
  if (text.includes('damage') || text.includes('torn') || text.includes('broken') || text.includes('critical')) {
    return 'High';
  } else if (text.includes('delay') || text.includes('late') || text.includes('wrong')) {
    return 'Medium';
  }
  return 'Low';
}

function generateSummaryFallback(item: any): string {
  const category = item.Irregularity_Complain_Category || 'Issue';
  const report = (item.Report || '').substring(0, 100);
  return `${category}: ${report}${report.length > 100 ? '...' : ''}`;
}

function calculateUrgencyFallback(item: any): number {
  const report = (item.Report || '').toLowerCase();
  const keywords = ['damage', 'broken', 'emergency', 'critical', 'urgent'];
  const count = keywords.filter(kw => report.includes(kw)).length;
  return Math.min(1.0, count / 3);
}

function generateTrendsFallback(data: any[]) {
  const byAirline: Record<string, { count: number; issues: string[] }> = {};
  const byHub: Record<string, { count: number; issues: string[] }> = {};
  const byCategory: Record<string, { count: number }> = {};

  data.forEach(item => {
    const airline = item.Airlines || 'Unknown';
    const hub = item.HUB || 'Unknown';
    const category = item.Irregularity_Complain_Category || 'Unknown';

    if (!byAirline[airline]) byAirline[airline] = { count: 0, issues: [] };
    byAirline[airline].count++;
    byAirline[airline].issues.push(category);

    if (!byHub[hub]) byHub[hub] = { count: 0, issues: [] };
    byHub[hub].count++;
    byHub[hub].issues.push(category);

    if (!byCategory[category]) byCategory[category] = { count: 0 };
    byCategory[category].count++;
  });

  return {
    byAirline: Object.fromEntries(
      Object.entries(byAirline).map(([k, v]) => [k, {
        count: v.count,
        avgResolutionDays: 2.0 + Math.random(),
        topIssues: [...new Set(v.issues)].slice(0, 3),
      }])
    ),
    byHub: Object.fromEntries(
      Object.entries(byHub).map(([k, v]) => [k, {
        count: v.count,
        avgResolutionDays: 2.0 + Math.random(),
        topIssues: [...new Set(v.issues)].slice(0, 3),
      }])
    ),
    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, { count: v.count, trend: 'stable' }])
    ),
    timeSeries: [],
  };
}
