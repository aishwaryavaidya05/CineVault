const API_KEY = 'b360afc87de571f4399bf77d1e1af700';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let currentPage = 1;
let totalPages = 1;
let currentQuery = '';
let currentFilter = 'popular';
let currentMovieId = null;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const moviesContainer = document.getElementById('moviesContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const noResults = document.getElementById('noResults');
const loadMoreContainer = document.getElementById('loadMoreContainer');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const resultsHeader = document.getElementById('resultsHeader');
const resultsTitle = document.getElementById('resultsTitle');
const resultsCount = document.getElementById('resultsCount');

// Modal Elements
const modal = document.getElementById('movieDetailsModal');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalMovieTitle = document.getElementById('modalMovieTitle');
const modalMovieOverview = document.getElementById('modalMovieOverview');
const modalMovieReleaseDate = document.getElementById('modalMovieReleaseDate');
const modalMovieLanguage = document.getElementById('modalMovieLanguage');
const modalMovieRating = document.getElementById('modalMovieRating');
const modalMovieRuntime = document.getElementById('modalMovieRuntime');
const modalMoviePoster = document.getElementById('modalMoviePoster');
const modalMovieGenres = document.getElementById('modalMovieGenres');
const modalUserRating = document.getElementById('modalUserRating');

// Action Buttons
const addToWatchlistBtn = document.getElementById('addToWatchlistBtn');
const addToVaultBtn = document.getElementById('addToVaultBtn');
const rateReviewBtn = document.getElementById('rateReviewBtn');
const vaultSelect = document.getElementById('vaultSelect');
const ratingStars = document.getElementById('ratingStars');
const reviewTextarea = document.getElementById('reviewTextarea');
const submitReviewBtn = document.getElementById('submitReviewBtn');

// In discover.js - Replace the STORAGE_KEYS constant
const STORAGE_KEYS = {
    WATCHLIST: 'watchlist', // Changed from 'cinevault_watchlist' to match watchlist page
    VAULTS: 'cinevault_vaults',
    RATINGS: 'cinevault_ratings',
    REVIEWS: 'cinevault_reviews'
};

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadMoviesByFilter('popular');
    setupEventListeners();
    initializeLocalStorage();
    populateVaultSelect();
});

function setupEventListeners() {
    // Search button click
    searchButton.addEventListener('click', performSearch);
    
    // Enter key in search input
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            currentFilter = filter;
            currentQuery = '';
            searchInput.value = '';
            currentPage = 1;
            loadMoviesByFilter(filter);
            
            // Update active filter button
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-gray-700', 'text-white');
            });
            this.classList.remove('bg-gray-700');
            this.classList.add('bg-blue-600');
        });
    });

    // Load more button
    loadMoreBtn.addEventListener('click', loadMoreMovies);

    // Modal close button
    modalCloseBtn.addEventListener('click', closeModal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Add to Watchlist functionality
    addToWatchlistBtn.addEventListener('click', toggleWatchlist);
    
    // Add to Vault functionality
    addToVaultBtn.addEventListener('click', function() {
        if (!this.classList.contains('active')) {
            this.classList.add('active');
            vaultSelect.classList.remove('hidden');
        } else {
            this.classList.remove('active');
            vaultSelect.classList.add('hidden');
        }
    });
    
    // Handle vault selection
    vaultSelect.addEventListener('change', handleVaultSelection);
    
    // Rate and Review functionality
    rateReviewBtn.addEventListener('click', function() {
        if (!this.classList.contains('active')) {
            this.classList.add('active');
            ratingStars.classList.remove('hidden');
            reviewTextarea.classList.remove('hidden');
            submitReviewBtn.classList.remove('hidden');
            
            // Load existing rating and review if available
            const userData = getUserMovieData(currentMovieId);
            if (userData.rating) {
                setStarRating(userData.rating);
            }
            if (userData.review) {
                reviewTextarea.value = userData.review;
            }
        } else {
            this.classList.remove('active');
            ratingStars.classList.add('hidden');
            reviewTextarea.classList.add('hidden');
            submitReviewBtn.classList.add('hidden');
        }
    });
    
    // Star rating functionality
    const stars = ratingStars.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = this.getAttribute('data-rating');
            setStarRating(rating);
        });
    });
    
    // Submit review
    submitReviewBtn.addEventListener('click', submitReview);
}

