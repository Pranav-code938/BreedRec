// Global variables for Teachable Machine
const URL = "https://teachablemachine.withgoogle.com/models/7AHQ0KxaX/";
let model, webcam, labelContainer, maxPredictions;
let isWebcamRunning = false;

class CattleBreedScanner {
    constructor() {
        this.currentImage = null;
        this.isModelLoaded = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadModel();
        this.updateHistoryCount();
    }

    initializeElements() {
        // UI elements
        this.previewPlaceholder = document.getElementById('preview-placeholder');
        this.webcamContainer = document.getElementById('webcam-container');
        this.previewImage = document.getElementById('previewImage');
        this.captureCanvas = document.getElementById('captureCanvas');
        this.fileInput = document.getElementById('fileInput');

        // Button elements
        this.takePhotoBtn = document.getElementById('takePhotoBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.stopCameraBtn = document.getElementById('stopCameraBtn');
        this.historyBtn = document.getElementById('historyBtn');

        // Results elements
        this.resultsSection = document.getElementById('resultsSection');
        this.staticResultsSection = document.getElementById('staticResultsSection');
        this.breedName = document.getElementById('breedName');
        this.breedDescription = document.getElementById('breedDescription');
        this.confidenceText = document.getElementById('confidenceText');
        this.confidenceFill = document.getElementById('confidenceFill');
        
        // Other elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.toast = document.getElementById('toast');
        this.historyCount = document.getElementById('historyCount');
        
        labelContainer = document.getElementById('label-container');
        this.ctx = this.captureCanvas.getContext('2d');
    }

    bindEvents() {
        this.takePhotoBtn.addEventListener('click', () => this.startLiveDetection());
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.stopCameraBtn.addEventListener('click', () => this.stopLiveDetection());
        this.historyBtn.addEventListener('click', () => this.showHistory());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    async loadModel() {
        try {
            this.showLoading(true, 'Loading AI Model...', 'Setting up cattle breed recognition');
            
            const modelURL = URL + "model.json";
            const metadataURL = URL + "metadata.json";
            
            // Load the model and metadata
            model = await tmImage.load(modelURL, metadataURL);
            maxPredictions = model.getTotalClasses();
            
            this.isModelLoaded = true;
            this.showLoading(false);
            this.showToast('✅ AI model loaded successfully!');
            
            console.log('Model loaded with', maxPredictions, 'classes');
        } catch (error) {
            console.error('Error loading model:', error);
            this.showLoading(false);
            this.showToast('❌ Failed to load AI model');
        }
    }

    async startLiveDetection() {
        if (!this.isModelLoaded) {
            this.showToast('⏳ AI model not ready yet. Please wait...');
            return;
        }

        try {
            this.showLoading(true, 'Starting Camera...', 'Setting up live detection');
            
            // Setup webcam
            const flip = true; // whether to flip the webcam
            webcam = new tmImage.Webcam(300, 300, flip); // width, height, flip
            await webcam.setup(); // request access to the webcam
            await webcam.play();
            
            // Hide placeholder and show webcam
            this.previewPlaceholder.style.display = 'none';
            this.previewImage.style.display = 'none';
            this.staticResultsSection.style.display = 'none';
            
            // Append webcam to container
            this.webcamContainer.innerHTML = '';
            this.webcamContainer.appendChild(webcam.canvas);
            this.webcamContainer.style.display = 'block';
            
            // Setup prediction containers
            labelContainer.innerHTML = '';
            for (let i = 0; i < maxPredictions; i++) {
                const div = document.createElement("div");
                div.className = 'prediction-item';
                labelContainer.appendChild(div);
            }
            
            // Show results section and controls
            this.resultsSection.style.display = 'block';
            this.stopCameraBtn.style.display = 'block';
            
            isWebcamRunning = true;
            this.showLoading(false);
            this.showToast('📷 Live detection started!');
            
            // Start prediction loop
            this.loop();
            
        } catch (error) {
            console.error('Error starting camera:', error);
            this.showLoading(false);
            this.showToast('❌ Camera access denied. Please allow camera permission.');
        }
    }

    async loop() {
        if (isWebcamRunning && webcam) {
            webcam.update(); // update the webcam frame
            await this.predict();
            window.requestAnimationFrame(() => this.loop());
        }
    }

    async predict() {
        if (!model || !webcam) return;
        
        try {
            // Run prediction
            const prediction = await model.predict(webcam.canvas);
            
            // Sort predictions by probability
            const sortedPredictions = prediction.sort((a, b) => b.probability - a.probability);
            
            // Update UI with top 3 predictions
            for (let i = 0; i < Math.min(maxPredictions, 3); i++) {
                if (labelContainer.childNodes[i]) {
                    const confidence = Math.round(sortedPredictions[i].probability * 100);
                    const className = sortedPredictions[i].className;
                    
                    labelContainer.childNodes[i].innerHTML = `
                        <div class="prediction-content">
                            <div class="prediction-info">
                                <span class="breed-name">${className}</span>
                                <span class="confidence-percent">${confidence}%</span>
                            </div>
                            <div class="prediction-bar">
                                <div class="prediction-fill" style="width: ${confidence}%"></div>
                            </div>
                        </div>
                    `;
                }
            }
            
            // Save top prediction if confidence is high
            if (sortedPredictions[0].probability > 0.7) {
                const topPrediction = {
                    name: sortedPredictions[0].className,
                    confidence: Math.round(sortedPredictions[0].probability * 100),
                    description: this.getBreedDescription(sortedPredictions[0].className)
                };
                
                // Auto-save high confidence predictions
                this.autoSaveHighConfidencePrediction(topPrediction);
            }
            
        } catch (error) {
            console.error('Error during prediction:', error);
        }
    }

    stopLiveDetection() {
        isWebcamRunning = false;
        
        if (webcam) {
            webcam.stop();
            webcam = null;
        }
        
        // Reset UI
        this.webcamContainer.style.display = 'none';
        this.webcamContainer.innerHTML = '';
        this.resultsSection.style.display = 'none';
        this.stopCameraBtn.style.display = 'none';
        this.previewPlaceholder.style.display = 'flex';
        
        this.showToast('📷 Camera stopped');
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                this.showToast('❌ File too large. Please choose an image under 10MB');
                return;
            }

            // Stop live detection if running
            if (isWebcamRunning) {
                this.stopLiveDetection();
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.currentImage = e.target.result;
                this.showUploadedImage(e.target.result);
                this.showToast('📁 Image uploaded! Analyzing...');
                
                // Auto-analyze uploaded image
                setTimeout(() => this.analyzeStaticImage(), 500);
            };
            reader.readAsDataURL(file);
        } else {
            this.showToast('❌ Please select a valid image file');
        }
    }

