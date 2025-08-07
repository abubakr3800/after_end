/**
 * Classroom Lighting Simulator
 * External JavaScript file for CCT and CRI simulation with visual effects
 * 
 * This file contains all the functionality for:
 * - Loading and managing API data
 * - Canvas-based lighting effects simulation
 * - Visual effects (flicker, glare, color temperature)
 * - Comparison with recommendations
 * - Real-time slider updates
 */

// Global variables
let selectedGrade = '';
let selectedEnvironment = '';
let apiData = null;
let updateTimeout = null;
let currentImageIndex = 0; // Track current image index for cycling

// Canvas variables for lighting effects
let canvas = null;
let ctx = null;
let originalImageData = null;
let classroomImage = null;

/**
 * Utility Functions
 */

// Preloader Functions
function showPreloader(message = 'Loading Lighting Simulator...') {
    const preloader = document.getElementById('preloader');
    const preloaderText = document.querySelector('.preloader-text');
    
    console.log('showPreloader called with message:', message);
    console.log('Preloader element found:', !!preloader);
    
    if (preloader) {
        preloader.classList.remove('hidden');
        preloader.style.display = 'flex';
        preloader.style.opacity = '1';
        preloader.style.visibility = 'visible';
        
        if (preloaderText) {
            preloaderText.textContent = message;
            console.log('Preloader text updated:', message);
        }
        console.log('Preloader shown successfully');
    } else {
        console.error('Preloader element not found!');
    }
}

function hidePreloader() {
    const preloader = document.getElementById('preloader');
    
    console.log('hidePreloader called');
    console.log('Preloader element found:', !!preloader);
    
    if (preloader) {
        preloader.classList.add('hidden');
        console.log('Preloader hidden class added');
        
        // Remove preloader from DOM after transition completes
        setTimeout(() => {
            if (preloader.classList.contains('hidden')) {
                preloader.style.display = 'none';
                console.log('Preloader display set to none');
            }
        }, 1000);
    } else {
        console.error('Preloader element not found when trying to hide!');
    }
}

function updatePreloaderMessage(message) {
    const preloaderText = document.querySelector('.preloader-text');
    if (preloaderText) {
        preloaderText.textContent = message;
        console.log('Preloader message updated:', message);
    }
}

// Function to get cookie value
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Function to get unit for parameter
function getUnit(param) {
    const units = {
        'CCT': 'K',
        'CRI': '',
        'Flicker': 'HZ',
        'UGR': '',
        'Uniformity': '',
        'Melanopic_EDI': '',
        'Vertical_Illuminance': 'lux',
        'Exposure_Duration': 'hours',
        'Lux': 'lux'
    };
    return units[param] || '';
}

