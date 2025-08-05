function comparisonCards(currentValues, gradeData){

    let comparisonHTML = '<div class="row g-3">';
    
    // Compare each parameter that exists in the API data
    for (let param in gradeData) {
        if (param === 'age_range' || param === 'lighting_data') continue;
        
        const currentValue = currentValues[param];
        const recommendations = gradeData[param];
        
        console.log(`Comparing ${param}: Current Value = ${currentValue}, Recommendations =`, recommendations);

        // console.log( gradeData );
        

        // Skip if recommendations is not an array
        if (!Array.isArray(recommendations)) {
            console.warn(`Skipping ${param} - recommendations is not an array:`, recommendations);
            continue;
        }
        
        comparisonHTML += `
            <div class="col-md-6 col-lg-4">
                <div class="card bg-secondary bg-opacity-25 border-0 rounded-3 h-100">
                    <div class="card-body" style="word-wrap: break-word; overflow-wrap: break-word;">
                        <h5 class="text-info mb-3">${param}</h5>
                        <p><strong class="text-warning">Current Value:</strong> ${currentValue} ${getUnit(param)}</p>
        `;

        let bestMatch = null;
        let bestRating = 'unknown';

        // Find the best matching recommendation from API data
        if (Array.isArray(recommendations)) {
            recommendations.forEach((rec, index) => {
                const min = rec.range.min;
                const max = rec.range.max;
                
                if (currentValue >= min && currentValue <= max) {
                    bestMatch = rec;
                    bestRating = rec.rating;
                }
            });
        } else {
            console.warn(`Recommendations for ${param} is not an array:`, recommendations);
        }

        if (bestMatch) {
            comparisonHTML += `
                <div class="alert ${bestRating === 'good' ? 'alert-success' : 'alert-danger'} mt-2" style="word-wrap: break-word; overflow-wrap: break-word;">
                    <strong>Rating:</strong> ${bestRating.toUpperCase()}<br>
                    <strong>Reason:</strong> ${bestMatch.reason}<br>
                    <strong>Recommendation:</strong> ${bestMatch.recommendation}<br>
                    <strong>Recommended Range:</strong> ${bestMatch.range.min} - ${bestMatch.range.max} ${getUnit(param)}
                </div>
            `;
        } else {
            // Find the closest recommendation range
            let closestRange = null;
            let minDistance = Infinity;
            
            if (Array.isArray(recommendations)) {
                recommendations.forEach((rec) => {
                    const rangeMid = (rec.range.min + rec.range.max) / 2;
                    const distance = Math.abs(currentValue - rangeMid);
                    if (distance < minDistance) {
                        minDistance = distance;
                        closestRange = rec;
                    }
                });
            }
            
            if (closestRange) {
                comparisonHTML += `
                    <div class="alert alert-warning mt-2" style="word-wrap: break-word; overflow-wrap: break-word;">
                        <strong>Rating:</strong> OUTSIDE RECOMMENDED RANGE<br>
                        <strong>Note:</strong> Your value (${currentValue} ${getUnit(param)}) is outside the recommended range (${closestRange.range.min}-${closestRange.range.max} ${getUnit(param)})<br>
                        <strong>Closest Recommendation:</strong> ${closestRange.recommendation}
                    </div>
                `;
            } else {
                comparisonHTML += `
                    <div class="alert alert-warning mt-2" style="word-wrap: break-word; overflow-wrap: break-word;">
                        <strong>Rating:</strong> UNKNOWN<br>
                        <strong>Note:</strong> No specific recommendations available for this parameter.
                    </div>
                `;
            }
        }

        comparisonHTML += `
                    </div>
                </div>
            </div>
        `;
    }

    comparisonHTML += '</div>';
    
    const comparisonContent = document.getElementById('comparisonContent');
    const comparisonResults = document.getElementById('comparisonResults');
    
    if (comparisonContent) {
        comparisonContent.innerHTML = comparisonHTML;
    }
    if (comparisonResults) {
        comparisonResults.style.display = 'block';
    }
    
}