const API_KEY = 'b360afc87de571f4399bf77d1e1af700';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// DOM Elements
const createVaultBtn = document.getElementById('createVaultBtn');
const createFirstVaultBtn = document.getElementById('createFirstVaultBtn');
const discoverMoviesBtn = document.getElementById('discoverMoviesBtn');
const createVaultModal = document.getElementById('createVaultModal');
const closeCreateModal = document.getElementById('closeCreateModal');
const cancelCreateVault = document.getElementById('cancelCreateVault');
const createVaultForm = document.getElementById('createVaultForm');
const vaultName = document.getElementById('vaultName');
const vaultDescription = document.getElementById('vaultDescription');
const vaultNameCount = document.getElementById('vaultNameCount');
const vaultDescCount = document.getElementById('vaultDescCount');
const addMovieModal = document.getElementById('addMovieModal');
const closeAddMovieModal = document.getElementById('closeAddMovieModal');
const movieSearchInput = document.getElementById('movieSearchInput');
const movieSearchResults = document.getElementById('movieSearchResults');
const currentVaultName = document.getElementById('currentVaultName');
const noteEditorModal = document.getElementById('noteEditorModal');
const closeNoteModal = document.getElementById('closeNoteModal');
const cancelNote = document.getElementById('cancelNote');
const noteEditorForm = document.getElementById('noteEditorForm');
const noteMovieTitle = document.getElementById('noteMovieTitle');
const noteMovieId = document.getElementById('noteMovieId');
const noteVaultId = document.getElementById('noteVaultId');
const movieNote = document.getElementById('movieNote');
const noteCount = document.getElementById('noteCount');
const emptyState = document.getElementById('emptyState');
const vaultsGrid = document.getElementById('vaultsGrid');
const vaultDetailView = document.getElementById('vaultDetailView');
const backToVaults = document.getElementById('backToVaults');
const detailVaultName = document.getElementById('detailVaultName');
const detailVaultDescription = document.getElementById('detailVaultDescription');
const addMoviesToVault = document.getElementById('addMoviesToVault');
const shareVaultBtn = document.getElementById('shareVaultBtn');
const shareDropdown = document.getElementById('shareDropdown');
const editVaultBtn = document.getElementById('editVaultBtn');
const deleteVaultBtn = document.getElementById('deleteVaultBtn');
const vaultMoviesGrid = document.getElementById('vaultMoviesGrid');
const emptyVaultState = document.getElementById('emptyVaultState');
const addFirstMovieBtn = document.getElementById('addFirstMovieBtn');

// State
let vaults = JSON.parse(localStorage.getItem('vaults')) || [];
let currentVault = null;
let currentEditingMovie = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadVaults();
});

