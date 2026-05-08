// Version: 2026.04.27.v3.0
let map = null;
let currentPosition = null;
let watchId = null;
let activityState = 'idle'; // idle, running, paused, stopped
let activityType = 'running'; // running, walking

// Capacitor Plugin References
let Filesystem = null;
let BackgroundGeolocation = null;

// Log Buffer for debugging
const logBuffer = [];
function appLog(msg) {
    const d = new Date();
    const ts = new Date(d.getTime() + (8 * 60 * 60 * 1000)).toISOString().substring(11, 19);
    const line = `[${ts}] ${msg}`;
    logBuffer.push(line);
    if (logBuffer.length > 600) logBuffer.shift();
    console.log('APP:', msg);
}

async function setupLogDownloadListener() {
    const dlBtn = document.getElementById('downloadLogIcon');
    if (!dlBtn) return;

    dlBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const text = logBuffer.join('\n');

        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                if (!Filesystem) Filesystem = window.Capacitor.Plugins.Filesystem;
                const fileName = `runrecord_log_${Date.now()}.txt`;

                await Filesystem.writeFile({
                    path: fileName,
                    data: text,
                    directory: 'Documents',
                    recursive: true,
                    encoding: 'utf8'
                });

                alert(`Log saved to Documents folder: ${fileName}`);
                appLog('Log saved via native Filesystem.');
            } catch (err) {
                console.error('Native save error:', err);
                alert('Failed to save log natively: ' + err.message);
                appLog(`Native save error: ${err.message}`);
            }
        } else {
            const blob = new Blob([text], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `runrecord_log_${Date.now()}.txt`;
            a.click();
            appLog('Log file downloaded via browser.');
        }
    });
}

// Map drawing state
let routeSegments = [[]];
let routePolylines = [];
let startMarker = null;
let endMarker = null;

// Activity tracking data
let activityStartTime = null;
let activityPausedTime = 0;
let activityElapsedTime = 0;
let totalDistance = 0;
let lastPosition = null;
let pauseStartTime = null;
let autoPausedBySignal = false;

let timerInterval = null;

const elements = {
    gpsStatus: document.getElementById('gpsStatus'),
    gpsAlert: document.getElementById('gpsAlert'),
    enableGpsBtn: document.getElementById('enableGpsBtn'),
    mapOverlay: document.getElementById('mapOverlay'),
    activityBtns: document.querySelectorAll('.activity-btn'),
    startBtn: document.getElementById('startBtn'),
    pauseBtn: document.getElementById('pauseBtn'),
    resumeBtn: document.getElementById('resumeBtn'),
    stopBtn: document.getElementById('stopBtn'),
    speedValue: document.getElementById('speedValue'),
    distanceValue: document.getElementById('distanceValue'),
    timeValue: document.getElementById('timeValue'),
    historyFilter: document.getElementById('historyFilter'),
    exportBtn: document.getElementById('exportBtn'),
    historyList: document.getElementById('historyList')
};

async function loadGoogleMaps() {
    if (window.google && window.google.maps) {
        initMap();
        return;
    }

    const apiKey = 'your_API';

    appLog('Loading Google Maps script dynamically...');
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
    script.async = true;
    script.defer = true;

    script.onload = () => appLog('Google Maps script loaded successfully.');
    script.onerror = () => {
        appLog('Error loading Google Maps script.');
        alert('Failed to load map. Check API key and internet connection.');
    };

    document.head.appendChild(script);
}

function initMap() {
    const defaultCenter = { lat: 25.0330, lng: 121.5654 };

    map = new google.maps.Map(document.getElementById('map'), {
        center: defaultCenter,
        zoom: 15,
        mapTypeId: 'roadmap',
        styles: [{ featureType: 'all', elementType: 'geometry', stylers: [{ saturation: -20 }] }],
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
    });

    appLog('Map initialized');
}

function requestGPSPermission() {
    if (!navigator.geolocation) {
        alert('您的瀏覽器不支援 GPS 定位功能');
        return;
    }
    elements.gpsAlert.classList.add('hidden');
    elements.mapOverlay.classList.remove('hidden');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            handlePositionSuccess(position);
            startGPSWatch();
        },
        handlePositionError,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

function handlePositionSuccess(position) {
    currentPosition = position;
    updateGPSStatus(position.coords.accuracy);
    const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
    if (map) {
        map.setCenter(pos);
        elements.mapOverlay.classList.add('hidden');
    }
    appLog('GPS position acquired');
}

