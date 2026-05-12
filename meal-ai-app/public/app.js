// DOM Elements
const uploadSection = document.getElementById('uploadSection');
const previewSection = document.getElementById('previewSection');
const resultSection = document.getElementById('resultSection');
const loadingOverlay = document.getElementById('loadingOverlay');

const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const reselectBtn = document.getElementById('reselectBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const saveBtn = document.getElementById('saveBtn');
const discardBtn = document.getElementById('discardBtn');

const historyList = document.getElementById('historyList');
const totalCalEl = document.getElementById('totalCal');

// Current State
let currentImageSrc = null; // Base64 data URL
let currentImageMimeType = null;
let currentResult = null;
let historyData = [];

// Initialize App
function init() {
    loadHistory();
    setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
    imageInput.addEventListener('change', handleImageUpload);
    reselectBtn.addEventListener('click', resetToUpload);
    analyzeBtn.addEventListener('click', analyzeImage);
    saveBtn.addEventListener('click', saveResult);
    discardBtn.addEventListener('click', resetToUpload);
}

// Handle File Input
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    currentImageMimeType = file.type;

    const reader = new FileReader();
    reader.onload = (event) => {
        currentImageSrc = event.target.result;
        imagePreview.src = currentImageSrc;
        
        // Switch views
        uploadSection.classList.add('hidden');
        previewSection.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

// Reset view to initial upload state
function resetToUpload() {
    currentImageSrc = null;
    currentImageMimeType = null;
    currentResult = null;
    imageInput.value = "";
    
    uploadSection.classList.remove('hidden');
    previewSection.classList.add('hidden');
    resultSection.classList.add('hidden');
}

// Extract Base64 data from Data URL
function getBase64Data(dataUrl) {
    return dataUrl.split(',')[1];
}

// Analyze Image using Backend API
async function analyzeImage() {
    // Show Loading
    loadingOverlay.classList.remove('hidden');
    
    // Simulate multi-step loading visually
    const steps = document.querySelectorAll('.step');
    steps[0].classList.add('step-active');
    steps[1].classList.remove('step-active');
    steps[2].classList.remove('step-active');
    
    // Animate steps blindly
    const stepInterval = setInterval(() => {
        if(steps[0].classList.contains('step-active')) {
            steps[0].classList.remove('step-active');
            steps[1].classList.add('step-active');
        } else if(steps[1].classList.contains('step-active')) {
            steps[1].classList.remove('step-active');
            steps[2].classList.add('step-active');
        }
    }, 2000);

    try {
        const base64Image = getBase64Data(currentImageSrc);
        
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                imageBase64: base64Image,
                mimeType: currentImageMimeType
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'サーバーエラーが発生しました');
        }

        const parsedResult = await response.json();

        currentResult = {
            id: Date.now().toString(),
            name: parsedResult.name,
            cal: Number(parsedResult.cal) || 0,
            pro: Number(parsedResult.pro) || 0,
            carb: Number(parsedResult.carb) || 0,
            image: currentImageSrc,
            timestamp: new Date().toISOString()
        };

        displayResult(currentResult);
        
        // Hide loading and show result
        clearInterval(stepInterval);
        loadingOverlay.classList.add('hidden');
        previewSection.classList.add('hidden');
        resultSection.classList.remove('hidden');

    } catch (error) {
        console.error("Analysis Error:", error);
        alert('解析に失敗しました。\n詳細: ' + error.message);
        clearInterval(stepInterval);
        loadingOverlay.classList.add('hidden');
    }
}

// Render Result Values
function displayResult(data) {
    document.getElementById('dishName').textContent = data.name;
    
    animateValue('calValue', 0, data.cal, 1000);
    animateValue('proValue', 0, data.pro, 1000);
    animateValue('carbValue', 0, data.carb, 1000);
    
    // Animate Progress Bars
    setTimeout(() => {
        document.getElementById('calProgress').style.width = `${Math.min((data.cal / 2000) * 100, 100)}%`;
        document.getElementById('proProgress').style.width = `${Math.min((data.pro / 60) * 100, 100)}%`;
        document.getElementById('carbProgress').style.width = `${Math.min((data.carb / 250) * 100, 100)}%`;
    }, 100);
}

// Animate number counting up
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Save to LocalStorage
function saveResult() {
    if (!currentResult) return;
    
    historyData.unshift(currentResult);
    localStorage.setItem('mealAiHistory', JSON.stringify(historyData));
    
    renderHistory();
    resetToUpload();
    
    // Scroll to history
    document.getElementById('historySection').scrollIntoView({ behavior: 'smooth' });
}

// Load from LocalStorage
function loadHistory() {
    const saved = localStorage.getItem('mealAiHistory');
    if (saved) {
        historyData = JSON.parse(saved);
        // Optional: filter out only today's meals
        const today = new Date().toDateString();
        historyData = historyData.filter(item => {
            return new Date(item.timestamp).toDateString() === today;
        });
        localStorage.setItem('mealAiHistory', JSON.stringify(historyData));
    }
    renderHistory();
}

// Render History List
function renderHistory() {
    if (historyData.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-utensils"></i>
                <p>まだ本日の記録はありません。</p>
            </div>
        `;
        totalCalEl.textContent = "0";
        return;
    }

    let html = '';
    let totalCal = 0;

    historyData.forEach(item => {
        totalCal += item.cal;
        const time = new Date(item.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div class="history-item">
                <img src="${item.image}" alt="${item.name}" class="history-item-img">
                <div class="history-item-info">
                    <div class="history-item-title">${item.name}</div>
                    <div class="history-item-macros">
                        <span><i class="fa-solid fa-fire text-orange-500"></i> ${item.cal}kcal</span>
                        <span>P: ${item.pro}g</span>
                        <span>C: ${item.carb}g</span>
                    </div>
                </div>
                <div class="history-item-time">${time}</div>
            </div>
        `;
    });

    historyList.innerHTML = html;
    
    // Animate total calories update
    const currentTotal = parseInt(totalCalEl.textContent) || 0;
    animateValue('totalCal', currentTotal, totalCal, 500);
}

// Start app
init();
