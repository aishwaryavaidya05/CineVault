const API_KEY = 'b360afc87de571f4399bf77d1e1af700';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// DOM Elements
let addToWatchlistBtn, discoverBtn, searchModal, closeModal, contentSearchInput;
let contentType, searchResults, watchlistGrid, emptyState, watchlistStats;
let getStartedBtn, bulkActions, selectedCount, markWatchedBulk, removeBulk;
let clearSelection, sortButton, sortDropdown, currentSort;

// State
let watchlist = JSON.parse(localStorage.getItem('watchlist')) || [];
let currentFilter = 'all';
let currentSortOption = 'recent';
let selectedItems = new Set();

// Sort options configuration
const sortOptions = {
    recent: { label: 'Recently Added', sortFn: (a, b) => new Date(b.addedDate) - new Date(a.addedDate) },
    title: { label: 'Title (A-Z)', sortFn: (a, b) => a.title.localeCompare(b.title) },
    rating: { label: 'Rating (High to Low)', sortFn: (a, b) => (b.rating || 0) - (a.rating || 0) },
    release: { label: 'Release Date (Newest)', sortFn: (a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0) },
    runtime: { label: 'Runtime (Shortest)', sortFn: (a, b) => (a.runtime || 0) - (b.runtime || 0) }
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    loadWatchlist();
    updateStats();
});

function initializeElements() {
    // Initialize all DOM elements
    addToWatchlistBtn = document.getElementById('addToWatchlistBtn');
    discoverBtn = document.getElementById('discoverBtn');
    searchModal = document.getElementById('searchModal');
    closeModal = document.getElementById('closeModal');
    contentSearchInput = document.getElementById('contentSearchInput');
    contentType = document.getElementById('contentType');
    searchResults = document.getElementById('searchResults');
    watchlistGrid = document.getElementById('watchlistGrid');
    emptyState = document.getElementById('emptyState');
    watchlistStats = document.getElementById('watchlistStats');
    getStartedBtn = document.getElementById('getStartedBtn');
    bulkActions = document.getElementById('bulkActions');
    selectedCount = document.getElementById('selectedCount');
    markWatchedBulk = document.getElementById('markWatchedBulk');
    removeBulk = document.getElementById('removeBulk');
    clearSelection = document.getElementById('clearSelection');
    sortButton = document.getElementById('sortButton');
    sortDropdown = document.getElementById('sortDropdown');
    currentSort = document.getElementById('currentSort');
}

