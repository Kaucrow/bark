// State management
const DashboardState = {
  ws: null,
  logs: [],
  currentFilter: 'all',
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  isConnected: false,
  wsPort: '{{wsPort}}',
};

// DOM Elements
const elements = {
  statusIndicator: null,
  statusText: null,
  statusValue: null,
  totalLogs: null,
  connectedClients: null,
  logsContainer: null,
  filterBadges: null,
  refreshStatsBtn: null,
  exportLogsBtn: null,
  clearLogsBtn: null
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  setupEventListeners();
  connectWebSocket();
  setupHighlightStyle();
});

// Initialize DOM element references
function initializeElements() {
  elements.statusIndicator = document.getElementById('statusIndicator');
  elements.statusText = document.getElementById('statusText');
  elements.statusValue = document.getElementById('statusValue');
  elements.totalLogs = document.getElementById('totalLogs');
  elements.connectedClients = document.getElementById('connectedClients');
  elements.logsContainer = document.getElementById('logsContainer');
  elements.filterBadges = document.getElementById('filterBadges');
  elements.refreshStatsBtn = document.getElementById('refreshStats');
  elements.exportLogsBtn = document.getElementById('exportLogs');
  elements.clearLogsBtn = document.getElementById('clearLogs');
}

// Setup event listeners
function setupEventListeners() {
  // Filter badges
  if (elements.filterBadges) {
    elements.filterBadges.addEventListener('click', handleFilterClick);
  }
  
  // Control buttons
  if (elements.refreshStatsBtn) {
    elements.refreshStatsBtn.addEventListener('click', refreshStats);
  }
  
  if (elements.exportLogsBtn) {
    elements.exportLogsBtn.addEventListener('click', exportLogs);
  }
  
  if (elements.clearLogsBtn) {
    elements.clearLogsBtn.addEventListener('click', clearLogs);
  }
  
  // Page visibility change
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

// WebSocket connection
function connectWebSocket() {
  if (DashboardState.reconnectAttempts >= DashboardState.maxReconnectAttempts) {
    showToast('Max reconnection attempts reached. Please refresh the page.', 'error');
    return;
  }
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  const wsUrl = `${protocol}//${hostname}:${DashboardState.wsPort}/ws`;
  
  DashboardState.ws = new WebSocket(wsUrl);
  
  DashboardState.ws.onopen = handleWebSocketOpen;
  DashboardState.ws.onmessage = handleWebSocketMessage;
  DashboardState.ws.onclose = handleWebSocketClose;
  DashboardState.ws.onerror = handleWebSocketError;
}

function handleWebSocketOpen() {
  DashboardState.isConnected = true;
  DashboardState.reconnectAttempts = 0;
  updateStatus(true, 'Connected');
  showToast('Connected to live log stream', 'success');
  console.log('WebSocket connected');
}

function handleWebSocketMessage(event) {
  try {
    const data = JSON.parse(event.data);
    processServerMessage(data);
  } catch (error) {
    console.error('Error parsing server message:', error);
    showToast('Error processing server message', 'error');
  }
}

function handleWebSocketClose() {
  DashboardState.isConnected = false;
  updateStatus(false, 'Disconnected - Reconnecting...');
  DashboardState.reconnectAttempts++;

  // Exponential backoff for reconnection
  const delay = Math.min(1000 * Math.pow(2, DashboardState.reconnectAttempts), 30000);

  setTimeout(() => {
    if (!DashboardState.isConnected) {
      connectWebSocket();
    }
  }, delay);
}

function handleWebSocketError(error) {
  console.error('WebSocket error:', error);
  showToast('Connection error', 'error');
}

// Message processing
function processServerMessage(data) {
  switch(data.type) {
    case 'INITIAL_LOGS': {
      DashboardState.logs = data.data || [];
      renderAllLogs();
      updateLogCount();
      break;
    }
        
    case 'NEW_LOG': {
      addNewLog(data.data);
      break;
    }
        
    case 'LOGS_CLEARED': {
      DashboardState.logs = [];
      renderAllLogs();
      updateLogCount();
      showToast('All logs cleared', 'success');
      break;
    }
        
    case 'STATS_UPDATE': {
      updateConnectedClients(data.data.connectedClients);
      break;
    }
        
    case 'EXPORT_DATA': {
      downloadExport(data.data);
      break;
    }
        
    default: {
      console.log('Unknown message type:', data.type);
    }
  }
}

// Filter handling
function handleFilterClick(event) {
  const badge = event.target.closest('.filter-badge');
  if (!badge) return;
  
  const level = badge.dataset.level;
  setFilter(level);
}

function setFilter(level) {
  DashboardState.currentFilter = level;
  
  // Update active badge
  document.querySelectorAll('.filter-badge').forEach(badge => {
    badge.classList.toggle('active', badge.dataset.level === level);
  });
  
  renderAllLogs();
  
  // Notify server of filter change
  if (DashboardState.isConnected && DashboardState.ws) {
    DashboardState.ws.send(JSON.stringify({
      type: 'FILTER_CHANGE',
      data: { level }
    }));
  }
}

// Log rendering
function renderAllLogs() {
  const container = elements.logsContainer;
  if (!container) return;
  
  const filteredLogs = DashboardState.logs.filter(log => 
    DashboardState.currentFilter === 'all' || 
    DashboardState.currentFilter === log.level
  );
  
  if (filteredLogs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No logs match current filter</h3>
        <p>Try changing the filter settings</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  // Show newest first
  filteredLogs.slice().reverse().forEach(log => {
    addLogToUI(log, false);
  });
}

function addNewLog(log) {
  DashboardState.logs.push(log);
  
  // Keep only last 1000 logs in memory
  if (DashboardState.logs.length > 1000) {
    DashboardState.logs = DashboardState.logs.slice(-1000);
  }
  
  if (shouldShowLog(log.level)) {
    addLogToUI(log, true);
  }
  
  updateLogCount();
}

function addLogToUI(log, highlight = false) {
  const container = elements.logsContainer;
  
  // Remove empty state if it exists
  const emptyState = container.querySelector('.empty-state');
  if (emptyState) {
    container.removeChild(emptyState);
  }
  
  const logElement = createLogElement(log);
  
  if (highlight) {
    logElement.classList.add('highlight');
    setTimeout(() => {
      logElement.classList.remove('highlight');
    }, 1000);
  }
  
  // Add at the beginning (newest first)
  container.insertBefore(logElement, container.firstChild);
  
  // Auto-scroll if at bottom
  const isAtBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 50;
  if (isAtBottom) {
    container.scrollTop = 0;
  }
}

function createLogElement(log) {
  const element = document.createElement('div');
  element.className = `log-entry ${log.level}`;
  element.dataset.level = log.level;
  
  const timestamp = new Date(log.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  element.innerHTML = `
    <div class="log-header">
      <span class="log-timestamp">${timestamp}</span>
      <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
    </div>
    <div class="log-message">${escapeHtml(log.message)}</div>
    ${log.source ? `<div class="log-source">${escapeHtml(log.source)}</div>` : ''}
  `;
  
  return element;
}

function shouldShowLog(level) {
  return DashboardState.currentFilter === 'all' || 
    DashboardState.currentFilter === level;
}

// UI updates
function updateStatus(connected, text) {
  if (elements.statusIndicator && elements.statusText && elements.statusValue) {
    if (connected) {
      elements.statusIndicator.classList.remove('status-disconnected');
      elements.statusText.textContent = text;
      elements.statusValue.textContent = 'Live';
    } else {
      elements.statusIndicator.classList.add('status-disconnected');
      elements.statusText.textContent = text;
      elements.statusValue.textContent = 'Offline';
    }
  }
}

function updateLogCount() {
  if (elements.totalLogs) {
    const filteredCount = DashboardState.logs.filter(log => 
      shouldShowLog(log.level)
    ).length;
    elements.totalLogs.textContent = filteredCount;
  }
}

function updateConnectedClients(count) {
  if (elements.connectedClients) {
    elements.connectedClients.textContent = count;
  }
}

// Button actions
function refreshStats() {
  if (!DashboardState.isConnected || !DashboardState.ws) {
    showToast('Not connected to server', 'warning');
    return;
  }
  
  DashboardState.ws.send(JSON.stringify({
    type: 'GET_STATS'
  }));
  
  showToast('Refreshing statistics...', 'info');
}

function exportLogs() {
  if (!DashboardState.isConnected || !DashboardState.ws) {
    showToast('Not connected to server', 'warning');
    return;
  }
  
  DashboardState.ws.send(JSON.stringify({
    type: 'EXPORT_REQUEST'
  }));
  
  showToast('Preparing export...', 'info');
}

function clearLogs() {
  if (!confirm('Are you sure you want to clear all logs?')) {
    return;
  }
  
  if (!DashboardState.isConnected || !DashboardState.ws) {
    showToast('Not connected to server. Clearing local logs only.', 'warning');
    DashboardState.logs = [];
    renderAllLogs();
    updateLogCount();
    return;
  }
  
  DashboardState.ws.send(JSON.stringify({
    type: 'CLEAR_LOGS'
  }));
}

// Utility functions
function downloadExport(data) {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bark-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Export downloaded successfully', 'success');
  } catch (error) {
    console.error('Error downloading export:', error);
    showToast('Error downloading export', 'error');
  }
}

function showToast(message, type = 'info') {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(toast => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  });
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function handleVisibilityChange() {
  if (!document.hidden && !DashboardState.isConnected) {
    connectWebSocket();
  }
}

function setupHighlightStyle() {
  // Add highlight animation CSS if not already in stylesheet
  if (!document.querySelector('style[data-highlight]')) {
    const style = document.createElement('style');
    style.setAttribute('data-highlight', 'true');
    style.textContent = `
      @keyframes highlight {
        0% { background-color: #ffffcc; }
        100% { background-color: inherit; }
      }
      .log-entry.highlight {
        animation: highlight 1s ease-out;
      }
    `;
    document.head.appendChild(style);
  }
}