function handlePositionError(error) {
    let message = 'GPS 發生未知錯誤';
    if (error.code === error.PERMISSION_DENIED) message = 'GPS 權限被拒絕';
    else if (error.code === error.POSITION_UNAVAILABLE) message = 'GPS 位置資訊無法取得';
    else if (error.code === error.TIMEOUT) message = 'GPS 定位請求逾時';
    alert(message);
    elements.gpsAlert.classList.remove('hidden');
}

function startGPSWatch() {
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        startNativeGPS();
    } else {
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        watchId = navigator.geolocation.watchPosition(
            handlePositionUpdate,
            (error) => console.error('GPS watch error:', error),
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    }
}

async function startNativeGPS() {
    try {
        if (!BackgroundGeolocation) BackgroundGeolocation = window.Capacitor.Plugins.BackgroundGeolocation;

        appLog('Starting Native Background Geolocation...');
        await BackgroundGeolocation.start({
            backgroundMessage: 'GPS 背景追蹤已啟用',
            backgroundTitle: '跑步器 正在追蹤',
            requestPermissions: true,
            distanceFilter: 5,
            stale: false
        }, (location, error) => {
            if (error) {
                appLog('BG Geolocation Error: ' + error.message);
                return;
            }
            const mockPosition = {
                coords: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy || 10
                },
                timestamp: Date.now()
            };
            handlePositionUpdate(mockPosition);
        });

        appLog('Native BG Geolocation active');
    } catch (err) {
        appLog('Native GPS Error: ' + err.message);
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        watchId = navigator.geolocation.watchPosition(handlePositionUpdate, (e)=>console.error(e), {enableHighAccuracy:true});
    }
}

function stopNativeGPS() {
    if (BackgroundGeolocation) {
        BackgroundGeolocation.stop();
    }
}

function updateGPSStatus(accuracy) {
    const statusText = elements.gpsStatus.querySelector('.status-text');
    const signalBars = elements.gpsStatus.querySelectorAll('.signal-bar');
    elements.gpsStatus.classList.add('active');
    statusText.textContent = 'GPS 已啟用';
    let strength = accuracy > 30 ? 1 : accuracy > 20 ? 2 : accuracy > 10 ? 3 : 4;
    signalBars.forEach((bar, index) => {
        bar.style.background = index < strength ? 'var(--success)' : 'rgba(255, 255, 255, 0.3)';
    });
}

const GPS_ACCURACY_THRESHOLD = 20;
const MAX_SPEED_THRESHOLD_RUNNING = 20;
const MAX_SPEED_THRESHOLD_WALKING = 10;
const GPS_GAP_THRESHOLD_SECONDS = 30;

function getMaxSpeedThreshold() {
    return activityType === 'running' ? MAX_SPEED_THRESHOLD_RUNNING : MAX_SPEED_THRESHOLD_WALKING;
}

function handlePositionUpdate(position) {
    const { latitude, longitude, accuracy } = position.coords;
    const timestamp = position.timestamp;
    updateGPSStatus(accuracy);
    if (accuracy > GPS_ACCURACY_THRESHOLD) {
        if (activityState === 'running' && !autoPausedBySignal) {
            autoPausedBySignal = true;
            pauseActivity(true);
        }
        return;
    } else if (activityState === 'paused' && autoPausedBySignal) {
        resumeActivity();
    }
    if (activityState !== 'running') return;
    if (lastPosition) {
        const timeDiffSeconds = (timestamp - lastPosition.timestamp) / 1000;
        if (timeDiffSeconds > GPS_GAP_THRESHOLD_SECONDS) {
            if (routeSegments[routeSegments.length - 1].length > 0) {
                routeSegments.push([]);
                routePolylines.push(createPolyline());
            }
        }
    }
    const newCoord = { lat: latitude, lng: longitude, timestamp };
    if (lastPosition) {
        const distance = calculateDistance(lastPosition.coords.latitude, lastPosition.coords.longitude, latitude, longitude);
        const timeDiff = (timestamp - lastPosition.timestamp) / 1000;
        if (timeDiff > 0) {
            const speedKmph = (distance / timeDiff) * 3600;
            if (speedKmph > getMaxSpeedThreshold()) return;
        }
        totalDistance += distance;
    }
    lastPosition = position;
    routeSegments[routeSegments.length - 1].push(newCoord);
    const currentPolyline = routePolylines[routePolylines.length - 1];
    if (currentPolyline) {
        currentPolyline.setPath(routeSegments[routeSegments.length - 1].map(c => ({ lat: c.lat, lng: c.lng })));
    }
    if (!startMarker && routeSegments.length === 1 && routeSegments[0].length === 1) {
        startMarker = new google.maps.Marker({
            position: newCoord, map: map, title: '起點',
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#10b981', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 }
        });
    }
    if (map) map.panTo(newCoord);
    updateStats();
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180, Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
    return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))) / 1000;
}

