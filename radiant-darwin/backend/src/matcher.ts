export interface MatchResult {
    isMatch: boolean;
    brandMatch: boolean;
    missingKeywords: string[];
    score: number;
    reason?: string;
}

export function evaluateTitleMatch(ourTitle: string, supplierTitle: string): MatchResult {
    const ourLower = ourTitle.toLowerCase();
    const supplierLower = supplierTitle.toLowerCase();

    // Extract brand (first word or known brand list)
    const knownBrands = ['camco', 'valterra', 'dometic', 'lippert', 'bougerv', 'eaz-lift', 'curt', 'progressive industries', 'stromberg carlson', 'aroma'];
    let brand = '';
    for (const b of knownBrands) {
        if (ourLower.includes(b)) {
            brand = b;
            break;
        }
    }
    if (!brand) {
        brand = ourLower.split(' ')[0];
    }

    const brandMatch = supplierLower.includes(brand);

    // Differentiating feature keywords that MUST match if present in our title
    const criticalKeywords = [
        'curved', 'surgeminder', '15ft', '20ft', '25ft', '30ft', '30amp', '50amp', '15amp',
        'dual', 'single', '10-pack', '4-pack', '2-pack', 'dropins', 'screen', 'elbow',
        'regulator', 'extension', 'adapter', 'dogbone', 'wheel chock', 'leveler', 'grommets'
    ];

    const missingKeywords: string[] = [];
    let matchedKeywords = 0;
    let totalTargetKeywords = 0;

    for (const kw of criticalKeywords) {
        if (ourLower.includes(kw)) {
            totalTargetKeywords++;
            if (!supplierLower.includes(kw)) {
                missingKeywords.push(kw);
            } else {
                matchedKeywords++;
            }
        }
    }

    const keywordMatchRatio = totalTargetKeywords > 0 ? (matchedKeywords / totalTargetKeywords) : 1.0;
    const score = (brandMatch ? 50 : 0) + (keywordMatchRatio * 50);

    const isMatch = brandMatch && missingKeywords.length === 0;

    return {
        isMatch,
        brandMatch,
        missingKeywords,
        score,
        reason: isMatch 
            ? 'Full brand and critical attribute match' 
            : `Mismatch: BrandMatch=${brandMatch}, Missing required keywords: [${missingKeywords.join(', ')}]`
    };
}
