const API_KEY = 'b360afc87de571f4399bf77d1e1af700';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// DOM Elements
const findMovieBtn = document.getElementById('findMovieBtn');
const myReviewsBtn = document.getElementById('myReviewsBtn');
const searchModal = document.getElementById('searchModal');
const closeModal = document.getElementById('closeModal');
const movieSearchInput = document.getElementById('movieSearchInput');
const searchResults = document.getElementById('searchResults');
const reviewModal = document.getElementById('reviewModal');
const closeReviewModal = document.getElementById('closeReviewModal');
const cancelReview = document.getElementById('cancelReview');
const reviewForm = document.getElementById('reviewForm');
const reviewMovieTitle = document.getElementById('reviewMovieTitle');
const reviewMovieId = document.getElementById('reviewMovieId');
const ratingValue = document.getElementById('ratingValue');
const reviewTitle = document.getElementById('reviewTitle');
const reviewText = document.getElementById('reviewText');
const titleCount = document.getElementById('titleCount');
const reviewCount = document.getElementById('reviewCount');
const startReviewingBtn = document.getElementById('startReviewingBtn');
const myReviewsList = document.getElementById('myReviewsList');
const sortReviews = document.getElementById('sortReviews');
const filterReviews = document.getElementById('filterReviews');

// State
let currentMovie = null;
let userReviews = JSON.parse(localStorage.getItem('userReviews')) || [];
let sortOrder = 'newest';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadUserReviews();
    updateReviewStats();
});