function updateStats() {
    if (activityStartTime) {
        activityElapsedTime = Math.floor((Date.now() - activityStartTime - activityPausedTime) / 1000);
    }
    const speed = activityElapsedTime > 0 ? (totalDistance / activityElapsedTime) * 3600 : 0;
    elements.speedValue.textContent = speed.toFixed(1);
    elements.distanceValue.textContent = totalDistance.toFixed(2);
    elements.timeValue.textContent = formatTime(activityElapsedTime);
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

function pad(num) { return num.toString().padStart(2, '0'); }

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateStats, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
}

function createPolyline() {
    return new google.maps.Polyline({ geodesic: true, strokeColor: '#3b82f6', strokeOpacity: 0.8, strokeWeight: 4, map: map });
}

function clearMap() {
    routePolylines.forEach(p => p.setMap(null));
    routePolylines = [];
    routeSegments = [[]];
    if (startMarker) startMarker.setMap(null);
    if (endMarker) endMarker.setMap(null);
    startMarker = null; endMarker = null;
}

function startActivity() {
    if (!currentPosition) { alert('請等待 GPS 定位完成'); return; }
    clearMap();
    activityState = 'running';
    activityStartTime = Date.now();
    activityPausedTime = 0;
    activityElapsedTime = 0;
    totalDistance = 0;
    lastPosition = null;
    autoPausedBySignal = false;
    routePolylines.push(createPolyline());
    elements.startBtn.classList.add('hidden');
    elements.pauseBtn.classList.remove('hidden');
    elements.stopBtn.classList.remove('hidden');
    elements.activityBtns.forEach(btn => btn.disabled = true);
    startTimer();
    appLog('Activity started');
}

function pauseActivity(isAuto = false) {
    if (activityState !== 'running') return;
    activityState = 'paused';
    if (!isAuto) {
        if(watchId) navigator.geolocation.clearWatch(watchId);
        watchId = null;
        stopNativeGPS();
    }
    stopTimer();
    pauseStartTime = Date.now();
    elements.pauseBtn.classList.add('hidden');
    elements.resumeBtn.classList.remove('hidden');
    appLog(`Activity ${isAuto ? 'auto-paused' : 'manually paused'}`);
}

function resumeActivity() {
    if (activityState !== 'paused') return;
    const wasAutoPaused = autoPausedBySignal;
    activityState = 'running';
    autoPausedBySignal = false;
    if (pauseStartTime) {
        activityPausedTime += (Date.now() - pauseStartTime);
        pauseStartTime = null;
    }
    if (!wasAutoPaused) startGPSWatch();
    startTimer();
    elements.resumeBtn.classList.add('hidden');
    elements.pauseBtn.classList.remove('hidden');
    appLog(`Activity ${wasAutoPaused ? 'auto-resumed' : 'manually resumed'}`);
}

function stopActivity() {
    if (activityState === 'idle') return;
    if (activityState === 'paused' && pauseStartTime) {
        activityPausedTime += (Date.now() - pauseStartTime);
    }
    activityState = 'stopped';
    stopTimer();
    if(watchId) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    stopNativeGPS();
    const lastSegment = routeSegments[routeSegments.length - 1];
    if (lastSegment && lastSegment.length > 0) {
        const lastCoord = lastSegment[lastSegment.length - 1];
        endMarker = new google.maps.Marker({
            position: lastCoord, map: map, title: '終點',
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#ef4444', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 }
        });
    }
    saveActivity();
    elements.pauseBtn.classList.add('hidden');
    elements.resumeBtn.classList.add('hidden');
    elements.stopBtn.classList.add('hidden');
    elements.startBtn.classList.remove('hidden');
    elements.activityBtns.forEach(btn => btn.disabled = false);
    activityState = 'idle';
    appLog('Activity stopped');
}