function setupEventListeners() {
    // Vault creation
    createVaultBtn.addEventListener('click', () => createVaultModal.classList.remove('hidden'));
    createFirstVaultBtn.addEventListener('click', () => createVaultModal.classList.remove('hidden'));
    closeCreateModal.addEventListener('click', () => createVaultModal.classList.add('hidden'));
    cancelCreateVault.addEventListener('click', () => createVaultModal.classList.add('hidden'));
    discoverMoviesBtn.addEventListener('click', () => window.location.href = 'discover.html');
    
    // Form handling
    createVaultForm.addEventListener('submit', handleCreateVault);
    vaultName.addEventListener('input', updateVaultNameCount);
    vaultDescription.addEventListener('input', updateVaultDescCount);
    
    // Movie search
    closeAddMovieModal.addEventListener('click', () => addMovieModal.classList.add('hidden'));
    movieSearchInput.addEventListener('input', debounce(handleMovieSearch, 500));
    
    // Note editor
    closeNoteModal.addEventListener('click', () => noteEditorModal.classList.add('hidden'));
    cancelNote.addEventListener('click', () => noteEditorModal.classList.add('hidden'));
    noteEditorForm.addEventListener('submit', handleNoteSave);
    movieNote.addEventListener('input', updateNoteCount);
    
    // Vault detail actions
    backToVaults.addEventListener('click', showVaultsGrid);
    addMoviesToVault.addEventListener('click', showAddMovieModal);
    addFirstMovieBtn.addEventListener('click', showAddMovieModal);
    shareVaultBtn.addEventListener('click', toggleShareDropdown);
    editVaultBtn.addEventListener('click', editCurrentVault);
    deleteVaultBtn.addEventListener('click', deleteCurrentVault);
    
    // Share dropdown
    document.querySelectorAll('.share-option').forEach(option => {
        option.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            handleShareAction(action);
        });
    });
    
    // Close modals on outside click
    createVaultModal.addEventListener('click', (e) => {
        if (e.target === createVaultModal) createVaultModal.classList.add('hidden');
    });
    addMovieModal.addEventListener('click', (e) => {
        if (e.target === addMovieModal) addMovieModal.classList.add('hidden');
    });
    noteEditorModal.addEventListener('click', (e) => {
        if (e.target === noteEditorModal) noteEditorModal.classList.add('hidden');
    });
    
    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        if (!shareVaultBtn.contains(e.target) && !shareDropdown.contains(e.target)) {
            shareDropdown.classList.remove('show');
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

function updateVaultNameCount() {
    vaultNameCount.textContent = vaultName.value.length;
}

function updateVaultDescCount() {
    vaultDescCount.textContent = vaultDescription.value.length;
}

function updateNoteCount() {
    noteCount.textContent = movieNote.value.length;
}

function handleCreateVault(e) {
    e.preventDefault();
    
    const vaultData = {
        id: Date.now().toString(),
        name: vaultName.value.trim(),
        description: vaultDescription.value.trim(),
        privacy: document.querySelector('input[name="privacy"]:checked').value,
        createdDate: new Date().toISOString(),
        movies: [],
        views: 0,
        collaborators: [],
        isPublic: document.querySelector('input[name="privacy"]:checked').value === 'public'
    };
    
    if (vaultData.name.length < 3) {
        showNotification('Vault name must be at least 3 characters long', 'error');
        return;
    }
    
    vaults.unshift(vaultData);
    saveVaults();
    createVaultModal.classList.add('hidden');
    createVaultForm.reset();
    updateVaultNameCount();
    updateVaultDescCount();
    showNotification(`Vault "${vaultData.name}" created successfully!`, 'success');
}

async function handleMovieSearch() {
    const query = movieSearchInput.value.trim();
    
    if (query.length < 2) {
        movieSearchResults.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-film text-4xl mb-4"></i>
                <p>Enter at least 2 characters to search</p>
            </div>
        `;
        return;
    }
    
    try {
        const response = await fetch(
            `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=en-US&page=1`
        );
        const data = await response.json();
        displayMovieSearchResults(data.results);
    } catch (error) {
        console.error('Error searching movies:', error);
        movieSearchResults.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p>Failed to search movies. Please try again.</p>
            </div>
        `;
    }
}

function displayMovieSearchResults(movies) {
    if (!movies || movies.length === 0) {
        movieSearchResults.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-search text-4xl mb-4"></i>
                <p>No movies found. Try different keywords.</p>
            </div>
        `;
        return;
    }
    
    movieSearchResults.innerHTML = movies.map(movie => {
        const isInVault = currentVault.movies.some(m => m.id === movie.id);
        const posterUrl = movie.poster_path ? IMG_URL + movie.poster_path : './images/placeholder.jpg';
        const year = movie.release_date ? movie.release_date.substring(0, 4) : 'TBA';
        
        return `
            <div class="flex items-center gap-4 p-4 border-b hover:bg-gray-50 cursor-pointer transition duration-200" 
                 onclick="${isInVault ? '' : `addMovieToVault(${movie.id}, '${movie.title.replace(/'/g, "\\'")}')`}">
                <img src="${posterUrl}" 
                     alt="${movie.title}" 
                     class="w-16 h-20 object-cover rounded"
                     onerror="this.src='./images/placeholder.jpg'">
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-800">${movie.title}</h4>
                    <p class="text-sm text-gray-600">${year}</p>
                    <p class="text-sm text-gray-500 line-clamp-2">${movie.overview || 'No description available.'}</p>
                </div>
                <div class="text-right">
                    ${isInVault ? 
                        '<span class="text-green-600 text-sm font-semibold"><i class="fas fa-check mr-1"></i>Added</span>' :
                        '<button class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition duration-200">Add to Vault</button>'
                    }
                </div>
            </div>
        `;
    }).join('');
}