function initializeLocalStorage() {
    // Initialize storage if it doesn't exist
    if (!localStorage.getItem(STORAGE_KEYS.WATCHLIST)) {
        localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.VAULTS)) {
        const defaultVaults = [
            { id: 'favorites', name: 'Favorites', movies: [] },
            { id: 'action', name: 'Action Movies', movies: [] },
            { id: 'comedy', name: 'Comedy Movies', movies: [] },
            { id: 'drama', name: 'Drama Movies', movies: [] }
        ];
        localStorage.setItem(STORAGE_KEYS.VAULTS, JSON.stringify(defaultVaults));
    }
    if (!localStorage.getItem(STORAGE_KEYS.RATINGS)) {
        localStorage.setItem(STORAGE_KEYS.RATINGS, JSON.stringify({}));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REVIEWS)) {
        localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify({}));
    }
}

function populateVaultSelect() {
    const vaults = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULTS));
    vaultSelect.innerHTML = '<option value="">Select a vault</option>';
    
    vaults.forEach(vault => {
        const option = document.createElement('option');
        option.value = vault.id;
        option.textContent = vault.name;
        vaultSelect.appendChild(option);
    });
    
    const newVaultOption = document.createElement('option');
    newVaultOption.value = 'new-vault';
    newVaultOption.textContent = 'Create New Vault';
    vaultSelect.appendChild(newVaultOption);
}

async function performSearch() {
    const query = searchInput.value.trim();
    if (query === '') return;

    currentQuery = query;
    currentFilter = '';
    currentPage = 1;
    
    await searchMovies(query, currentPage);
}

async function searchMovies(query, page = 1) {
    showLoading();
    
    try {
        const response = await fetch(
            `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&page=${page}&language=en-US`
        );
        const data = await response.json();
        
        hideLoading();
        displaySearchResults(data, query);
    } catch (error) {
        console.error('Error searching movies:', error);
        hideLoading();
        showError('Failed to search movies. Please try again.');
    }
}

async function loadMoviesByFilter(filter, page = 1) {
    showLoading();
    
    try {
        const response = await fetch(
            `${BASE_URL}/movie/${filter}?api_key=${API_KEY}&page=${page}&language=en-US`
        );
        const data = await response.json();
        
        hideLoading();
        displayFilterResults(data, filter);
    } catch (error) {
        console.error('Error loading movies:', error);
        hideLoading();
        showError('Failed to load movies. Please try again.');
    }
}

function displaySearchResults(data, query) {
    const movies = data.results;
    totalPages = data.total_pages;
    
    if (currentPage === 1) {
        moviesContainer.innerHTML = '';
    }
    
    if (movies.length === 0 && currentPage === 1) {
        showNoResults();
        return;
    }
    
    hideNoResults();
    
    // Update results header
    if (currentPage === 1) {
        resultsTitle.textContent = `Search Results for "${query}"`;
        resultsCount.textContent = `Found ${data.total_results} movies`;
        resultsHeader.classList.remove('hidden');
    }
    
    displayMovies(movies);
    updateLoadMoreButton();
}

