const API_KEY = 'b360afc87de571f4399bf77d1e1af700';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

async function fetchMovies() {
  try {
    const response = await fetch(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=1`);
    const data = await response.json();
    displayMovies(data.results);
  } catch (error) {
    console.error('Error fetching movies:', error);
  }
}

function displayMovies(movies) {
  const container = document.getElementById('moviesContainer');
  container.innerHTML = ''; // Clear previous results
  movies.forEach(movie => {
    const movieCard = `
      <div class="movie-card bg-white rounded-lg shadow-md overflow-hidden">
        <img src="${movie.poster_path ? IMG_URL + movie.poster_path : './images/placeholder.jpg'}" 
             alt="${movie.title}" 
             class="w-full h-64 object-cover">
        <div class="p-4">
          <h3 class="font-bold text-lg mb-2">${movie.title}</h3>
          <p class="text-gray-600 text-sm mb-2">${movie.release_date ? movie.release_date.substring(0,4) : 'TBA'}</p>
          <p class="text-gray-700 text-sm">${movie.overview ? movie.overview.substring(0, 100) + '...' : 'No description available.'}</p>
          <button onclick="openMovieDetails(${movie.id})" 
                  class="mt-3 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm">
            View Details
          </button>
        </div>
      </div>
    `;
    container.innerHTML += movieCard;
  });
}

function openMovieDetails(movieId) {
  // You'll implement this later
  alert(`Movie ID: ${movieId} - Details feature coming soon!`);
}

// Fetch movies when the page loads
document.addEventListener('DOMContentLoaded', fetchMovies);