function addMovieToVault(movieId, movieTitle) {
    const movieData = {
        id: movieId,
        title: movieTitle,
        addedDate: new Date().toISOString(),
        note: '',
        posterPath: null,
        rating: null,
        releaseDate: null
    };
    
    currentVault.movies.unshift(movieData);
    saveVaults();
    addMovieModal.classList.add('hidden');
    movieSearchInput.value = '';
    showNotification(`"${movieTitle}" added to vault!`, 'success');
    showVaultDetail(currentVault.id);
    
    // Open note editor for the new movie
    setTimeout(() => {
        openNoteEditor(movieId, movieTitle, currentVault.id);
    }, 500);
}

function openNoteEditor(movieId, movieTitle, vaultId) {
    noteMovieId.value = movieId;
    noteVaultId.value = vaultId;
    noteMovieTitle.textContent = movieTitle;
    
    // Load existing note if any
    const vault = vaults.find(v => v.id === vaultId);
    const movie = vault.movies.find(m => m.id === movieId);
    movieNote.value = movie.note || '';
    updateNoteCount();
    
    noteEditorModal.classList.remove('hidden');
}

function handleNoteSave(e) {
    e.preventDefault();
    
    const movieId = parseInt(noteMovieId.value);
    const vaultId = noteVaultId.value;
    const note = movieNote.value.trim();
    
    const vault = vaults.find(v => v.id === vaultId);
    const movie = vault.movies.find(m => m.id === movieId);
    
    if (movie) {
        movie.note = note;
        movie.noteDate = new Date().toISOString();
        saveVaults();
        noteEditorModal.classList.add('hidden');
        showNotification('Note saved successfully!', 'success');
        showVaultDetail(vaultId);
    }
}