    showUploadedImage(imageDataUrl) {
        this.previewImage.src = imageDataUrl;
        this.previewImage.style.display = 'block';
        this.previewPlaceholder.style.display = 'none';
        this.webcamContainer.style.display = 'none';
        this.resultsSection.style.display = 'none';
    }

    async analyzeStaticImage() {
        if (!this.currentImage || !model) {
            this.showToast('❌ No image to analyze or model not loaded');
            return;
        }

        try {
            this.showLoading(true, 'Analyzing Image...', 'Identifying cattle breed');
            
            // Create image element
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = this.currentImage;
            });

            // Make prediction
            const predictions = await model.predict(img);
            const sortedPredictions = predictions.sort((a, b) => b.probability - a.probability);
            const topPrediction = sortedPredictions[0];

            const result = {
                name: topPrediction.className,
                confidence: Math.round(topPrediction.probability * 100),
                description: this.getBreedDescription(topPrediction.className)
            };

            this.displayStaticResults(result);
            this.saveToHistory(this.currentImage, result);
            this.updateHistoryCount();
            
            this.showLoading(false);
            
        } catch (error) {
            console.error('Error during prediction:', error);
            this.showLoading(false);
            this.showToast('❌ Error analyzing image. Please try again.');
        }
    }

    displayStaticResults(result) {
        if (this.breedName) this.breedName.textContent = result.name;
        if (this.breedDescription) this.breedDescription.textContent = result.description;
        if (this.confidenceText) this.confidenceText.textContent = `${result.confidence}% Confident`;
        
        // Animate confidence bar
        if (this.confidenceFill) {
            setTimeout(() => {
                this.confidenceFill.style.width = `${result.confidence}%`;
            }, 100);
        }

        if (this.staticResultsSection) {
            this.staticResultsSection.style.display = 'block';
            this.staticResultsSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        this.showToast(`🎯 Identified: ${result.name} (${result.confidence}% confidence)`);
    }

    getBreedDescription(breedName) {
        const descriptions = {
            'Holstein': 'Large black and white dairy cattle breed known for high milk production',
            'Jersey': 'Small dairy cattle breed producing rich, creamy milk',
            'Angus': 'Black beef cattle breed known for high-quality marbled meat',
            'Hereford': 'Red and white beef cattle breed, hardy and adaptable',
            'Brahman': 'Heat-tolerant breed with distinctive hump, originated from India',
            'Charolais': 'Large white/cream colored beef cattle breed from France',
            'Simmental': 'Large red and white dual-purpose cattle breed',
            'Limousin': 'Golden-red beef cattle breed known for lean meat',
            'Shorthorn': 'Red, white, or roan colored dual-purpose cattle breed',
            'Gir': 'Indian dairy breed with distinctive curved horns',
            'Sahiwal': 'Heat-tolerant dairy breed from Pakistan/India region',
            'Red Sindhi': 'Red-colored dairy breed adapted to tropical climates',
            'Tharparkar': 'White/gray dual-purpose breed from India',
            'Kankrej': 'Large draught breed with distinctive lyre-shaped horns'
        };
        
        return descriptions[breedName] || 'Cattle breed identification';
    }

    autoSaveHighConfidencePrediction(result) {
        // Only save if we haven't saved this breed recently (prevent spam)
        const history = JSON.parse(localStorage.getItem('cattleHistory') || '[]');
        const recentSimilar = history.find(item => 
            item.breed === result.name && 
            (Date.now() - new Date(item.timestamp).getTime()) < 30000 // 30 seconds
        );
        
        if (!recentSimilar && webcam) {
            // Capture current frame for history
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = webcam.canvas.width;
            canvas.height = webcam.canvas.height;
            ctx.drawImage(webcam.canvas, 0, 0);
            const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            
            this.saveToHistory(imageDataUrl, result);
            this.updateHistoryCount();
        }
    }

    saveToHistory(imageDataUrl, result) {
        const historyItem = {
            id: Date.now(),
            image: imageDataUrl,
            breed: result.name,
            confidence: result.confidence,
            timestamp: new Date().toISOString()
        };

        let history = JSON.parse(localStorage.getItem('cattleHistory') || '[]');
        history.unshift(historyItem);
        
        // Keep only last 20 items
        history = history.slice(0, 20);
        
        localStorage.setItem('cattleHistory', JSON.stringify(history));
    }

    showHistory() {
        const history = JSON.parse(localStorage.getItem('cattleHistory') || '[]');
        
        if (history.length === 0) {
            this.showToast('📝 No scan history found');
            return;
        }

        // Simple history display
        console.log('History:', history);
        this.showToast(`📋 You have ${history.length} items in history`);
    }

    updateHistoryCount() {
        const history = JSON.parse(localStorage.getItem('cattleHistory') || '[]');
        if (this.historyCount) {
            this.historyCount.textContent = history.length;
            this.historyCount.style.display = history.length > 0 ? 'flex' : 'none';
        }
    }

    showLoading(show, title = 'Loading...', subtitle = 'Please wait') {
        if (this.loadingOverlay) {
            if (show) {
                this.loadingOverlay.querySelector('h3').textContent = title;
                this.loadingOverlay.querySelector('p').textContent = subtitle;
                this.loadingOverlay.style.display = 'flex';
            } else {
                this.loadingOverlay.style.display = 'none';
            }
        }
    }

    showToast(message) {
        if (this.toast) {
            this.toast.textContent = message;
            this.toast.classList.add('show');
            
            setTimeout(() => {
                this.toast.classList.remove('show');
            }, 4000);
        }
        console.log('Toast:', message);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Cattle Breed Scanner...');
    window.cattleScanner = new CattleBreedScanner();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && isWebcamRunning) {
        window.cattleScanner.stopLiveDetection();
    }
});
