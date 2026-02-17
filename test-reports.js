const { reportsService } = require('./lib/services/reports-service');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

async function testFetchReports() {
    console.log('Testing getReports...');
    try {
        const reports = await reportsService.getReports({ refresh: true });
        console.log('Success! Reports found:', reports.length);
        if (reports.length > 0) {
            console.log('Sample report:', JSON.stringify(reports[0], null, 2));
        }
    } catch (error) {
        console.error('Error fetching reports:', error);
    }
}

testFetchReports();
