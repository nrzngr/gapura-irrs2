import { NextResponse } from 'next/server';
import { reportsService } from '@/lib/services/reports-service';

export async function GET() {
  try {
    const reports = await reportsService.getReports({ refresh: true });
    
    // Get unique branches
    const branchesArr = reports.map(r => r.branch).filter(Boolean);
    const branches = [...new Set(branchesArr)];
    
    // Get unique categories
    const catsArr = reports.map(r => r.main_category || r.category).filter(Boolean);
    const categories = [...new Set(catsArr)];
    
    // Sample data
    const sample = reports.slice(0, 3).map(r => ({
      id: r.id,
      branch: r.branch,
      reporting_branch: r.reporting_branch,
      station_code: r.station_code,
      category: r.main_category || r.category,
      created_at: r.created_at,
      date_of_event: r.date_of_event,
    }));
    
    return NextResponse.json({
      totalReports: reports.length,
      uniqueBranches: branches.length,
      branches: branches.slice(0, 20),
      uniqueCategories: categories.length,
      categories,
      sample,
    });
  } catch (err) {
    return NextResponse.json({ 
      error: 'Failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