function saveActivity() {
    const activity = {
        id: Date.now(), type: activityType, date: new Date().toISOString(),
        duration: activityElapsedTime, distance: totalDistance,
        averageSpeed: activityElapsedTime > 0 ? (totalDistance / activityElapsedTime) * 3600 : 0,
        route: routeSegments
    };
    const activities = getActivities();
    activities.push(activity);
    localStorage.setItem('runningActivities', JSON.stringify(activities));
    displayHistory();
    appLog('Activity saved');
}

function getActivities() {
    const data = localStorage.getItem('runningActivities');
    return data ? JSON.parse(data) : [];
}

function displayHistory(filter = 'all') {
    const activities = getActivities();
    if (activities.length === 0) {
        elements.historyList.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><p>尚無活動紀錄</p></div>';
        return;
    }
    const now = Date.now();
    const filtered = activities.filter(act => {
        const diff = (now - new Date(act.date).getTime()) / (1000 * 60 * 60 * 24);
        if (filter === 'week') return diff <= 7;
        if (filter === 'month') return diff <= 30;
        if (filter === 'year') return diff <= 365;
        return true;
    });
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    elements.historyList.innerHTML = filtered.slice(0, 10).map(act => {
        const date = new Date(act.date);
        return `
            <div class="history-item">
                <div class="history-item-left">
                    <div class="history-item-icon">${act.type === 'running' ? '🏃' : '🚶'}</div>
                    <div class="history-item-info">
                        <h3>${act.type === 'running' ? '跑步' : '步行'}</h3>
                        <div class="history-item-date">${formatDate(date)}</div>
                    </div>
                </div>
                <div class="history-item-stats">
                    <div><div class="history-stat-value">${act.distance.toFixed(2)} km</div><div class="history-stat-label">距離</div></div>
                    <div><div class="history-stat-value">${act.averageSpeed.toFixed(1)} km/h</div><div class="history-stat-label">速度</div></div>
                    <div><div class="history-stat-value">${formatTime(act.duration)}</div><div class="history-stat-label">時間</div></div>
                </div>
            </div>`;
    }).join('');
}

function formatDate(date) {
    return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function exportToExcel() {
    const activities = getActivities();
    if (activities.length === 0) { alert('沒有可匯出紀錄'); return; }
    const filter = elements.historyFilter.value;
    const now = Date.now();
    const filtered = activities.filter(act => {
        const diff = (now - new Date(act.date).getTime()) / (1000 * 60 * 60 * 24);
        if (filter === 'week') return diff <= 7;
        if (filter === 'month') return diff <= 30;
        if (filter === 'year') return diff <= 365;
        return true;
    });
    if (filtered.length === 0) { alert('目前篩選條件下沒有可匯出紀錄'); return; }
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    let csv = '日期,類型,距離(km),平均速度(km/h),時間,時長(秒)\n';
    filtered.forEach(act => {
        csv += `${formatDate(new Date(act.date))},${act.type === 'running' ? '跑步' : '步行'},${act.distance.toFixed(2)},${act.averageSpeed.toFixed(1)},${formatTime(act.duration)},${act.duration}\n`;
    });

    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        try {
            if (!Filesystem) Filesystem = window.Capacitor.Plugins.Filesystem;
            const fileName = `running_records_${Date.now()}.csv`;
            const utf8Csv = '﻿' + csv;
            await Filesystem.writeFile({
                path: fileName,
                data: utf8Csv,
                directory: 'Documents',
                recursive: true,
                encoding: 'utf8'
            });
            alert(`CSV saved to Documents folder: ${fileName}`);
        } catch (err) {
            alert('CSV Native Save Failed: ' + err.message);
        }
    } else {
        const blob = new Blob(['\ufeff'+ csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `running_records_${Date.now()}.csv`;
        link.click();
    }
}

elements.enableGpsBtn.addEventListener('click', requestGPSPermission);
elements.activityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (activityState !== 'idle') return;
        elements.activityBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activityType = btn.dataset.activity;
    });
});
elements.startBtn.addEventListener('click', startActivity);
elements.pauseBtn.addEventListener('click', pauseActivity);
elements.resumeBtn.addEventListener('click', resumeActivity);
elements.stopBtn.addEventListener('click', stopActivity);
elements.historyFilter.addEventListener('change', (e) => displayHistory(e.target.value));
elements.exportBtn.addEventListener('click', exportToExcel);

window.addEventListener('load', async () => {
    if (!navigator.geolocation) { alert('您的瀏覽器不支援 GPS 定位功能'); return; }
    displayHistory();
    await setupLogDownloadListener();
    await loadGoogleMaps();
    appLog('Application initialized');
});

window.initMap = initMap;