function loadVaults() {
    if (vaults.length === 0) {
        emptyState.classList.remove('hidden');
        vaultsGrid.classList.add('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    vaultsGrid.classList.remove('hidden');
    renderVaultsGrid();
}

function renderVaultsGrid() {
    vaultsGrid.innerHTML = vaults.map(vault => `
        <div class="bg-gray-800 rounded-lg shadow-md vault-card overflow-hidden cursor-pointer" 
             onclick="showVaultDetail('${vault.id}')">
            <div class="h-48 bg-gradient-to-br from-emerald-500 to-teal-600 relative">
                ${vault.movies.length > 0 ? `
                    <div class="absolute inset-0 grid grid-cols-2 gap-1 p-2">
                        ${vault.movies.slice(0, 4).map(movie => `
                            <img src="${movie.posterPath ? IMG_URL + movie.posterPath : './images/placeholder.jpg'}" 
                                 alt="${movie.title}" 
                                 class="w-full h-full object-cover rounded"
                                 onerror="this.src='./images/placeholder.jpg'">
                        `).join('')}
                    </div>
                ` : `
                    <div class="absolute inset-0 flex items-center justify-center">
                        <i class="fas fa-film text-6xl text-white opacity-50"></i>
                    </div>
                `}
                <div class="absolute top-3 right-3">
                    <span class="text-xs px-2 py-1 rounded-full ${getPrivacyBadgeClass(vault.privacy)}">
                        <i class="${getPrivacyIcon(vault.privacy)} mr-1"></i>
                        ${vault.privacy.charAt(0).toUpperCase() + vault.privacy.slice(1)}
                    </span>
                </div>
            </div>
            
            <div class="p-6">
                <h3 class="font-bold text-xl mb-2 text-white">${vault.name}</h3>
                <p class="text-gray-400 mb-4 line-clamp-2">${vault.description || 'No description'}</p>
                
                <div class="flex justify-between items-center text-sm text-gray-400 mb-4">
                    <span>${vault.movies.length} movie${vault.movies.length !== 1 ? 's' : ''}</span>
                    <span>${formatDate(vault.createdDate)}</span>
                </div>
                
                <div class="flex justify-between items-center">
                    <div class="flex -space-x-2">
                        ${vault.collaborators.slice(0, 3).map(collab => `
                            <div class="collaborator-avatar bg-gray-400 flex items-center justify-center text-white text-xs font-semibold" 
                                 title="${collab.name}">
                                ${collab.name.charAt(0).toUpperCase()}
                            </div>
                        `).join('')}
                        ${vault.collaborators.length > 3 ? `
                            <div class="collaborator-avatar bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-semibold">
                                +${vault.collaborators.length - 3}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="flex items-center gap-4 text-gray-500">
                        <span class="flex items-center gap-1">
                            <i class="fas fa-eye"></i> ${vault.views}
                        </span>
                        <span class="flex items-center gap-1">
                            <i class="fas fa-sticky-note"></i> ${vault.movies.filter(m => m.note).length}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function showVaultDetail(vaultId) {
    currentVault = vaults.find(v => v.id === vaultId);
    if (!currentVault) return;
    
    // Update view count
    currentVault.views++;
    saveVaults();
    
    // Update UI
    detailVaultName.textContent = currentVault.name;
    detailVaultDescription.textContent = currentVault.description || 'No description';
    
    // Update stats
    document.getElementById('vaultMovieCount').textContent = currentVault.movies.length;
    document.getElementById('vaultNoteCount').textContent = currentVault.movies.filter(m => m.note).length;
    document.getElementById('vaultViewCount').textContent = currentVault.views;
    document.getElementById('vaultCollaborators').textContent = currentVault.collaborators.length;
    
    // Show/hide empty state
    if (currentVault.movies.length === 0) {
        vaultMoviesGrid.classList.add('hidden');
        emptyVaultState.classList.remove('hidden');
    } else {
        vaultMoviesGrid.classList.remove('hidden');
        emptyVaultState.classList.add('hidden');
        renderVaultMovies();
    }
    
    vaultsGrid.classList.add('hidden');
    vaultDetailView.classList.remove('hidden');
}

function renderVaultMovies() {
    vaultMoviesGrid.innerHTML = currentVault.movies.map(movie => `
        <div class="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div class="flex">
                <img src="${movie.posterPath ? IMG_URL + movie.posterPath : './images/placeholder.jpg'}" 
                     alt="${movie.title}" 
                     class="w-24 h-32 object-cover"
                     onerror="this.src='./images/placeholder.jpg'">
                
                <div class="flex-1 p-4">
                    <div class="flex justify-between items-start mb-2">
                        <h4 class="font-semibold text-lg text-gray-800">${movie.title}</h4>
                        <div class="flex gap-2">
                            <button onclick="openNoteEditor(${movie.id}, '${movie.title.replace(/'/g, "\\'")}', '${currentVault.id}')" 
                                    class="text-blue-600 hover:text-blue-800 text-sm">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="removeMovieFromVault(${movie.id})" 
                                    class="text-red-600 hover:text-red-800 text-sm">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="text-sm text-gray-600 mb-3">
                        Added: ${formatDate(movie.addedDate)}
                        ${movie.noteDate ? ` • Note: ${formatDate(movie.noteDate)}` : ''}
                    </div>
                    
                    ${movie.note ? `
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-100">
                            <p class="text-sm text-gray-700 line-clamp-3">${movie.note}</p>
                        </div>
                    ` : `
                        <button onclick="openNoteEditor(${movie.id}, '${movie.title.replace(/'/g, "\\'")}', '${currentVault.id}')" 
                                class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                            <i class="fas fa-plus"></i> Add a note
                        </button>
                    `}
                </div>
            </div>
        </div>
    `).join('');
}

function showVaultsGrid() {
    vaultDetailView.classList.add('hidden');
    vaultsGrid.classList.remove('hidden');
    loadVaults();
}

function showAddMovieModal() {
    currentVaultName.textContent = currentVault.name;
    movieSearchResults.innerHTML = `
        <div class="text-center py-8 text-gray-500">
            <i class="fas fa-search text-4xl mb-4"></i>
            <p>Search for movies to add to your vault</p>
        </div>
    `;
    addMovieModal.classList.remove('hidden');
}

function toggleShareDropdown() {
    shareDropdown.classList.toggle('show');
}

function handleShareAction(action) {
    const vaultUrl = `${window.location.origin}${window.location.pathname}?vault=${currentVault.id}`;
    
    switch (action) {
        case 'copy-link':
            navigator.clipboard.writeText(vaultUrl).then(() => {
                showNotification('Vault link copied to clipboard!', 'success');
            });
            break;
        case 'social':
            // Simple social sharing (can be enhanced with proper social media APIs)
            const text = `Check out my "${currentVault.name}" movie vault on CineVault!`;
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(vaultUrl)}`, '_blank');
            break;
        case 'collaborate':
            const collaborator = prompt('Enter collaborator email or username:');
            if (collaborator) {
                addCollaborator(collaborator);
            }
            break;
    }
    
    shareDropdown.classList.remove('show');
}

function addCollaborator(collaboratorName) {
    if (!currentVault.collaborators.some(c => c.name === collaboratorName)) {
        currentVault.collaborators.push({
            name: collaboratorName,
            addedDate: new Date().toISOString()
        });
        saveVaults();
        showNotification(`Added ${collaboratorName} as collaborator!`, 'success');
        showVaultDetail(currentVault.id);
    } else {
        showNotification(`${collaboratorName} is already a collaborator`, 'info');
    }
}

function editCurrentVault() {
    const newName = prompt('Enter new vault name:', currentVault.name);
    if (newName && newName.trim().length >= 3) {
        currentVault.name = newName.trim();
        const newDescription = prompt('Enter new description:', currentVault.description);
        if (newDescription !== null) {
            currentVault.description = newDescription.trim();
        }
        saveVaults();
        showVaultDetail(currentVault.id);
        showNotification('Vault updated successfully!', 'success');
    }
}

function deleteCurrentVault() {
    if (confirm(`Are you sure you want to delete "${currentVault.name}"? This action cannot be undone.`)) {
        vaults = vaults.filter(v => v.id !== currentVault.id);
        saveVaults();
        showVaultsGrid();
        showNotification('Vault deleted successfully!', 'success');
    }
}

function removeMovieFromVault(movieId) {
    if (confirm('Remove this movie from the vault?')) {
        currentVault.movies = currentVault.movies.filter(m => m.id !== movieId);
        saveVaults();
        showVaultDetail(currentVault.id);
        showNotification('Movie removed from vault', 'success');
    }
}

function getPrivacyBadgeClass(privacy) {
    const classes = {
        private: 'bg-red-100 text-red-800',
        public: 'bg-green-100 text-green-800',
        shared: 'bg-blue-100 text-blue-800'
    };
    return classes[privacy] || 'bg-gray-100 text-gray-800';
}

function getPrivacyIcon(privacy) {
    const icons = {
        private: 'fas fa-lock',
        public: 'fas fa-globe',
        shared: 'fas fa-users'
    };
    return icons[privacy] || 'fas fa-question';
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function saveVaults() {
    localStorage.setItem('vaults', JSON.stringify(vaults));
    loadVaults();
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
window.showVaultDetail = showVaultDetail;
window.openNoteEditor = openNoteEditor;
window.removeMovieFromVault = removeMovieFromVault;
window.addMovieToVault = addMovieToVault;