function setupEventListeners() {
    // Check if elements exist before adding event listeners
    if (addToWatchlistBtn) {
        addToWatchlistBtn.addEventListener('click', () => searchModal.classList.remove('hidden'));
    }
    
    if (discoverBtn) {
        discoverBtn.addEventListener('click', () => window.location.href = 'discover.html');
    }
    
    if (closeModal && searchModal) {
        closeModal.addEventListener('click', () => searchModal.classList.add('hidden'));
    }
    
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => searchModal.classList.remove('hidden'));
    }
    
    // Search functionality
    if (contentSearchInput) {
        contentSearchInput.addEventListener('input', debounce(handleContentSearch, 500));
    }
    
    if (contentType) {
        contentType.addEventListener('change', handleContentSearch);
    }
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            setActiveFilter(filter);
        });
    });
    
    // Sort dropdown
    if (sortButton) {
        sortButton.addEventListener('click', toggleSortDropdown);
    }
    
    document.querySelectorAll('.sort-option').forEach(option => {
        option.addEventListener('click', function() {
            const sort = this.getAttribute('data-sort');
            setSortOption(sort);
        });
    });
    
    // Bulk actions
    if (markWatchedBulk) {
        markWatchedBulk.addEventListener('click', markSelectedAsWatched);
    }
    
    if (removeBulk) {
        removeBulk.addEventListener('click', removeSelectedItems);
    }
    
    if (clearSelection) {
        clearSelection.addEventListener('click', clearAllSelection);
    }
    
    // Close modals on outside click
    if (searchModal) {
        searchModal.addEventListener('click', (e) => {
            if (e.target === searchModal) searchModal.classList.add('hidden');
        });
    }
    
    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (sortButton && !sortButton.contains(e.target) && sortDropdown && !sortDropdown.contains(e.target)) {
            sortDropdown.classList.remove('show');
        }
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function handleContentSearch() {
    const query = contentSearchInput.value.trim();
    const type = contentType.value;
    
    if (!searchResults) return;
    
    if (query.length < 2) {
        searchResults.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-search text-4xl mb-4"></i>
                <p>Enter at least 2 characters to search</p>
            </div>
        `;
        return;
    }
    
    try {
        let url;
        if (type === 'multi') {
            url = `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`;
        } else {
            url = `${BASE_URL}/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        displaySearchResults(data.results, type);
    } catch (error) {
        console.error('Error searching content:', error);
        searchResults.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p>Failed to search. Please try again.</p>
            </div>
        `;
    }
}

function displaySearchResults(results, type) {
    if (!searchResults) return;
    
    if (!results || results.length === 0) {
        searchResults.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-search text-4xl mb-4"></i>
                <p>No results found. Try different keywords.</p>
            </div>
        `;
        return;
    }
    
    // Filter out people and other non-media types for multi search
    const mediaResults = type === 'multi' 
        ? results.filter(item => item.media_type === 'movie' || item.media_type === 'tv')
        : results;
    
    if (mediaResults.length === 0) {
        searchResults.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-search text-4xl mb-4"></i>
                <p>No movies or TV shows found.</p>
            </div>
        `;
        return;
    }
    
    searchResults.innerHTML = mediaResults.map(item => {
        const isMovie = item.media_type === 'movie' || type === 'movie';
        const title = isMovie ? item.title : item.name;
        const releaseDate = isMovie ? item.release_date : item.first_air_date;
        const year = releaseDate ? releaseDate.substring(0, 4) : 'TBA';
        const posterUrl = item.poster_path ? IMG_URL + item.poster_path : '';
        const isInWatchlist = watchlist.some(wl => wl.id === item.id && wl.type === (isMovie ? 'movie' : 'tv'));
        
        return `
            <div class="flex items-center gap-4 p-4 border-b hover:bg-gray-50 cursor-pointer transition duration-200" 
                 onclick="addToWatchlist(${item.id}, '${isMovie ? 'movie' : 'tv'}', '${title.replace(/'/g, "\\'")}', '${item.poster_path || ''}')">
                <div class="w-16 h-20 bg-gray-200 rounded flex items-center justify-center overflow-hidden">
                    ${posterUrl ? 
                        `<img src="${posterUrl}" alt="${title}" class="w-full h-full object-cover">` :
                        `<i class="fas fa-film text-gray-400"></i>`
                    }
                </div>
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                        <h4 class="font-semibold text-gray-800">${title}</h4>
                        <span class="text-xs px-2 py-1 rounded-full ${isMovie ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">
                            ${isMovie ? 'Movie' : 'TV Show'}
                        </span>
                    </div>
                    <p class="text-sm text-gray-600">${year}</p>
                    <p class="text-sm text-gray-500 line-clamp-2">${item.overview || 'No description available.'}</p>
                </div>
                <div class="text-right">
                    ${isInWatchlist ? 
                        '<span class="text-green-600 text-sm font-semibold"><i class="fas fa-check mr-1"></i>In Watchlist</span>' :
                        '<button class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition duration-200">Add to Watchlist</button>'
                    }
                </div>
            </div>
        `;
    }).join('');
}

function addToWatchlist(id, type, title, posterPath = null) {
    // Check if already in watchlist
    if (watchlist.some(item => item.id === id && item.type === type)) {
        showNotification(`${title} is already in your watchlist!`, 'info');
        return;
    }
    
    const newItem = {
        id,
        type,
        title,
        addedDate: new Date().toISOString(),
        watched: false,
        posterPath: posterPath,
        rating: null,
        releaseDate: null,
        runtime: null
    };
    
    watchlist.unshift(newItem);
    saveWatchlist();
    showNotification(`${title} added to watchlist!`, 'success');
    
    if (searchModal) {
        searchModal.classList.add('hidden');
    }
    
    if (contentSearchInput) {
        contentSearchInput.value = '';
    }
}

function removeFromWatchlist(id, type) {
    watchlist = watchlist.filter(item => !(item.id === id && item.type === type));
    saveWatchlist();
    showNotification('Item removed from watchlist', 'success');
}

function toggleWatchedStatus(id, type) {
    const item = watchlist.find(item => item.id === id && item.type === type);
    if (item) {
        item.watched = !item.watched;
        item.watchedDate = item.watched ? new Date().toISOString() : null;
        saveWatchlist();
        showNotification(`Marked as ${item.watched ? 'watched' : 'unwatched'}`, 'success');
    }
}

function loadWatchlist() {
    if (!emptyState || !watchlistGrid || !watchlistStats) return;
    
    if (watchlist.length === 0) {
        emptyState.classList.remove('hidden');
        watchlistGrid.classList.add('hidden');
        watchlistStats.classList.add('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    watchlistGrid.classList.remove('hidden');
    watchlistStats.classList.remove('hidden');
    
    renderWatchlist();
}

function renderWatchlist() {
    if (!watchlistGrid) return;
    
    let filteredItems = [...watchlist];
    
    // Apply filter
    switch (currentFilter) {
        case 'movie':
            filteredItems = filteredItems.filter(item => item.type === 'movie');
            break;
        case 'tv':
            filteredItems = filteredItems.filter(item => item.type === 'tv');
            break;
        case 'watched':
            filteredItems = filteredItems.filter(item => item.watched);
            break;
        case 'unwatched':
            filteredItems = filteredItems.filter(item => !item.watched);
            break;
    }
    
    // Apply sort
    filteredItems.sort(sortOptions[currentSortOption].sortFn);
    
    watchlistGrid.innerHTML = filteredItems.map(item => {
        const posterUrl = item.posterPath ? IMG_URL + item.posterPath : '';
        const isSelected = selectedItems.has(`${item.id}-${item.type}`);
        
        return `
        <div class="bg-gray-800 rounded-lg shadow-md watchlist-card overflow-hidden ${item.watched ? 'opacity-75' : ''}">
            <div class="relative">
                <div class="w-full h-64 bg-gray-200 flex items-center justify-center overflow-hidden">
                    ${posterUrl ? 
                        `<img src="${posterUrl}" alt="${item.title}" class="w-full h-full object-cover">` :
                        `<i class="fas fa-film text-4xl text-gray-400"></i>`
                    }
                </div>
                <div class="absolute top-2 right-2 flex gap-1">
                    <button onclick="toggleItemSelection(${item.id}, '${item.type}')" 
                            class="w-6 h-6 rounded-full border-2 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300'} flex items-center justify-center text-xs">
                        ${isSelected ? '✓' : ''}
                    </button>
                </div>
                <div class="absolute top-2 left-2">
                    <span class="text-xs px-2 py-1 rounded-full ${item.type === 'movie' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">
                        ${item.type === 'movie' ? 'Movie' : 'TV Show'}
                    </span>
                </div>
                ${item.watched ? 
                    '<div class="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-semibold">Watched</div>' : ''}
            </div>
            
            <div class="p-4">
                <h3 class="font-bold text-lg mb-2 line-clamp-2" title="${item.title}">${item.title}</h3>
                
                <div class="flex justify-between items-center text-sm text-gray-600 mb-3">
                    <span>Added: ${formatDate(item.addedDate)}</span>
                    ${item.watched && item.watchedDate ? 
                        `<span>Watched: ${formatDate(item.watchedDate)}</span>` : ''}
                </div>
                
                <div class="flex gap-2">
                    <button onclick="toggleWatchedStatus(${item.id}, '${item.type}')" 
                            class="flex-1 ${item.watched ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-500 hover:bg-green-600'} text-white py-2 rounded-md font-semibold transition duration-200 text-sm">
                        <i class="fas ${item.watched ? 'fa-undo' : 'fa-check'} mr-1"></i>
                        ${item.watched ? 'Unwatch' : 'Mark Watched'}
                    </button>
                    <button onclick="removeFromWatchlist(${item.id}, '${item.type}')" 
                            class="bg-red-500 hover:bg-red-600 text-white w-10 h-10 rounded-md flex items-center justify-center transition duration-200">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

function toggleItemSelection(id, type) {
    const key = `${id}-${type}`;
    if (selectedItems.has(key)) {
        selectedItems.delete(key);
    } else {
        selectedItems.add(key);
    }
    
    updateBulkActions();
    renderWatchlist();
}

function updateBulkActions() {
    if (!bulkActions || !selectedCount) return;
    
    const count = selectedItems.size;
    if (count > 0) {
        selectedCount.textContent = `${count} item${count > 1 ? 's' : ''} selected`;
        bulkActions.classList.remove('hidden');
    } else {
        bulkActions.classList.add('hidden');
    }
}

function markSelectedAsWatched() {
    selectedItems.forEach(key => {
        const [id, type] = key.split('-');
        const item = watchlist.find(item => item.id === parseInt(id) && item.type === type);
        if (item && !item.watched) {
            item.watched = true;
            item.watchedDate = new Date().toISOString();
        }
    });
    
    saveWatchlist();
    clearAllSelection();
    showNotification(`Marked ${selectedItems.size} items as watched`, 'success');
}

function removeSelectedItems() {
    if (confirm(`Are you sure you want to remove ${selectedItems.size} items from your watchlist?`)) {
        selectedItems.forEach(key => {
            const [id, type] = key.split('-');
            watchlist = watchlist.filter(item => !(item.id === parseInt(id) && item.type === type));
        });
        
        saveWatchlist();
        clearAllSelection();
        showNotification(`Removed ${selectedItems.size} items from watchlist`, 'success');
    }
}

function clearAllSelection() {
    selectedItems.clear();
    updateBulkActions();
    renderWatchlist();
}

function setActiveFilter(filter) {
    currentFilter = filter;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.getAttribute('data-filter') === filter) {
            btn.classList.remove('bg-gray-700', 'text-white');
            btn.classList.add('bg-blue-600', 'text-white');
        } else {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-gray-700', 'text-white');
        }
    });
    
    renderWatchlist();
}

