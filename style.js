class CattleBreedScanner {
    constructor() {
        this.model = null;
        this.modelUrl = 'YOUR_TENSORFLOW_MODEL_URL_HERE'; // Replace with your model URL
        this.isModelLoaded = false;
        this.currentImage = null;
        this.stream = null;
        this.facingMode = 'environment';
        
        this.initializeElements();
        this.bindEvents();
        this.loadHistory();
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
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.switchCameraBtn.addEventListener('click', () => this.switchCamera());
        this.closeCameraBtn.addEventListener('click', () => this.stopCamera());
        this.analyzeBtn.addEventListener('click', () => this.analyzeImage());
        this.historyBtn.addEventListener('click', () => this.showHistory());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    async loadModel() {
        try {
            if (this.modelUrl === 'YOUR_TENSORFLOW_MODEL_URL_HERE') {
                this.showToast('⚠️ Please configure your TensorFlow.js model URL');
                return;
            }
            
            this.showToast('🤖 Loading AI model...');
            this.model = await tf.loadLayersModel(this.modelUrl);
            this.isModelLoaded = true;
            this.showToast('✅ AI model loaded successfully!');
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
            this.showToast('📷 Camera ready');
        } catch (error) {
            console.error('Camera access denied:', error);
            this.showToast('❌ Camera access denied');
        }
    }

    showCameraView() {
        document.querySelector('.preview-placeholder').style.display = 'none';
        this.previewImage.style.display = 'none';
        this.cameraStream.style.display = 'block';
        this.cameraControls.style.display = 'flex';
        this.analyzeBtn.style.display = 'none';
    }

    async switchCamera() {
        this.facingMode = this.facingMode === 'environment' ? 'user' : 'environment';
        this.stopCamera();
        await this.startCamera();
    }

    capturePhoto() {
        const video = this.cameraStream;
        this.captureCanvas.width = video.videoWidth;
        this.captureCanvas.height = video.videoHeight;
        
        this.ctx.drawImage(video, 0, 0);
        const imageDataUrl = this.captureCanvas.toDataURL('image/jpeg', 0.8);
        
        this.currentImage = imageDataUrl;
        this.showCapturedImage(imageDataUrl);
        this.stopCamera();
        this.showToast('📸 Photo captured!');
    }

    showCapturedImage(imageDataUrl) {
        this.previewImage.src = imageDataUrl;
        this.previewImage.style.display = 'block';
        this.cameraStream.style.display = 'none';
        this.cameraControls.style.display = 'none';
        document.querySelector('.preview-placeholder').style.display = 'none';
        this.analyzeBtn.style.display = 'block';
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.cameraStream.style.display = 'none';
        this.cameraControls.style.display = 'none';
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.showToast('❌ File too large. Please choose an image under 5MB');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                this.currentImage = e.target.result;
                this.showCapturedImage(e.target.result);
                this.showToast('📁 Image uploaded successfully!');
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
            this.showToast('⏳ AI model not ready yet');
            return;
        }

        this.showLoading(true);
        
        try {
            // Simulate processing time for better UX
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Mock prediction results (replace with actual model inference)
            const mockResults = this.getMockPrediction();
            
            this.displayResults(mockResults);
            this.saveToHistory(this.currentImage, mockResults);
            this.updateHistoryCount();
            
        } catch (error) {
            console.error('Error during prediction:', error);
            this.showToast('❌ Error analyzing image');
        } finally {
            this.showLoading(false);
        }
    }

    getMockPrediction() {
        const breeds = [
            { name: 'Holstein Friesian', description: 'Large dairy cattle breed', confidence: 87 },
            { name: 'Jersey', description: 'Small dairy cattle breed', confidence: 12 },
            { name: 'Angus', description: 'Beef cattle breed', confidence: 1 }
        ];
        
        return breeds[Math.floor(Math.random() * breeds.length)];
    }

    displayResults(result) {
        this.breedName.textContent = result.name;
        this.breedDescription.textContent = result.description;
        this.confidenceText.textContent = `${result.confidence}% Confident`;
        
        // Animate confidence bar
        setTimeout(() => {
            this.confidenceFill.style.width = `${result.confidence}%`;
        }, 100);

        this.resultsSection.style.display = 'block';
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
        
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

        // Create history modal (simplified - you might want a full modal component)
        let historyHtml = '<div style="max-height: 300px; overflow-y: auto;">';
        history.forEach(item => {
            const date = new Date(item.timestamp).toLocaleDateString();
            historyHtml += `
                <div style="display: flex; align-items: center; gap: 12px; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <img src="${item.image}" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${item.breed}</div>
                        <div style="font-size: 0.875rem; opacity: 0.7;">${item.confidence}% • ${date}</div>
                    </div>
                </div>
            `;
        });
        historyHtml += '</div>';
        
        // For now, just show a toast with count
        this.showToast(`📋 You have ${history.length} items in history`);
    }

    updateHistoryCount() {
        const history = JSON.parse(localStorage.getItem('cattleHistory') || '[]');
        this.historyCount.textContent = history.length;
        this.historyCount.style.display = history.length > 0 ? 'flex' : 'none';
    }

    showLoading(show) {
        this.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    showToast(message) {
        this.toast.textContent = message;
        this.toast.classList.add('show');
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }

    resetToInitialState() {
        document.querySelector('.preview-placeholder').style.display = 'flex';
        this.previewImage.style.display = 'none';
        this.cameraStream.style.display = 'none';
        this.cameraControls.style.display = 'none';
        this.analyzeBtn.style.display = 'none';
        this.resultsSection.style.display = 'none';
        this.currentImage = null;
        this.fileInput.value = '';
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.cattleScanner = new CattleBreedScanner();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.cattleScanner) {
        window.cattleScanner.stopCamera();
    }
});

// Add some interactive effects
document.addEventListener('DOMContentLoaded', () => {
    // Add touch feedback for buttons
    document.querySelectorAll('button, .action-btn').forEach(btn => {
        btn.addEventListener('touchstart', () => {
            btn.style.transform = 'scale(0.95)';
        });
        
        btn.addEventListener('touchend', () => {
            setTimeout(() => {
                btn.style.transform = '';
            }, 100);
        });
    });
});
