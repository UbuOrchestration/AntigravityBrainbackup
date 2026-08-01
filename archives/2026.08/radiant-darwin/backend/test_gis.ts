import gis from 'g-i-s';

gis('Camco Heavy Duty RV Leveling Blocks', logResults);

function logResults(error: any, results: any) {
  if (error) {
    console.log('Error:', error);
  }
  else {
    console.log('Results:', JSON.stringify(results.slice(0, 4), null, 2));
  }
}
