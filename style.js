class CattleBreedScanner {
    constructor() {
        this.model = null;
        this.modelUrl = 'https://teachablemachine.withgoogle.com/models/7AHQ0KxaX/';
        this.isModelLoaded = false;
        this.currentImage = null;
        this.stream = null;
        this.facingMode = 'environment';
        
        this.initializeElements();
        this.bindEvents();
        this.loadModel();
        this.updateHistoryCount();
    }

    initializeElements() {
        // Camera elements
        this.cameraPreview = document.getElementById('cameraPreview');
        this.previewImage = document.getElementById('previewImage');
        this.cameraStream = document.getElementById('cameraStream');
        this.captureCanvas = document.getElementById('captureCanvas');
        this.fileInput = document.getElementById('fileInput');
        this.cameraControls = document.getElementById('cameraControls');

        // Button elements
        this.takePhotoBtn = document.getElementById('takePhotoBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.captureBtn = document.getElementById('captureBtn');
        this.switchCameraBtn = document.getElementById('switchCameraBtn');
        this.closeCameraBtn = document.getElementById('closeCameraBtn');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.historyBtn = document.getElementById('historyBtn');

        // UI elements
        this.resultsSection = document.getElementById('resultsSection');
        this.breedResult = document.getElementById('breedResult');
        this.breedName = document.getElementById('breedName');
        this.breedDescription = document.getElementById('breedDescription');
        this.confidenceText = document.getElementById('confidenceText');
        this.confidenceFill = document.getElementById('confidenceFill');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.toast = document.getElementById('toast');
        this.historyCount = document.getElementById('historyCount');
        
        this.ctx = this.captureCanvas.getContext('2d');
    }

    bindEvents() {
        this.takePhotoBtn.addEventListener('click', () => this.startCamera());
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        
        if (this.captureBtn) {
            this.captureBtn.addEventListener('click', () => this.capturePhoto());
        }
        if (this.switchCameraBtn) {
            this.switchCameraBtn.addEventListener('click', () => this.switchCamera());
        }
        if (this.closeCameraBtn) {
            this.closeCameraBtn.addEventListener('click', () => this.stopCamera());
        }
        
        this.analyzeBtn.addEventListener('click', () => this.analyzeImage());
        this.historyBtn.addEventListener('click', () => this.showHistory());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    async loadModel() {
        try {
            this.showToast('🤖 Loading AI model...');
            
            // Load Teachable Machine model
            const modelURL = this.modelUrl + 'model.json';
            const metadataURL = this.modelUrl + 'metadata.json';
            
            this.model = await tmImage.load(modelURL, metadataURL);
            this.isModelLoaded = true;
            this.showToast('✅ AI model loaded successfully!');
            
            console.log('Model loaded successfully');
        } catch (error) {
            console.error('Error loading model:', error);
            this.showToast('❌ Failed to load AI model');
        }
    }

    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: this.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            
            this.cameraStream.srcObject = this.stream;
            this.showCameraView();
            this.showToast('📷 Camera ready - Point at cattle');
        } catch (error) {
            console.error('Camera access denied:', error);
            this.showToast('❌ Camera access denied. Please allow camera permission.');
        }
    }

    showCameraView() {
        const placeholder = document.querySelector('.preview-placeholder');
        if (placeholder) placeholder.style.display = 'none';
        
        if (this.previewImage) this.previewImage.style.display = 'none';
        if (this.cameraStream) this.cameraStream.style.display = 'block';
        if (this.cameraControls) this.cameraControls.style.display = 'flex';
        if (this.analyzeBtn) this.analyzeBtn.style.display = 'none';
        if (this.resultsSection) this.resultsSection.style.display = 'none';
    }

    async switchCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        this.stopCamera();
        await this.startCamera();
    }

    capturePhoto() {
        if (!this.cameraStream) return;
        
        const video = this.cameraStream;
        this.captureCanvas.width = video.videoWidth;
        this.captureCanvas.height = video.videoHeight;
        
        this.ctx.drawImage(video, 0, 0);
        const imageDataUrl = this.captureCanvas.toDataURL('image/jpeg', 0.8);
        
        this.currentImage = imageDataUrl;
        this.showCapturedImage(imageDataUrl);
        this.stopCamera();
        this.showToast('📸 Photo captured! Click Analyze to identify breed.');
        
        // Auto-analyze after capture
        setTimeout(() => this.analyzeImage(), 500);
    }

    showCapturedImage(imageDataUrl) {
        if (this.previewImage) {
            this.previewImage.src = imageDataUrl;
            this.previewImage.style.display = 'block';
        }
        
        if (this.cameraStream) this.cameraStream.style.display = 'none';
        if (this.cameraControls) this.cameraControls.style.display = 'none';
        
        const placeholder = document.querySelector('.preview-placeholder');
        if (placeholder) placeholder.style.display = 'none';
        
        if (this.analyzeBtn) this.analyzeBtn.style.display = 'block';
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.cameraStream) this.cameraStream.style.display = 'none';
        if (this.cameraControls) this.cameraControls.style.display = 'none';
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                this.showToast('❌ File too large. Please choose an image under 10MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.currentImage = e.target.result;
                this.showCapturedImage(e.target.result);
                this.showToast('📁 Image uploaded successfully!');
                
                // Auto-analyze after upload
                setTimeout(() => this.analyzeImage(), 500);
            };
            reader.readAsDataURL(file);
        } else {
            this.showToast('❌ Please select a valid image file');
        }
    }

    async analyzeImage() {
        if (!this.currentImage) {
            this.showToast('❌ No image to analyze');
            return;
        }

        if (!this.isModelLoaded) {
            this.showToast('⏳ AI model not ready yet. Please wait...');
            return;
        }

        this.showLoading(true);
        
        try {
            // Create image element
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = this.currentImage;
            });

            console.log('Image loaded, making prediction...');

            // Make prediction using Teachable Machine model
            const predictions = await this.model.predict(img);
            console.log('Predictions:', predictions);
            
            // Find the highest confidence prediction
            let topPrediction = predictions[0];
            for (let i = 1; i < predictions.length; i++) {
                if (predictions[i].probability > topPrediction.probability) {
                    topPrediction = predictions[i];
                }
            }

            const result = {
                name: topPrediction.className,
                confidence: Math.round(topPrediction.probability * 100),
                description: this.getBreedDescription(topPrediction.className),
                allPredictions: predictions.map(p => ({
                    name: p.className,
                    confidence: Math.round(p.probability * 100)
                })).sort((a, b) => b.confidence - a.confidence)
            };

            this.displayResults(result);
            this.saveToHistory(this.currentImage, result);
            this.updateHistoryCount();
            
        } catch (error) {
            console.error('Error during prediction:', error);
            this.showToast('❌ Error analyzing image. Please try again.');
        } finally {
            this.showLoading(false);
        }
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

    displayResults(result) {
        console.log('Displaying results:', result);
        
        if (this.breedName) this.breedName.textContent = result.name;
        if (this.breedDescription) this.breedDescription.textContent = result.description;
        if (this.confidenceText) this.confidenceText.textContent = `${result.confidence}% Confident`;
        
        // Animate confidence bar
        if (this.confidenceFill) {
            setTimeout(() => {
                this.confidenceFill.style.width = `${result.confidence}%`;
            }, 100);
        }

        // Show top 3 predictions in console for debugging
        console.log('Top predictions:', result.allPredictions.slice(0, 3));

        if (this.resultsSection) {
            this.resultsSection.style.display = 'block';
            this.resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
        
        this.showToast(`🎯 Identified: ${result.name} (${result.confidence}% confidence)`);
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

        // Simple history display in console for now
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

    showLoading(show) {
        if (this.loadingOverlay) {
            this.loadingOverlay.style.display = show ? 'flex' : 'none';
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

    resetToInitialState() {
        const placeholder = document.querySelector('.preview-placeholder');
        if (placeholder) placeholder.style.display = 'flex';
        
        if (this.previewImage) this.previewImage.style.display = 'none';
        if (this.cameraStream) this.cameraStream.style.display = 'none';
        if (this.cameraControls) this.cameraControls.style.display = 'none';
        if (this.analyzeBtn) this.analyzeBtn.style.display = 'none';
        if (this.resultsSection) this.resultsSection.style.display = 'none';
        
        this.currentImage = null;
        this.fileInput.value = '';
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Cattle Breed Scanner...');
    window.cattleScanner = new CattleBreedScanner();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.cattleScanner) {
        window.cattleScanner.stopCamera();
    }
});

// Add touch feedback for buttons
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('button, .action-btn').forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            btn.style.transform = 'scale(0.95)';
        });
        
        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            setTimeout(() => {
                btn.style.transform = '';
            }, 100);
        });

        btn.addEventListener('click', (e) => {
            // Add visual feedback for click
            btn.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btn.style.transform = '';
            }, 100);
        });
    });
});