function displayFilterResults(data, filter) {
    const movies = data.results;
    totalPages = data.total_pages;
    
    if (currentPage === 1) {
        moviesContainer.innerHTML = '';
    }
    
    // Update results header
    if (currentPage === 1) {
        const filterTitles = {
            popular: 'Popular Movies',
            top_rated: 'Top Rated Movies',
            upcoming: 'Upcoming Movies',
            now_playing: 'Now Playing'
        };
        
        resultsTitle.textContent = filterTitles[filter];
        resultsCount.textContent = `Page ${currentPage} of ${totalPages}`;
        resultsHeader.classList.remove('hidden');
    }
    
    displayMovies(movies);
    updateLoadMoreButton();
}

function displayMovies(movies) {
    movies.forEach(movie => {
        const movieCard = createMovieCard(movie);
        moviesContainer.innerHTML += movieCard;
    });
    
    // Add event listeners to the new "View Details" buttons
    document.querySelectorAll('.view-details-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const movieId = this.getAttribute('data-movie-id');
            openMovieDetails(movieId);
        });
    });
}

function createMovieCard(movie) {
    const posterUrl = movie.poster_path ? IMG_URL + movie.poster_path : '';
    const releaseYear = movie.release_date ? movie.release_date.substring(0, 4) : 'TBA';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'NR';
    const overview = movie.overview ? movie.overview.substring(0, 120) + '...' : 'No description available.';
    
    return `
        <div class="movie-card">
            <div class="movie-poster">
                ${posterUrl ? 
                    `<img src="${posterUrl}" alt="${movie.title}" class="w-full h-full object-cover">` : 
                    `<i class="fas fa-film text-4xl"></i>`
                }
            </div>
            <div class="movie-content">
                <h3 class="movie-title">${movie.title}</h3>
                <div class="movie-meta">
                    <span>${releaseYear}</span>
                    <span>${movie.original_language ? movie.original_language.toUpperCase() : 'EN'}</span>
                </div>
                <p class="movie-description">${overview}</p>
                <button class="view-details-btn" data-movie-id="${movie.id}">
                    View Details
                </button>
            </div>
        </div>
    `;
}

async function openMovieDetails(movieId) {
    showLoading();
    currentMovieId = movieId;
    
    try {
        // Fetch detailed movie information
        const response = await fetch(
            `${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=en-US`
        );
        const movie = await response.json();
        
        hideLoading();
        
        // Populate modal with movie data
        modalMovieTitle.textContent = movie.title;
        modalMovieOverview.textContent = movie.overview || 'No overview available.';
        modalMovieReleaseDate.textContent = movie.release_date || 'TBA';
        modalMovieLanguage.textContent = movie.original_language ? movie.original_language.toUpperCase() : 'EN';
        modalMovieRating.textContent = movie.vote_average ? `${movie.vote_average.toFixed(1)}/10` : 'Not rated';
        modalMovieRuntime.textContent = movie.runtime ? `${movie.runtime} min` : 'TBA';
        
        // Set poster image
        if (movie.poster_path) {
            modalMoviePoster.innerHTML = `<img src="${IMG_URL}${movie.poster_path}" alt="${movie.title}" class="w-full h-full object-cover">`;
        } else {
            modalMoviePoster.innerHTML = '<i class="fas fa-film text-6xl"></i>';
        }
        
        // Set genres
        modalMovieGenres.innerHTML = '';
        if (movie.genres && movie.genres.length > 0) {
            movie.genres.forEach(genre => {
                const genreTag = document.createElement('span');
                genreTag.className = 'genre-tag';
                genreTag.textContent = genre.name;
                modalMovieGenres.appendChild(genreTag);
            });
        }
        
        // Load user data
        const userData = getUserMovieData(movieId);
        if (userData.rating) {
            modalUserRating.textContent = `Your Rating: ${userData.rating}/5`;
            modalUserRating.classList.remove('hidden');
        } else {
            modalUserRating.classList.add('hidden');
        }
        
        // Update action buttons based on user data
        updateActionButtons(movieId);
        
        // Show modal
        modal.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error fetching movie details:', error);
        hideLoading();
        showError('Failed to load movie details. Please try again.');
    }
}