function setupEventListeners() {
    // Modal controls
    findMovieBtn.addEventListener('click', () => searchModal.classList.remove('hidden'));
    closeModal.addEventListener('click', () => searchModal.classList.add('hidden'));
    closeReviewModal.addEventListener('click', () => reviewModal.classList.add('hidden'));
    cancelReview.addEventListener('click', () => reviewModal.classList.add('hidden'));
    
    // Search functionality
    movieSearchInput.addEventListener('input', debounce(handleMovieSearch, 500));
    
    // Star rating
    document.querySelectorAll('.star-rating input').forEach(star => {
        star.addEventListener('change', updateRatingDisplay);
    });
    
    // Character counters
    reviewTitle.addEventListener('input', updateTitleCount);
    reviewText.addEventListener('input', updateReviewCount);
    
    // Form submission
    reviewForm.addEventListener('submit', handleReviewSubmit);
    
    // Other buttons
    startReviewingBtn.addEventListener('click', () => searchModal.classList.remove('hidden'));
    myReviewsBtn.addEventListener('click', scrollToMyReviews);
    sortReviews.addEventListener('click', toggleSortOrder);
    filterReviews.addEventListener('click', showFilterOptions);
    
    // Close modals on outside click
    searchModal.addEventListener('click', (e) => {
        if (e.target === searchModal) searchModal.classList.add('hidden');
    });
    reviewModal.addEventListener('click', (e) => {
        if (e.target === reviewModal) reviewModal.classList.add('hidden');
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

async function handleMovieSearch() {
    const query = movieSearchInput.value.trim();
    
    if (query.length < 2) {
        searchResults.innerHTML = `
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
        displaySearchResults(data.results);
    } catch (error) {
        console.error('Error searching movies:', error);
        searchResults.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <p>Failed to search movies. Please try again.</p>
            </div>
        `;
    }
}

function displaySearchResults(movies) {
    if (movies.length === 0) {
        searchResults.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-search text-4xl mb-4"></i>
                <p>No movies found. Try different keywords.</p>
            </div>
        `;
        return;
    }
    
    searchResults.innerHTML = movies.map(movie => `
        <div class="flex items-center gap-4 p-4 border-b hover:bg-gray-50 cursor-pointer transition duration-200" 
             onclick="selectMovieForReview(${movie.id}, '${movie.title.replace(/'/g, "\\'")}')">
            <img src="${movie.poster_path ? IMG_URL + movie.poster_path : './images/placeholder.jpg'}" 
                 alt="${movie.title}" 
                 class="w-16 h-20 object-cover rounded"
                 onerror="this.src='./images/placeholder.jpg'">
            <div class="flex-1">
                <h4 class="font-semibold text-gray-800">${movie.title}</h4>
                <p class="text-sm text-gray-600">${movie.release_date ? movie.release_date.substring(0, 4) : 'TBA'}</p>
                <p class="text-sm text-gray-500 line-clamp-2">${movie.overview || 'No description available.'}</p>
            </div>
            <i class="fas fa-chevron-right text-gray-400"></i>
        </div>
    `).join('');
}

function selectMovieForReview(movieId, movieTitle) {
    currentMovie = { id: movieId, title: movieTitle };
    reviewMovieId.value = movieId;
    reviewMovieTitle.textContent = `Review: ${movieTitle}`;
    
    // Check if user already reviewed this movie
    const existingReview = userReviews.find(review => review.movieId === movieId);
    if (existingReview) {
        populateExistingReview(existingReview);
    } else {
        resetReviewForm();
    }
    
    searchModal.classList.add('hidden');
    reviewModal.classList.remove('hidden');
}

function populateExistingReview(review) {
    document.querySelector(`input[name="rating"][value="${review.rating}"]`).checked = true;
    updateRatingDisplay();
    reviewTitle.value = review.title;
    reviewText.value = review.text;
    document.getElementById('spoilerWarning').checked = review.spoiler;
    updateTitleCount();
    updateReviewCount();
}

function resetReviewForm() {
    reviewForm.reset();
    updateRatingDisplay();
    updateTitleCount();
    updateReviewCount();
}

function updateRatingDisplay() {
    const selectedRating = document.querySelector('input[name="rating"]:checked');
    if (selectedRating) {
        const rating = selectedRating.value;
        ratingValue.textContent = `${rating} star${rating > 1 ? 's' : ''} (${getRatingText(rating)})`;
        ratingValue.className = 'text-sm font-semibold mt-2 ' + 
            (rating >= 4 ? 'text-green-600' : rating >= 3 ? 'text-yellow-600' : 'text-red-600');
    } else {
        ratingValue.textContent = 'Select a rating';
        ratingValue.className = 'text-sm text-gray-600 mt-2';
    }
}

function getRatingText(rating) {
    const ratings = {
        1: 'Poor',
        2: 'Fair',
        3: 'Good',
        4: 'Very Good',
        5: 'Excellent'
    };
    return ratings[rating] || '';
}

function updateTitleCount() {
    titleCount.textContent = reviewTitle.value.length;
}

function updateReviewCount() {
    reviewCount.textContent = reviewText.value.length;
}

function handleReviewSubmit(e) {
    e.preventDefault();
    
    const rating = document.querySelector('input[name="rating"]:checked');
    if (!rating) {
        alert('Please select a rating');
        return;
    }
    
    const reviewData = {
        movieId: currentMovie.id,
        movieTitle: currentMovie.title,
        rating: parseInt(rating.value),
        title: reviewTitle.value.trim(),
        text: reviewText.value.trim(),
        spoiler: document.getElementById('spoilerWarning').checked,
        date: new Date().toISOString(),
        id: Date.now() // Simple ID generation
    };
    
    // Validate review
    if (reviewData.title.length < 5) {
        alert('Please enter a review title with at least 5 characters');
        return;
    }
    
    if (reviewData.text.length < 20) {
        alert('Please write a review with at least 20 characters');
        return;
    }
    
    // Save review
    const existingIndex = userReviews.findIndex(review => review.movieId === currentMovie.id);
    if (existingIndex > -1) {
        userReviews[existingIndex] = reviewData;
    } else {
        userReviews.push(reviewData);
    }
    
    localStorage.setItem('userReviews', JSON.stringify(userReviews));
    
    // Show success message
    showNotification('Review submitted successfully!', 'success');
    
    // Close modal and refresh
    reviewModal.classList.add('hidden');
    loadUserReviews();
    updateReviewStats();
}

function loadUserReviews() {
      if (userReviews.length === 0) {
        myReviewsList.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <i class="fas fa-comments text-6xl mb-4"></i>
                <h3 class="text-xl font-semibold mb-2 text-gray-200">No reviews yet</h3>
                <p class="mb-4 text-gray-300">Start reviewing movies to see them here!</p>
                <button id="startReviewingBtn" class="startReviewingBtn">
                    Write Your First Review
                </button>
            </div>
        `;
        // Re-attach the event listener to the new button
        document.getElementById('startReviewingBtn').addEventListener('click', () => {
            searchModal.classList.remove('hidden');
        });
        return;
    }
    
    // Sort reviews
    const sortedReviews = [...userReviews].sort((a, b) => {
        if (sortOrder === 'newest') {
            return new Date(b.date) - new Date(a.date);
        } else {
            return new Date(a.date) - new Date(b.date);
        }
    });
    
    myReviewsList.innerHTML = sortedReviews.map(review => `
        <div class="bg-white rounded-lg shadow-md review-card p-6">
            <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                    <h3 class="font-bold text-lg text-gray-800">${review.movieTitle}</h3>
                    <div class="flex items-center gap-2 mt-1">
                        <div class="flex text-yellow-400">
                            ${'<i class="fas fa-star"></i>'.repeat(review.rating)}
                            ${review.rating % 1 !== 0 ? '<i class="fas fa-star-half-alt"></i>' : ''}
                        </div>
                        <span class="text-sm text-gray-600">${new Date(review.date).toLocaleDateString()}</span>
                        ${review.spoiler ? '<span class="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Spoilers</span>' : ''}
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="editReview(${review.id})" class="text-blue-600 hover:text-blue-800">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteReview(${review.id})" class="text-red-600 hover:text-red-800">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <h4 class="font-semibold text-gray-700 mb-2">${review.title}</h4>
            <p class="text-gray-600 mb-4">${review.text}</p>
            <div class="flex justify-between items-center">
                <div class="flex gap-4 text-sm text-gray-500">
                    <span class="flex items-center gap-1">
                        <i class="far fa-thumbs-up"></i> 0
                    </span>
                    <span class="flex items-center gap-1">
                        <i class="far fa-comment"></i> 0
                    </span>
                </div>
                <button onclick="shareReview(${review.id})" class="text-gray-500 hover:text-blue-600">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function editReview(reviewId) {
    const review = userReviews.find(r => r.id === reviewId);
    if (review) {
        currentMovie = { id: review.movieId, title: review.movieTitle };
        reviewMovieId.value = review.movieId;
        reviewMovieTitle.textContent = `Review: ${review.movieTitle}`;
        populateExistingReview(review);
        reviewModal.classList.remove('hidden');
    }
}

function deleteReview(reviewId) {
    if (confirm('Are you sure you want to delete this review?')) {
        userReviews = userReviews.filter(review => review.id !== reviewId);
        localStorage.setItem('userReviews', JSON.stringify(userReviews));
        loadUserReviews();
        updateReviewStats();
        showNotification('Review deleted successfully!', 'success');
    }
}

function shareReview(reviewId) {
    const review = userReviews.find(r => r.id === reviewId);
    if (review && navigator.share) {
        navigator.share({
            title: `My review of ${review.movieTitle}`,
            text: `I gave ${review.movieTitle} ${review.rating} stars on CineVault!`,
            url: window.location.href
        });
    } else {
        // Fallback: copy to clipboard
        const text = `I gave ${review.movieTitle} ${review.rating} stars on CineVault!\n\n"${review.title}"\n${review.text}`;
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Review copied to clipboard!', 'success');
        });
    }
}

function toggleSortOrder() {
    sortOrder = sortOrder === 'newest' ? 'oldest' : 'newest';
    sortReviews.innerHTML = `<i class="fas fa-sort mr-2"></i>Sort by ${sortOrder === 'newest' ? 'Oldest' : 'Newest'}`;
    loadUserReviews();
}

function showFilterOptions() {
    // Simple filter implementation - can be expanded
    const rating = prompt('Filter by minimum rating (1-5):');
    if (rating && !isNaN(rating) && rating >= 1 && rating <= 5) {
        const filteredReviews = userReviews.filter(review => review.rating >= parseInt(rating));
        if (filteredReviews.length === 0) {
            alert('No reviews match this filter');
        } else {
            // Temporary filter display
            alert(`Found ${filteredReviews.length} reviews with ${rating}+ stars`);
        }
    }
}

function updateReviewStats() {
    // This would update the statistics in the right column
    // Implementation depends on your specific stat requirements
}

function scrollToMyReviews() {
    document.getElementById('myReviewsSection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

function showNotification(message, type) {
    // Simple notification implementation
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg text-white font-semibold z-50 ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Export functions for global access
window.selectMovieForReview = selectMovieForReview;
window.editReview = editReview;
window.deleteReview = deleteReview;
window.shareReview = shareReview;