// Linear interpolation function
function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Clamp value to valid range (0-255 for pixel values)
function clamp(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Data Loading Functions
 */

// Function to load selected data from cookies
function loadSelectedData() {
    selectedGrade = getCookie('selectedGrade');
    selectedEnvironment = getCookie('selectedEnvironment');
    
    if (!selectedGrade || !selectedEnvironment) {
        alert('No selection data found. Please go back to the main page and make a selection.');
        window.location.href = 'index.html';
        return;
    }

    // Display selected data
    const displayDiv = document.getElementById('selectedDataDisplay');
    if (displayDiv) {
        displayDiv.innerHTML = `
            <div class="col-md-6">
                <p><strong class="text-warning">Grade:</strong> ${selectedGrade}</p>
            </div>
            <div class="col-md-6">
                <p><strong class="text-warning">Environment:</strong> ${selectedEnvironment}</p>
            </div>
        `;
    }

    // Load API data
    loadApiData();
}

// Function to load API data
async function loadApiData() {
    try {
        // Show preloader while loading data
        showPreloader('Loading API Data...');
        
        // Load only two data files: newData.json and lighting.json
        updatePreloaderMessage('Fetching lighting standards...');
        const [dataResponse, lightingResponse] = await Promise.all([
            fetch('api/newData.json'),
            fetch('api/lighting.json')
        ]);
        
        updatePreloaderMessage('Processing data...');
        const dataJson = await dataResponse.json();
        const lightingJson = await lightingResponse.json();
        
        console.log(dataJson , lightingJson);
        
        updatePreloaderMessage('Merging datasets...');
        // Merge the data for slider ranges and recommendations
        apiData = {};
        for (const grade in dataJson) {
            apiData[grade] = {
                ...dataJson[grade],
                lighting_data: lightingJson[grade] || {}
            };
        }
        
        updatePreloaderMessage('Initializing simulator...');
        // Set slider ranges based on API data for the selected grade
        setSliderRanges();
        
        updatePreloaderMessage('Setting up validation...');
        // Update validation status after loading data
        setTimeout(() => {
            updateValidationStatus();
        }, 2000);
        
        // // Update info cards with dynamic data
        updateInfoCards();
                

        compareValues(); // Compare values after loading data
        
        // Hide preloader after everything is loaded (3 seconds)
        setTimeout(() => {
            hidePreloader();
        }, 3000);
        
    } catch (error) {
        console.error('Failed to load API data:', error);
        updatePreloaderMessage('Error loading data. Please refresh the page.');
        setTimeout(() => {
            hidePreloader();
            alert('Failed to load lighting data. Please try again.');
        }, 1000);
    }
}

/**
 * Slider Management Functions
 */

// Function to set slider ranges based on API data
function setSliderRanges() {
    if (!apiData || !selectedGrade) return;
    
    const gradeData = apiData[selectedGrade];
    
    // Set fixed wide ranges for all parameters (not from API)
    // CCT: 2000K to 10000K (very wide range)
    const cctSlider = document.getElementById('cctSlider');
    cctSlider.min = 2000;
    cctSlider.max = 10000;
    cctSlider.value = 6500; // Default neutral value
    document.getElementById('cctValue').textContent = cctSlider.value;
    document.getElementById('cctRange').textContent = `Range: 2000 - 10000 K`;
    
    // CRI: 0 to 100 (full range)
    const criSlider = document.getElementById('criSlider');
    criSlider.min = 0;
    criSlider.max = 100;
    criSlider.value = 80; // Default good value
    document.getElementById('criValue').textContent = criSlider.value;
    document.getElementById('criRange').textContent = `Range: 0 - 100`;
    
    // Flicker: 0% to 100% (full range)
    const flickerSlider = document.getElementById('flickerSlider');
    flickerSlider.min = 100;
    flickerSlider.max = 10000;
    flickerSlider.value = 1250; // Default low value
    document.getElementById('flickerValue').textContent = ( flickerSlider.value );
    document.getElementById('flickerRange').textContent = `Range: 100 - 10000 HZ`;
    
    // UGR (Glare): 0 to 100 (wide range)
    const glareSlider = document.getElementById('glareSlider');
    glareSlider.min = 0;
    glareSlider.max = 100;
    glareSlider.value = 6; // Default low value
    document.getElementById('glareValue').textContent = glareSlider.value;
    document.getElementById('glareRange').textContent = `Range: 0 - 100`;
    
    // Uniformity: 0 to 1 (full range)
    // const uniformitySlider = document.getElementById('uniformitySlider');
    // uniformitySlider.min = 0;
    // uniformitySlider.max = 1;
    // uniformitySlider.step = 0.1;
    // uniformitySlider.value = 0.7; // Default good value
    // document.getElementById('uniformityValue').textContent = uniformitySlider.value;
    // document.getElementById('uniformityRange').textContent = `Range: 0 - 1`;
    
    // Melanopic EDI: 0 to 1000 (wide range)
    // const melanopicSlider = document.getElementById('melanopicSlider');
    // melanopicSlider.min = 0;
    // melanopicSlider.max = 1000;
    // melanopicSlider.value = 200; // Default moderate value
    // document.getElementById('melanopicValue').textContent = melanopicSlider.value;
    // document.getElementById('melanopicRange').textContent = `Range: 0 - 1000`;
    
    // Vertical Illuminance: 0 to 2000 lux (wide range)
    const verticalSlider = document.getElementById('verticalSlider');
    verticalSlider.min = 0;
    verticalSlider.max = 2000;
    verticalSlider.value = 300; // Default moderate value
    document.getElementById('verticalValue').textContent = verticalSlider.value;
    document.getElementById('verticalRange').textContent = `Range: 0 - 2000 lux`;
    
    // Exposure Duration: 0 to 24 hours (full day range)
    // const exposureSlider = document.getElementById('exposureSlider');
    // exposureSlider.min = 0;
    // exposureSlider.max = 24;
    // exposureSlider.value = 8; // Default school day value
    // document.getElementById('exposureValue').textContent = exposureSlider.value;
    // document.getElementById('exposureRange').textContent = `Range: 0 - 24 hours`;
    
    // Lux: 0 to 2000 lux (wide range)
    const luxSlider = document.getElementById('luxSlider');
    luxSlider.min = 0;
    luxSlider.max = 2000;
    luxSlider.value = 500; // Default moderate value
    document.getElementById('luxValue').textContent = luxSlider.value;
    document.getElementById('luxRange').textContent = `Range: 0 - 2000 lux`;
    
    // Initialize canvas after setting slider ranges (when API data is available)
    setTimeout(() => {
        // initializeCanvas();
    }, 100);
}

// Function to update slider values
function updateSliderValue(sliderId, valueId) {
    const slider = document.getElementById(sliderId);
    const valueSpan = document.getElementById(valueId);
    
    if (slider && valueSpan) {
        slider.addEventListener('input', function() {
            valueSpan.textContent = this.value;
            applyVisualEffects(); // Apply visual effects when slider changes
            updateValidationStatus(); // Update validation status when slider changes
        });
    }
}

// Function to update validation status for all sliders
function updateValidationStatus() {
    if (!apiData || !selectedGrade || !selectedEnvironment) {
        console.warn('No API data, selected grade, or environment available for validation');
        return;
    }
    
    const gradeData = apiData[selectedGrade];
    console.log('Grade data for validation:', selectedGrade, gradeData);
    
    if (!gradeData || !gradeData.lighting_data || !gradeData.lighting_data.recommendation_levels) {
        console.warn('No lighting data found for:', selectedGrade);
        return;
    }
    
    // Get current slider values
    const currentValues = {
        CCT: parseInt(document.getElementById('cctSlider')?.value || 6500),
        CRI: parseInt(document.getElementById('criSlider')?.value || 80),
        Flicker: (1 / parseFloat(document.getElementById('flickerSlider')?.value || 1)) * 10000, // Convert to percentage
        UGR: parseInt(document.getElementById('glareSlider')?.value || 6),
        Uniformity: parseFloat(document.getElementById('uniformitySlider')?.value || 0.8),
        Melanopic_EDI: parseInt(document.getElementById('melanopicSlider')?.value || 200),
        Vertical_Illuminance: parseInt(document.getElementById('verticalSlider')?.value || 300),
        Exposure_Duration: parseInt(document.getElementById('exposureSlider')?.value || 8),
        Lux: parseInt(document.getElementById('luxSlider')?.value || 500)
    };
    
    console.log('Current values for validation:', currentValues);
    
    // Extract parameter data from lighting.json structure for the selected environment
    const lightingData = gradeData.lighting_data;
    const recommendationLevels = lightingData.recommendation_levels;
    
    // Collect parameter data from all recommendation levels for the selected environment
    const parameterData = {};
    for (const level in recommendationLevels) {
        const levelData = recommendationLevels[level];
        const environments = levelData.environments || {};
        const envData = environments[selectedEnvironment];
        
        if (envData) {
            for (const param in envData) {
                if (param === 'range' || param === 'images') continue;
                
                const paramInfo = envData[param];
                if (paramInfo && paramInfo.range) {
                    if (!parameterData[param]) {
                        parameterData[param] = [];
                    }
                    // Convert lighting.json structure to match newData.json format
                    parameterData[param].push({
                        range: paramInfo.range,
                        rating: level === 'highly_recommended' ? 'good' : level === 'recommended' ? 'medium' : 'bad',
                        reason: paramInfo.reason || 'Standard lighting parameter',
                        recommendation: paramInfo.recommendation || ''
                    });
                }
            }
        }
    }
    
    console.log('Extracted parameter data:', parameterData);
    
    // Update validation for each parameter
    updateParameterValidation('CCT', currentValues.CCT, parameterData.CCT, 'cctStatus');
    updateParameterValidation('CRI', currentValues.CRI, parameterData.CRI, 'criStatus');
    updateParameterValidation('Flicker', currentValues.Flicker, parameterData.Flicker, 'flickerStatus');
    updateParameterValidation('UGR', currentValues.UGR, parameterData.UGR, 'glareStatus');
    updateParameterValidation('Uniformity', currentValues.Uniformity, parameterData.Uniformity, 'uniformityStatus');
    updateParameterValidation('Melanopic_EDI', currentValues.Melanopic_EDI, parameterData.Melanopic_EDI, 'melanopicStatus');
    updateParameterValidation('Vertical_Illuminance', currentValues.Vertical_Illuminance, parameterData.Vertical_Illuminance, 'verticalStatus');
    updateParameterValidation('Exposure_Duration', currentValues.Exposure_Duration, parameterData.Exposure_Duration, 'exposureStatus');
    updateParameterValidation('Lux', currentValues.Lux, parameterData.Lux, 'luxStatus');
}

// Function to update validation status for a specific parameter
function updateParameterValidation(paramName, currentValue, paramDataArray, statusElementId) {
    const statusElement = document.getElementById(statusElementId);
    if (!statusElement) {
        return;
    }
    
    if (!paramDataArray || !Array.isArray(paramDataArray) || paramDataArray.length === 0) {
        statusElement.textContent = 'No Data Available';
        statusElement.className = 'validation-status evaluating';
        return;
    }
    
    // Find which range the current value falls into
    let bestMatch = null;
    let bestRating = 'bad'; // Default to bad if no match
    
    // Check each parameter data entry from newData.json
    for (const paramData of paramDataArray) {
        if (paramData.range) {
            const { min, max } = paramData.range;
            
            // Check if current value falls within this range
            if (currentValue >= min && currentValue <= max) {
                // Use the rating directly from newData.json (good, medium, bad)
                const rating = paramData.rating.toLowerCase();
                
                // Keep the best rating found (good > medium > bad)
                if (getRatingPriority(rating) > getRatingPriority(bestRating)) {
                    bestRating = rating;
                    bestMatch = paramData;
                }
            }
        }
    }
    
    // If no exact match found, find the closest range and mark as bad
    if (!bestMatch && paramDataArray.length > 0) {
        let closestDistance = Infinity;
        for (const paramData of paramDataArray) {
            if (paramData.range) {
                const { min, max } = paramData.range;
                const distanceToMin = Math.abs(currentValue - min);
                const distanceToMax = Math.abs(currentValue - max);
                const minDistance = Math.min(distanceToMin, distanceToMax);
                
                if (minDistance < closestDistance) {
                    closestDistance = minDistance;
                    bestMatch = paramData;
                }
            }
        }
        bestRating = 'bad'; // Out of range is always bad
    }
    
    // Update the status element
    let statusText;
    if (bestMatch) {
        const reason = bestMatch.reason || 'Standard lighting parameter';
        if (bestRating === 'bad' && !paramDataArray.some(p => p.range && currentValue >= p.range.min && currentValue <= p.range.max)) {
            // Value is outside all ranges
            const { min, max } = bestMatch.range;
            statusText = `BAD - Outside recommended range (${min}-${max} ${getUnit(paramName)})`;
        } else {
            // Value is within a range
            statusText = `${bestRating.toUpperCase()} - ${reason}`;
        }
    } else {
        statusText = 'NO STANDARDS AVAILABLE';
    }
    
    statusElement.textContent = statusText;
    // statusElement.innerHTML = ( bestRating === 'bad' ? '' : '<i class="fa-solid fa-check"></i>' )+ statusText;
    statusElement.className = `validation-status ${bestRating}`;
}

// Function to get rating priority (higher is better)
function getRatingPriority(rating) {
    const priorities = {
        'good': 3,
        'medium': 2,
        'bad': 1
    };
    return priorities[rating.toLowerCase()] || 0;
}

/**
 * Canvas and Visual Effects Functions
 */

// Function to update the image counter display
function updateImageCounter() {
    const counterElement = document.getElementById('imageCounter');
    if (!counterElement) return;
    
    if (!apiData || !selectedGrade || !selectedEnvironment) {
        counterElement.textContent = 'Image 1';
        return;
    }
    
    const gradeData = apiData[selectedGrade];
    const lightingData = gradeData.lighting_data;
    
    if (!lightingData || !lightingData.recommendation_levels) {
        counterElement.textContent = 'Image 1';
        return;
    }
    
    const environments = lightingData.recommendation_levels.highly_recommended.environments;
    const selectedEnvData = environments[selectedEnvironment];
    
    if (!selectedEnvData || !selectedEnvData.images || !Array.isArray(selectedEnvData.images)) {
        counterElement.textContent = 'Image 1';
        return;
    }
    
    const totalImages = selectedEnvData.images.length;
    counterElement.textContent = `Image ${currentImageIndex + 1} of ${totalImages}`;
}

// Initialize canvas and load classroom image
function initializeCanvas(currentImageState = 0) {
    // Check for both possible container IDs
    let infoCardsContainer = document.getElementById('infoCards');
    if (!infoCardsContainer) {
        infoCardsContainer = document.getElementById('info-cards');
    }
    
    if (!infoCardsContainer) {
        console.log('Info cards container not found (checked both infoCards and info-cards)');
        return;
    }
    
    canvas = document.getElementById('lightingCanvas');
    if (!canvas) {
        console.warn('Canvas element not found');
        return;
    }
    
    ctx = canvas.getContext('2d');
    
    // Load classroom image
    classroomImage = new Image();
    classroomImage.onload = function() {
        // Set canvas size to match image
        canvas.width = classroomImage.width;
        canvas.height = classroomImage.height;
        
        // Draw original image
        ctx.drawImage(classroomImage, 0, 0);
        
        // Store original pixel data
        originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Apply initial lighting effects
        applyVisualEffects();
        
        // Update the image counter
        updateImageCounter();
    };
    classroomImage.onerror = function() {
        console.error('Failed to load classroom image');
        // Try to load a fallback image
        classroomImage.src = (currentImageState == 0 ? apiData[selectedGrade].lighting_data.recommendation_levels.highly_recommended.environments[selectedEnvironment].emotion.happyPerson : apiData[selectedGrade].lighting_data.recommendation_levels.highly_recommended.environments[selectedEnvironment].emotion.sadPerson );
    };
    
    // Use appropriate image based on environment and API data
    const imagePath = getClassroomImagePath(currentImageState);
    // classroomImage.src = imagePath;
    console.log(apiData[selectedGrade].lighting_data.recommendation_levels.highly_recommended.environments[selectedEnvironment].emotion.happyPerson);
    console.log(apiData[selectedGrade].lighting_data.recommendation_levels.highly_recommended.environments[selectedEnvironment].emotion.sadPerson);
    console.log(selectedGrade);
    console.log(selectedEnvironment);
    classroomImage.src = (currentImageState == 0 ? apiData[selectedGrade].lighting_data.recommendation_levels.highly_recommended.environments[selectedEnvironment].emotion.happyPerson : apiData[selectedGrade].lighting_data.recommendation_levels.highly_recommended.environments[selectedEnvironment].emotion.sadPerson );
}

// Function to get appropriate classroom image based on environment
function getClassroomImagePath(imageState = 0) {
    if (!apiData || !selectedGrade || !selectedEnvironment) {
        console.warn('No API data or selection data available, using default image');
        return 'assets/secondary.jpg'; // Default fallback
    }
    
    const gradeData = apiData[selectedGrade];
    const lightingData = gradeData.lighting_data;
    
    if (!lightingData || !lightingData.recommendation_levels) {
        console.warn('No lighting data available for grade:', selectedGrade);
        return 'assets/secondary.jpg'; // Default fallback
    }
    
    const recommendationLevels = lightingData.recommendation_levels;
    const highlyRecommended = recommendationLevels.highly_recommended;
    
    if (!highlyRecommended || !highlyRecommended.environments) {
        console.warn('No highly recommended environments found');
        return 'assets/secondary.jpg'; // Default fallback
    }
    
    const environments = highlyRecommended.environments;
    const selectedEnvData = environments[selectedEnvironment];
    
    if (!selectedEnvData || !selectedEnvData.images || !Array.isArray(selectedEnvData.images)) {
        console.warn('No images found for environment:', selectedEnvironment);
        return apiData[selectedGrade].lighting_data.recommendation_levels.highly_recommended.environments[selectedEnvironment].emotion.happyPerson; // Default fallback
    }
    
    // Get the image at the specified index (or random if no index specified)
    const images = selectedEnvData.images;
    let selectedImage;
    
    if (imageState >= 0 && imageState < images.length) {
        selectedImage = images[imageState];
    } else {
        // Fallback to random image
        const randomIndex = Math.floor(Math.random() * images.length);
        selectedImage = images[randomIndex];
    }
    
    console.log('Selected image for environment:', selectedEnvironment, 'Image:', selectedImage, 'Index:', imageState);
    return selectedImage;
}

// Function to cycle to the next image for the current environment
function cycleToNextImage() {
    if (!apiData || !selectedGrade || !selectedEnvironment) {
        console.warn('Cannot cycle images - no data available');
        return;
    }
    
    const gradeData = apiData[selectedGrade];
    const lightingData = gradeData.lighting_data;
    
    if (!lightingData || !lightingData.recommendation_levels) {
        console.warn('No lighting data available for cycling');
        return;
    }
    
    const environments = lightingData.recommendation_levels.highly_recommended.environments;
    const selectedEnvData = environments[selectedEnvironment];
    
    if (!selectedEnvData || !selectedEnvData.images || !Array.isArray(selectedEnvData.images)) {
        console.warn('No images available for cycling');
        return;
    }
    
    const images = selectedEnvData.images;
    currentImageState = (currentImageState + 1) % images.length;
    
    // Reload the image
    const newImagePath = getClassroomImagePath(currentImageState);
    if (classroomImage) {
        classroomImage.src = newImagePath;
    }
    
    // Update the counter display
    updateImageCounter();
    
    console.log('Cycled to image', currentImageIndex + 1, 'of', images.length);
}

// Function to cycle to the previous image for the current environment
function cycleToPreviousImage() {
    if (!apiData || !selectedGrade || !selectedEnvironment) {
        console.warn('Cannot cycle images - no data available');
        return;
    }
    
    const gradeData = apiData[selectedGrade];
    const lightingData = gradeData.lighting_data;
    
    if (!lightingData || !lightingData.recommendation_levels) {
        console.warn('No lighting data available for cycling');
        return;
    }
    
    const environments = lightingData.recommendation_levels.highly_recommended.environments;
    const selectedEnvData = environments[selectedEnvironment];
    
    if (!selectedEnvData || !selectedEnvData.images || !Array.isArray(selectedEnvData.images)) {
        console.warn('No images available for cycling');
        return;
    }
    
    const images = selectedEnvData.images;
    currentImageState = (currentImageState - 1 + images.length) % images.length;
    
    // Reload the image
    const newImagePath = getClassroomImagePath(currentImageState);
    if (classroomImage) {
        classroomImage.src = newImagePath;
    }
    
    // Update the counter display
    updateImageCounter();
    
    console.log('Cycled to image', currentImageIndex + 1, 'of', images.length);
}

// Function to apply visual effects to the classroom image
function applyVisualEffects() {
    if (!canvas || !ctx || !originalImageData) return;
    
    // Get current slider values
    const cct = parseInt(document.getElementById('cctSlider')?.value || 6500);
    const cri = parseInt(document.getElementById('criSlider')?.value || 80);
    const flicker = (1 / (parseInt(document.getElementById('flickerSlider')?.value || 1))) * 10000; // Convert to percentage
    const glare = parseInt(document.getElementById('glareSlider')?.value || 6);
    
    // Apply canvas-based lighting effects
    processImageWithLighting(cct, cri, glare, flicker);
    
    // Apply flicker animation if needed
    if (flicker > 8) {
        canvas.classList.add('flicker');
    } else {
        canvas.classList.remove('flicker');
    }
    
    // Apply blur effect for extreme conditions
    if (glare > 60 || flicker > 8) {
        canvas.classList.add('blurred');
    } else {
        canvas.classList.remove('blurred');
    }
}

// Process image with lighting effects
function processImageWithLighting(cct, cri, glare, flicker) {
    if (!originalImageData) return;
    
    // Create a copy of original image data
    const imageData = new ImageData(new Uint8ClampedArray(originalImageData.data), originalImageData.width, originalImageData.height);
    const data = imageData.data;
    
    // Calculate CCT color temperature effects using proper Kelvin scale
    const kelvin = cct;
    let redMultiplier = 1.0;
    let greenMultiplier = 1.0;
    let blueMultiplier = 1.0;
    
    // Apply color temperature based on Kelvin scale
    if (kelvin <= 2000) {
        // Very warm (candlelight) - strong red, weak blue
        redMultiplier = 1.8;
        greenMultiplier = 0.8;
        blueMultiplier = 0.4;
    } else if (kelvin <= 3000) {
        // Warm (incandescent) - red dominant
        redMultiplier = 1.6;
        greenMultiplier = 0.9;
        blueMultiplier = 0.5;
    } else if (kelvin <= 4000) {
        // Warm white - slight red tint
        redMultiplier = 1.3;
        greenMultiplier = 1.0;
        blueMultiplier = 0.7;
    } else if (kelvin <= 5000) {
        // Neutral white
        redMultiplier = 1.1;
        greenMultiplier = 1.0;
        blueMultiplier = 0.9;
    } else if (kelvin <= 6000) {
        // Cool white - slight blue tint
        redMultiplier = 0.9;
        greenMultiplier = 1.0;
        blueMultiplier = 1.1;
    } else if (kelvin <= 7000) {
        // Cool (daylight) - blue dominant
        redMultiplier = 0.7;
        greenMultiplier = 0.9;
        blueMultiplier = 1.3;
    } else {
        // Very cool (overcast sky) - strong blue
        redMultiplier = 0.5;
        greenMultiplier = 0.8;
        blueMultiplier = 1.6;
    }
    
    // Calculate glare brightness factor with dramatic increase above 19
    let brightnessMultiplier = 1.0;
    if (glare <= 19) {
        // Normal brightness for low glare
        brightnessMultiplier = 1.0 + (glare / 19) * 0.3; // 1.0 to 1.3
    } else {
        // Dramatic brightness increase above 19
        const highGlareFactor = (glare - 19) / 9; // 0-1 for range 19-28
        brightnessMultiplier = 1.3 + (highGlareFactor * 2.7); // 1.3 to 4.0 brightness
    }
    
    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];     // Red channel
        let g = data[i + 1]; // Green channel
        let b = data[i + 2]; // Blue channel
        
        // Apply CCT color temperature
        r = clamp(r * redMultiplier);
        g = clamp(g * greenMultiplier);
        b = clamp(b * blueMultiplier);
        
        // Apply glare brightness
        r = clamp(r * brightnessMultiplier);
        g = clamp(g * brightnessMultiplier);
        b = clamp(b * brightnessMultiplier);
        
        // Calculate CRI effects
        const criFactor = cri / 100; // Normalize CRI to 0-1
        const avg = (r + g + b) / 3; // Calculate average brightness
        
        // CRI simulation: lower CRI reduces color accuracy
        if (cri < 95) {
            r = lerp(r, avg, 1 - criFactor);
            g = lerp(g, avg, 1 - criFactor);
            b = lerp(b, avg, 1 - criFactor);
        }
        
        // Desaturate colors based on CRI
        r = lerp(r, avg, 0.5 * (1 - criFactor));
        g = lerp(g, avg, 0.5 * (1 - criFactor));
        b = lerp(b, avg, 0.5 * (1 - criFactor));
        
        // Store processed pixel values
        data[i] = clamp(r);
        data[i + 1] = clamp(g);
        data[i + 2] = clamp(b);
    }
    
    // Draw processed image back to canvas
    ctx.putImageData(imageData, 0, 0);
}