function closeModal() {
    modal.classList.add('hidden');
    resetActionButtons();
}

function getUserMovieData(movieId) {
    const ratings = JSON.parse(localStorage.getItem(STORAGE_KEYS.RATINGS) || '{}');
    const reviews = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS) || '{}');
    const watchlist = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCHLIST) || '[]');
    
    const isInWatchlist = watchlist.some(item => 
        typeof item === 'object' ? item.id === movieId : item === movieId.toString()
    );
    
    return {
        isInWatchlist: isInWatchlist,
        rating: ratings[movieId] || null,
        review: reviews[movieId] || ''
    };
}
// In discover.js - Update the updateActionButtons function
function updateActionButtons(movieId) {
    const userData = getUserMovieData(movieId);
    
    // Update watchlist button
    const watchlist = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCHLIST) || '[]');
    const isInWatchlist = watchlist.some(item => 
        typeof item === 'object' ? item.id === movieId : item === movieId.toString()
    );
    
    if (isInWatchlist) {
        addToWatchlistBtn.classList.add('active');
        addToWatchlistBtn.innerHTML = '<i class="fas fa-check"></i><span>In Watchlist</span>';
    } else {
        addToWatchlistBtn.classList.remove('active');
        addToWatchlistBtn.innerHTML = '<i class="fas fa-bookmark"></i><span>Add to Watchlist</span>';
    }
    
    // Reset other buttons
    addToVaultBtn.classList.remove('active');
    vaultSelect.classList.add('hidden');
    vaultSelect.value = '';
    
    rateReviewBtn.classList.remove('active');
    ratingStars.classList.add('hidden');
    reviewTextarea.classList.add('hidden');
    submitReviewBtn.classList.add('hidden');
}


// In discover.js - Replace the toggleWatchlist function
// In discover.js - Update the toggleWatchlist function
function toggleWatchlist() {
    if (!currentMovieId) return;
    
    let watchlist = JSON.parse(localStorage.getItem(STORAGE_KEYS.WATCHLIST) || '[]');
    const movieIdStr = currentMovieId.toString();
    
    // Get the poster path from the modal
    const posterImg = modalMoviePoster.querySelector('img');
    const posterPath = posterImg ? posterImg.src.replace(IMG_URL, '') : null;
    
    if (this.classList.contains('active')) {
        // Remove from watchlist
        watchlist = watchlist.filter(item => item.id !== currentMovieId);
        this.classList.remove('active');
        this.innerHTML = '<i class="fas fa-bookmark"></i><span>Add to Watchlist</span>';
        showNotification('Removed from watchlist');
    } else {
        // Add to watchlist with proper structure
        const movieData = {
            id: currentMovieId,
            type: 'movie',
            title: modalMovieTitle.textContent,
            addedDate: new Date().toISOString(),
            watched: false,
            posterPath: posterPath // Store the poster path
        };
        watchlist.unshift(movieData);
        this.classList.add('active');
        this.innerHTML = '<i class="fas fa-check"></i><span>In Watchlist</span>';
        showNotification('Added to watchlist');
    }
    
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
}

function handleVaultSelection() {
    if (this.value === 'new-vault') {
        const vaultName = prompt('Enter name for new vault:');
        if (vaultName && vaultName.trim() !== '') {
            createNewVault(vaultName.trim());
        }
        this.value = '';
    } else if (this.value) {
        addMovieToVault(this.value);
    }
}

function createNewVault(vaultName) {
    const vaults = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULTS));
    const newVault = {
        id: vaultName.toLowerCase().replace(/\s+/g, '-'),
        name: vaultName,
        movies: []
    };
    
    vaults.push(newVault);
    localStorage.setItem(STORAGE_KEYS.VAULTS, JSON.stringify(vaults));
    
    // Update the vault select dropdown
    populateVaultSelect();
    
    // Select the new vault
    vaultSelect.value = newVault.id;
    addMovieToVault(newVault.id);
}

