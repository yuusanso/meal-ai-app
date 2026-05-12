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

// Calendar & History Elements
const historyList = document.getElementById('historyList');
const totalCalEl = document.getElementById('totalCal');
const totalProEl = document.getElementById('totalPro');
const totalFatEl = document.getElementById('totalFat');
const totalCarbEl = document.getElementById('totalCarb');
const selectedDateDisplay = document.getElementById('selectedDateDisplay');

const currentMonthYear = document.getElementById('currentMonthYear');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const calendarDays = document.getElementById('calendarDays');

// Current State
let currentImageSrc = null; // Base64 data URL
let currentImageMimeType = null;
let currentResult = null;

// History State
let historyData = []; // Array of all items
let currentCalendarDate = new Date(); // The month currently viewed in calendar
let selectedDate = new Date(); // The specific day selected

// Initialize App
function init() {
    loadHistory();
    setupEventListeners();
    renderCalendar();
    renderHistoryForSelectedDate();
}

// Event Listeners
function setupEventListeners() {
    imageInput.addEventListener('change', handleImageUpload);
    reselectBtn.addEventListener('click', resetToUpload);
    analyzeBtn.addEventListener('click', analyzeImage);
    saveBtn.addEventListener('click', saveResult);
    discardBtn.addEventListener('click', resetToUpload);

    prevMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });
    nextMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
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
    loadingOverlay.classList.remove('hidden');
    
    const steps = document.querySelectorAll('.step');
    steps[0].classList.add('step-active');
    steps[1].classList.remove('step-active');
    steps[2].classList.remove('step-active');
    
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
            headers: { 'Content-Type': 'application/json' },
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
            fat: Number(parsedResult.fat) || 0,
            carb: Number(parsedResult.carb) || 0,
            image: currentImageSrc,
            timestamp: new Date().toISOString()
        };

        displayResult(currentResult);
        
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
    animateValue('fatValue', 0, data.fat, 1000);
    animateValue('carbValue', 0, data.carb, 1000);
    
    setTimeout(() => {
        document.getElementById('calProgress').style.width = `${Math.min((data.cal / 2000) * 100, 100)}%`;
        document.getElementById('proProgress').style.width = `${Math.min((data.pro / 60) * 100, 100)}%`;
        document.getElementById('fatProgress').style.width = `${Math.min((data.fat / 60) * 100, 100)}%`;
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
    
    // Set timestamp to selected date if logging for a past day, otherwise current time
    const today = new Date().toDateString();
    if (selectedDate.toDateString() !== today) {
        // Just use the selected date but keep current time of day for sorting
        const newTime = new Date();
        newTime.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        currentResult.timestamp = newTime.toISOString();
    }
    
    historyData.unshift(currentResult);
    localStorage.setItem('mealAiHistory', JSON.stringify(historyData));
    
    renderCalendar(); // Re-render to show marker
    renderHistoryForSelectedDate();
    resetToUpload();
    
    document.getElementById('historySection').scrollIntoView({ behavior: 'smooth' });
}

// Load from LocalStorage
function loadHistory() {
    const saved = localStorage.getItem('mealAiHistory');
    if (saved) {
        historyData = JSON.parse(saved);
        // Clean up legacy data without fat
        historyData.forEach(item => {
            if (item.fat === undefined) item.fat = 0;
        });
    }
}

// Helper: Check if two dates are same day
function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

// Render Calendar
function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    currentMonthYear.textContent = `${year}年${month + 1}月`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    calendarDays.innerHTML = '';
    
    // Get unique dates that have history
    const daysWithHistory = new Set(historyData.map(item => new Date(item.timestamp).toDateString()));
    const today = new Date();

    // Empty cells before 1st day
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        calendarDays.appendChild(div);
    }
    
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateObj = new Date(year, month, i);
        const dateString = dateObj.toDateString();
        
        const div = document.createElement('div');
        div.className = 'calendar-day';
        div.textContent = i;
        
        if (isSameDay(dateObj, today)) {
            div.classList.add('today');
        }
        
        if (isSameDay(dateObj, selectedDate)) {
            div.classList.add('selected');
        }
        
        if (daysWithHistory.has(dateString)) {
            const marker = document.createElement('div');
            marker.className = 'day-marker';
            div.appendChild(marker);
        }
        
        div.addEventListener('click', () => {
            selectedDate = dateObj;
            renderCalendar();
            renderHistoryForSelectedDate();
        });
        
        calendarDays.appendChild(div);
    }
}

// Render History for selected date
function renderHistoryForSelectedDate() {
    const todayStr = new Date().toDateString();
    const selStr = selectedDate.toDateString();
    
    if (selStr === todayStr) {
        selectedDateDisplay.textContent = "今日の記録";
    } else {
        selectedDateDisplay.textContent = `${selectedDate.getMonth()+1}月${selectedDate.getDate()}日の記録`;
    }

    const filtered = historyData.filter(item => new Date(item.timestamp).toDateString() === selStr);

    if (filtered.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-utensils"></i>
                <p>記録はありません。</p>
            </div>
        `;
        totalCalEl.textContent = "0";
        totalProEl.textContent = "0";
        totalFatEl.textContent = "0";
        totalCarbEl.textContent = "0";
        return;
    }

    let html = '';
    let totalCal = 0, totalPro = 0, totalFat = 0, totalCarb = 0;

    filtered.forEach(item => {
        totalCal += item.cal;
        totalPro += item.pro;
        totalFat += item.fat;
        totalCarb += item.carb;
        
        const time = new Date(item.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        
        html += `
            <div class="history-item">
                <img src="${item.image}" alt="${item.name}" class="history-item-img">
                <div class="history-item-info">
                    <div class="history-item-title">${item.name}</div>
                    <div class="history-item-macros">
                        <span><i class="fa-solid fa-fire text-orange-500"></i> ${item.cal}kcal</span>
                        <span>P: ${item.pro}g</span>
                        <span>F: ${item.fat}g</span>
                        <span>C: ${item.carb}g</span>
                    </div>
                </div>
                <div class="history-item-time">${time}</div>
            </div>
        `;
    });

    historyList.innerHTML = html;
    
    // Update summary values
    animateValue('totalCal', parseInt(totalCalEl.textContent) || 0, totalCal, 500);
    animateValue('totalPro', parseInt(totalProEl.textContent) || 0, totalPro, 500);
    animateValue('totalFat', parseInt(totalFatEl.textContent) || 0, totalFat, 500);
    animateValue('totalCarb', parseInt(totalCarbEl.textContent) || 0, totalCarb, 500);
}

// Start app
init();