/**
 * Info Cards Functions
 */

// Function to update info cards based on selected age and environment
function updateInfoCards() {
    if (!apiData || !selectedGrade || !selectedEnvironment) {
        console.log('Cannot update info cards: missing data');
        return;
    }

    const gradeData = apiData[selectedGrade];
    const environmentData = gradeData?.lighting_data?.recommendation_levels?.highly_recommended?.environments?.[selectedEnvironment];
    
    if (!environmentData) {
        console.log('No environment data found for:', selectedGrade, selectedEnvironment);
        return;
    }

    // Check for both possible container IDs (infoCards for class.html, info-cards for New/classroom.html)
    // let infoCardsContainer = document.getElementById('infoCards');
    // if (!infoCardsContainer) {
    //     infoCardsContainer = document.getElementById('info-cards');
    // }
    let infoCardsContainer = document.getElementById('info-cards');
    
    if (!infoCardsContainer) {
        console.log('Info cards container not found (checked both infoCards and info-cards)');
        return;
    }

    // Define the parameters to display
    const parameters = [
        { key: 'CCT', name: 'CCT (Color Temperature)', description: 'Color temperature affects mood and concentration.' },
        { key: 'CRI', name: 'CRI (Color Rendering Index)', description: 'CRI measures how accurately colors are rendered.' },
        { key: 'Flicker', name: 'Flicker', description: 'Flicker can cause eye strain and headaches.' },
        { key: 'UGR', name: 'Glare (UGR)', description: 'Unified Glare Rating measures visual comfort.' },
        { key: 'Uniformity', name: 'Uniformity', description: 'Uniformity measures the consistency of lighting across a space.' },
        { key: 'Melanopic_EDI', name: 'Melanopic EDI', description: 'Melanopic Equivalent Daylight Illuminance affects circadian rhythms.' },
        { key: 'Vertical_Illuminance', name: 'Vertical Illuminance', description: 'Vertical illuminance improves face visibility and comfort.' },
        { key: 'Exposure_Duration', name: 'Exposure Duration', description: 'Exposure duration affects the cumulative impact of lighting on health.' },
        { key: 'Lux', name: 'Lux (Illuminance)', description: 'Lux measures the amount of light falling on a surface.' }
    ];

    // Generate HTML for info cards
    let cardsHTML = '';
    
    parameters.forEach(param => {
        const paramData = environmentData[param.key];
        if (paramData && paramData.range) {
            const { min, max, unit } = paramData.range;
            const { reason, recommendation } = paramData;
            
            // Use different HTML structure based on container type
            if (infoCardsContainer.id === 'info-cards') {
                // Structure for New/classroom.html
                cardsHTML += `
                    <div class="info-card">
                        <h5>${param.name}</h5>
                        <!-- <div class="range-info">
                            
                        </div> -->
                        <p>
                            <small class="text-warning">Range: ${min}-${max}${unit ? ' ' + unit : ''} : And the Value is ${param.value}</small> <br> 
                            ${param.description} - ${reason}
                            <!--<small class="text-info">${reason}</small><br>--> <br>
                            <small class="text-success">${recommendation}</small>
                        </p>
                        <!-- <div class="recommendation-info">
                            
                        </div> -->
                    </div>
                `;
            } else {
                // Structure for class.html (Bootstrap cards)
                cardsHTML += `
                            <div class="info-card">
                                <h5 class="text-danger">${param.name}</h5>
                                <div class="mb-2">
                                    <small class="text-warning">Range: ${min}-${max}${unit ? ' ' + unit : ''}</small>
                                </div>
                                <p class="text-light mb-2">${param.description}</p>
                                <div class="mt-2">
                                    <small class="text-info">${reason}</small>
                                </div>
                                <div class="mt-1">
                                    <small class="text-success">${recommendation}</small>
                                </div>
                            </div>
                `;
            }
        }
    });

    // Update the container
    infoCardsContainer.innerHTML = cardsHTML;
    console.log('Info cards updated for:', selectedGrade, selectedEnvironment);
}