function setSortOption(sort) {
    currentSortOption = sort;
    if (currentSort) {
        currentSort.textContent = sortOptions[sort].label;
    }
    if (sortDropdown) {
        sortDropdown.classList.remove('show');
    }
    renderWatchlist();
}

function toggleSortDropdown() {
    if (sortDropdown) {
        sortDropdown.classList.toggle('show');
    }
}

function updateStats() {
    if (!watchlistStats || watchlist.length === 0) return;
    
    const moviesCount = watchlist.filter(item => item.type === 'movie').length;
    const showsCount = watchlist.filter(item => item.type === 'tv').length;
    const watchedCount = watchlist.filter(item => item.watched).length;
    
    document.getElementById('totalCount').textContent = watchlist.length;
    document.getElementById('moviesCount').textContent = moviesCount;
    document.getElementById('showsCount').textContent = showsCount;
    document.getElementById('watchedCount').textContent = watchedCount;
}

function saveWatchlist() {
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    loadWatchlist();
    updateStats();
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white font-semibold z-50 ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        'bg-blue-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Export functions for global access
window.addToWatchlist = addToWatchlist;
window.removeFromWatchlist = removeFromWatchlist;
window.toggleWatchedStatus = toggleWatchedStatus;
window.toggleItemSelection = toggleItemSelection;