function addMovieToVault(vaultId) {
    if (!currentMovieId) return;
    
    const vaults = JSON.parse(localStorage.getItem(STORAGE_KEYS.VAULTS));
    const vault = vaults.find(v => v.id === vaultId);
    
    if (vault) {
        const movieIdStr = currentMovieId.toString();
        if (!vault.movies.includes(movieIdStr)) {
            vault.movies.push(movieIdStr);
            localStorage.setItem(STORAGE_KEYS.VAULTS, JSON.stringify(vaults));
            showNotification(`Added to ${vault.name} vault`);
        } else {
            showNotification('Movie already in this vault');
        }
        
        addToVaultBtn.classList.remove('active');
        vaultSelect.classList.add('hidden');
        vaultSelect.value = '';
    }
}

function setStarRating(rating) {
    const stars = ratingStars.querySelectorAll('.star');
    stars.forEach(star => {
        if (star.getAttribute('data-rating') <= rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function submitReview() {
    const activeStars = ratingStars.querySelectorAll('.star.active');
    const rating = activeStars.length;
    const review = reviewTextarea.value.trim();
    
    if (rating > 0) {
        // Save rating
        const ratings = JSON.parse(localStorage.getItem(STORAGE_KEYS.RATINGS));
        ratings[currentMovieId] = rating;
        localStorage.setItem(STORAGE_KEYS.RATINGS, JSON.stringify(ratings));
        
        // Save review
        const reviews = JSON.parse(localStorage.getItem(STORAGE_KEYS.REVIEWS));
        reviews[currentMovieId] = review;
        localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
        
        // Update UI
        modalUserRating.textContent = `Your Rating: ${rating}/5`;
        modalUserRating.classList.remove('hidden');
        
        showNotification('Review submitted successfully!');
        
        // Reset review section
        rateReviewBtn.classList.remove('active');
        ratingStars.classList.add('hidden');
        reviewTextarea.classList.add('hidden');
        submitReviewBtn.classList.add('hidden');
    } else {
        showNotification('Please select a rating before submitting.', 'error');
    }
}

function resetActionButtons() {
    addToWatchlistBtn.classList.remove('active');
    addToWatchlistBtn.innerHTML = '<i class="fas fa-bookmark"></i><span>Add to Watchlist</span>';
    
    addToVaultBtn.classList.remove('active');
    vaultSelect.classList.add('hidden');
    vaultSelect.value = '';
    
    rateReviewBtn.classList.remove('active');
    ratingStars.classList.add('hidden');
    reviewTextarea.classList.add('hidden');
    submitReviewBtn.classList.add('hidden');
    
    // Reset stars and textarea
    const stars = ratingStars.querySelectorAll('.star');
    stars.forEach(star => {
        star.classList.remove('active');
    });
    reviewTextarea.value = '';
}

function showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg text-white ${
        type === 'error' ? 'bg-red-500' : 'bg-green-500'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

async function loadMoreMovies() {
    currentPage++;
    
    if (currentQuery) {
        await searchMovies(currentQuery, currentPage);
    } else {
        await loadMoviesByFilter(currentFilter, currentPage);
    }
}

function updateLoadMoreButton() {
    if (currentPage < totalPages) {
        loadMoreContainer.classList.remove('hidden');
    } else {
        loadMoreContainer.classList.add('hidden');
    }
    
    // Update results count for filter
    if (!currentQuery && resultsCount) {
        resultsCount.textContent = `Page ${currentPage} of ${totalPages}`;
    }
}

function showLoading() {
    loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function showNoResults() {
    noResults.classList.remove('hidden');
    moviesContainer.innerHTML = '';
    resultsHeader.classList.add('hidden');
    loadMoreContainer.classList.add('hidden');
}

function hideNoResults() {
    noResults.classList.add('hidden');
}

function showError(message) {
    showNotification(message, 'error');
}