/**
 * Comparison and Recommendation Functions
 */

// Function to compare values with API recommendations
function compareValues() {
    if (!apiData || !selectedGrade) {
        alert('Please wait for data to load or go back to make a selection.');
        return;
    }

    const gradeData = apiData[selectedGrade];

    const currentValues = {
        CCT: parseInt(document.getElementById('cctSlider').value),
        CRI: parseInt(document.getElementById('criSlider').value),
        Flicker: (1 / parseInt(document.getElementById('flickerSlider').value) ) * 10000, // Convert to percentage
        UGR: parseInt(document.getElementById('glareSlider').value),
        // Uniformity: parseFloat(document.getElementById('uniformitySlider').value),
        // Melanopic_EDI: parseInt(document.getElementById('melanopicSlider').value),
        Vertical_Illuminance: parseInt(document.getElementById('verticalSlider').value),
        // Exposure_Duration: parseInt(document.getElementById('exposureSlider').value),
        Lux: parseInt(document.getElementById('luxSlider').value)
    };

    // console.log('Current values:', currentValues);
    console.log('Current values:', currentValues, 'Grade data:', gradeData);
    

    // Update recommendation cards
    updateRecommendationCards(currentValues, gradeData);
    // comparisonCards(currentValues, gradeData);
}

// Function to update recommendation cards based on age comparisons
function updateRecommendationCards(currentValues, gradeData) {
    try {
        const recommendationCardsContainer = document.getElementById('recommendationCards');
        if (!recommendationCardsContainer) {
            console.error('Recommendation cards container not found');
            return;
        }
        
        let recommendationHTML = '';

        // Get lighting data for the selected grade
        const lightingData = gradeData.lighting_data;
        
        if (!lightingData || !lightingData.recommendation_levels) {
            // Create a general recommendation card if no specific data
            recommendationHTML = `
                <div class="col-12">
                    <div class="card bg-secondary bg-opacity-25 border-0 rounded-4">
                        <div class="card-body text-center">
                            <i class="fas fa-info-circle text-info fa-3x mb-3"></i>
                            <h5 class="text-info">No Age-Specific Recommendations Available</h5>
                            <p class="text-light">Please check the comparison results below for general parameter analysis.</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Process recommendation levels from lighting.json
            const recommendationLevels = lightingData.recommendation_levels;
            
            console.log('Recommendation levels:', recommendationLevels);
            
            // Process each recommendation level
            for (const level in recommendationLevels) {
                const levelData = recommendationLevels[level];
                const environments = levelData.environments || {};
                console.log(environments);
                
                console.log(`Processing level: ${level}`, levelData);
                
                // Process each environment
                for (const environment in environments) {
                    const envData = environments[environment];
                    
                    // if( envData.hasOwnKey() != getCookie("selectedEnvironment") ) continue; // Skip if no data for this environment

                    if (environment !== selectedEnvironment) continue; // Only process selected environment

                    console.log(`Processing environment: ${environment}`, envData);
                    
                    // Calculate overall recommendation score for this environment
                    let totalScore = 0;
                    let totalParams = 0;
                    let recommendations = [];
                    
                    for (const param in envData) {
                        if (param === 'range' || param === 'images') continue;
                        
                        const paramData = envData[param];
                        const currentValue = currentValues[param];
                        
                        console.log(`Checking param: ${param}, current value: ${currentValue}`, paramData);
                        if (currentValue !== undefined && paramData.range) {
                            param == "Flicker" ? console.log(`Flicker value: ${currentValue}`) : null;
                            const { min, max } = paramData.range;
                            console.log(`Parameter ${param} range: ${min} - ${max}`, paramData);
                            
                            if (currentValue >= min && currentValue <= max) {
                                console.log(currentValue);
                                // if (param == "Flicker") {
                                //     console.log(`Converting Flicker value from ${currentValue} to percentage`);
                                //     // min = min * 10000; // Convert to percentage
                                //     // max = max * 10000; // Convert to percentage
                                // }
                                totalScore += 1;
                                recommendations.push({
                                    param: param,
                                    status: 'Recommended',
                                    reason: paramData.reason,
                                    recommendation: paramData.recommendation
                                });
                            } else {
                                recommendations.push({
                                    param: param,
                                    status: 'Not Recommended',
                                    reason: `Value ${currentValue} ${getUnit(param)} is outside recommended range (${ param == "Flicker" ? ( 1 / max) * 10000 : min}-${ param == "Flicker" ? ( 1 /min) * 10000 : max} ${getUnit(param)})`,
                                    recommendation: paramData.recommendation
                                });
                            }
                            totalParams += 1;
                        }
                    }

                    // console.log(totalScore);
                    // console.log(totalParams);
                    
                    totalParams == totalScore ? initializeCanvas(0) : initializeCanvas(1);

                    // Calculate recommendation percentage
                    const recommendationPercentage = totalParams > 0 ? (totalScore / totalParams) * 100 : 0;
                    
                    // Determine overall recommendation status
                    let overallStatus, statusClass, statusIcon;
                    if (recommendationPercentage >= 80) {
                        overallStatus = 'Highly Recommended';
                        statusClass = 'success';
                        statusIcon = 'fas fa-star';
                    } else if (recommendationPercentage >= 60) {
                        overallStatus = 'Recommended';
                        statusClass = 'warning';
                        statusIcon = 'fas fa-check-circle';
                    } else {
                        overallStatus = 'Not Recommended';
                        statusClass = 'danger';
                        statusIcon = 'fas fa-exclamation-triangle';
                    }
                    
                    // Create recommendation card
                    recommendationHTML += `
                        <!--<div class="col-lg-12 col-xl-4 mb-4">-->
                        <div class="col-12">
                            <div class="card bg-secondary bg-opacity-25 border-0 rounded-4 h-100">
                                <div class="card-header bg-${statusClass} bg-opacity-25 border-0">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <h5 class="text-${statusClass} mb-0">
                                            <i class="${statusIcon} me-2"></i>
                                            ${environment.charAt(0).toUpperCase() + environment.slice(1)}
                                        </h5>
                                        <span class="badge bg-${statusClass}">${recommendationPercentage.toFixed(0)}%</span>
                                    </div>
                                </div>
                                <div class="card-body">
                                    <div class="mb-3">
                                        <h6 class="text-light">Overall Status: <span class="text-${statusClass}">${overallStatus}</span></h6>
                                        <div class="progress bg-dark">
                                            <div class="progress-bar bg-${statusClass}" role="progressbar" 
                                                 style="width: ${recommendationPercentage}%" 
                                                 aria-valuenow="${recommendationPercentage}" 
                                                 aria-valuemin="0" aria-valuemax="100">
                                                ${recommendationPercentage.toFixed(0)}%
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="recommendation-details">
                                        <h6 class="text-warning mb-2">Parameter Analysis:</h6>
                                        ${recommendations.map(rec => `
                                            <div class="mb-2 p-2 rounded ${rec.status === 'Recommended' ? 'bg-success bg-opacity-25' : 'bg-danger bg-opacity-25'}" style="word-wrap: break-word; overflow-wrap: break-word;">
                                                <strong class="text-light">${rec.param}:</strong> 
                                                <span class="text-${rec.status === 'Recommended' ? 'success' : 'danger'}">${rec.status}</span>
                                                <small class="d-block text-muted mt-1">${rec.reason}</small>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
        }
        
        // If no recommendation levels found, create a general recommendation card
        if (!recommendationHTML) {
            recommendationHTML = `
                <div class="col-12">
                    <div class="card bg-secondary bg-opacity-25 border-0 rounded-4">
                        <div class="card-body text-center">
                            <i class="fas fa-info-circle text-info fa-3x mb-3"></i>
                            <h5 class="text-info">No Age-Specific Recommendations Available</h5>
                            <p class="text-light">Please check the comparison results below for general parameter analysis.</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Clear the container and set new content
        recommendationCardsContainer.textContent = '';
        recommendationCardsContainer.innerHTML = recommendationHTML;
    } catch (error) {
        console.error('Error updating recommendation cards:', error);
        const recommendationCardsContainer = document.getElementById('recommendationCards');
        if (recommendationCardsContainer) {
            recommendationCardsContainer.textContent = '';
            recommendationCardsContainer.innerHTML = `
                <div class="col-12">
                    <div class="card bg-secondary bg-opacity-25 border-0 rounded-4">
                        <div class="card-body text-center">
                            <i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
                            <h5 class="text-warning">Error Loading Recommendations</h5>
                            <p class="text-light">There was an error loading the recommendation data. Please try refreshing the page.</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

/**
 * Initialization Function
 */

// Initialize when page loads
function initializeSimulator() {
    // Show preloader immediately when simulator starts
    showPreloader('Initializing Classroom Simulator...');
    
    loadSelectedData();
    // initializeCanvas(); // This will be called by setSliderRanges after API data is loaded
    
    // Set up slider event listeners
    updateSliderValue('cctSlider', 'cctValue');
    updateSliderValue('criSlider', 'criValue');
    updateSliderValue('flickerSlider', 'flickerValue');
    updateSliderValue('glareSlider', 'glareValue');
    updateSliderValue('uniformitySlider', 'uniformityValue');
    updateSliderValue('melanopicSlider', 'melanopicValue');
    updateSliderValue('verticalSlider', 'verticalValue');
    updateSliderValue('exposureSlider', 'exposureValue');
    updateSliderValue('luxSlider', 'luxValue');
    
    // Add event listeners to update recommendation cards and validation when sliders change
    const sliders = ['cctSlider', 'criSlider', 'flickerSlider', 'glareSlider', 'uniformitySlider', 'melanopicSlider', 'verticalSlider', 'exposureSlider', 'luxSlider'];
    sliders.forEach(sliderId => {
        const slider = document.getElementById(sliderId);
        if (slider) {
            slider.addEventListener('input', function() {
                if (apiData && selectedGrade) {
                    // Update validation status immediately for responsive feedback
                    updateValidationStatus();
                    
                    // Clear previous timeout to prevent multiple rapid updates
                    if (updateTimeout) {
                        clearTimeout(updateTimeout);
                    }
                    
                    // Debounce the recommendation cards update to prevent excessive re-rendering
                    updateTimeout = setTimeout(() => {
                        const currentValues = {
                            CCT: parseInt(document.getElementById('cctSlider').value),
                            CRI: parseInt(document.getElementById('criSlider').value),
                            Flicker: (1 / parseInt(document.getElementById('flickerSlider').value)) * 10000, // Convert to percentage
                            UGR: parseInt(document.getElementById('glareSlider').value),
                            // Uniformity: parseFloat(document.getElementById('uniformitySlider').value),
                            // Melanopic_EDI: parseInt(document.getElementById('melanopicSlider').value),
                            Vertical_Illuminance: parseInt(document.getElementById('verticalSlider').value),
                            // Exposure_Duration: parseInt(document.getElementById('exposureSlider').value),
                            Lux: parseInt(document.getElementById('luxSlider').value)
                        };
                        updateRecommendationCards(currentValues, apiData[selectedGrade]);
                    }, 300); // Wait 300ms after user stops moving slider
                }
            });
        }
    });
}

// Export functions for use in HTML
window.initializeSimulator = initializeSimulator;
window.compareValues = compareValues;
window.showPreloader = showPreloader;
window.hidePreloader = hidePreloader;
window.updatePreloaderMessage = updatePreloaderMessage;
// window.applyVisualEffects = applyVisualEffects;
// window.cycleToNextImage = cycleToNextImage;
// window.cycleToPreviousImage = cycleToPreviousImage; 