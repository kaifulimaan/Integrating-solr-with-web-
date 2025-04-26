const API_URL = 'http://localhost:8000';

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const suggestionsContainer = document.getElementById('suggestions-container');
const resultsContainer = document.getElementById('results-container');
const categoryFilters = document.getElementById('category-filters');
const authorFilters = document.getElementById('author-filters');
const applyFiltersButton = document.getElementById('apply-filters-button');
const loadingElement = document.getElementById('loading');

// Current search state
let currentSearchParams = {
    q: '',
    category: '',
    author: '',
    published: '',
    page: 0
};

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    loadFilters();
    performSearch();
    
    // Setup event listeners
    searchInput.addEventListener('input', handleInputChange);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    searchButton.addEventListener('click', performSearch);
    applyFiltersButton.addEventListener('click', performSearch);
    
    // Close suggestions when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && e.target !== suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    });
});

async function loadFilters() {
    try {
        const response = await fetch(`${API_URL}/filters/`);
        const data = await response.json();
        
        // Populate category filters
        data.categories.forEach(category => {
            const div = document.createElement('div');
            div.className = 'filter-option';
            div.innerHTML = `
                <input type="radio" name="category" id="category-${category}" value="${category}">
                <label for="category-${category}">${category}</label>
            `;
            categoryFilters.appendChild(div);
        });
        
        // Add "All" option at the top
        const allCategoryDiv = document.createElement('div');
        allCategoryDiv.className = 'filter-option';
        allCategoryDiv.innerHTML = `
            <input type="radio" name="category" id="category-all" value="" checked>
            <label for="category-all">All</label>
        `;
        categoryFilters.insertBefore(allCategoryDiv, categoryFilters.firstChild);
        
        // Populate author filters
        data.authors.forEach(author => {
            const div = document.createElement('div');
            div.className = 'filter-option';
            div.innerHTML = `
                <input type="radio" name="author" id="author-${author.replace(/\s+/g, '-')}" value="${author}">
                <label for="author-${author.replace(/\s+/g, '-')}">${author}</label>
            `;
            authorFilters.appendChild(div);
        });
        
        // Add "All" option at the top
        const allAuthorDiv = document.createElement('div');
        allAuthorDiv.className = 'filter-option';
        allAuthorDiv.innerHTML = `
            <input type="radio" name="author" id="author-all" value="" checked>
            <label for="author-all">All</label>
        `;
        authorFilters.insertBefore(allAuthorDiv, authorFilters.firstChild);
        
    } catch (error) {
        console.error('Error loading filters:', error);
    }
}

// Handle input change for autocomplete
async function handleInputChange() {
    const query = searchInput.value.trim();
    
    if (query.length < 2) {
        suggestionsContainer.style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/suggest/?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.suggestions && data.suggestions.length > 0) {
            suggestionsContainer.innerHTML = '';
            
            data.suggestions.forEach(suggestion => {
                const div = document.createElement('div');
                div.className = 'suggestion-item';
                div.textContent = suggestion;
                div.addEventListener('click', () => {
                    searchInput.value = suggestion;
                    suggestionsContainer.style.display = 'none';
                    performSearch();
                });
                
                suggestionsContainer.appendChild(div);
            });
            
            suggestionsContainer.style.display = 'block';
        } else {
            suggestionsContainer.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        suggestionsContainer.style.display = 'none';
    }
}

// Perform search with current parameters
async function performSearch() {
    // Show loading
    loadingElement.style.display = 'block';
    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(loadingElement);
    
    // Update search parameters
    currentSearchParams.q = searchInput.value.trim();
    currentSearchParams.category = document.querySelector('input[name="category"]:checked')?.value || '';
    currentSearchParams.author = document.querySelector('input[name="author"]:checked')?.value || '';
    currentSearchParams.published = document.querySelector('input[name="published"]:checked')?.value || '';
    
    // Close suggestions
    suggestionsContainer.style.display = 'none';
    
    // Build query string
    let queryParams = [];
    for (const [key, value] of Object.entries(currentSearchParams)) {
        if (value) {
            queryParams.push(`${key}=${encodeURIComponent(value)}`);
        }
    }
    
    const queryString = queryParams.join('&');
    
    try {
        const response = await fetch(`${API_URL}/search/?${queryString}`);
        const data = await response.json();
        
        displayResults(data);
    } catch (error) {
        console.error('Error performing search:', error);
        resultsContainer.innerHTML = '<div class="no-results">An error occurred while searching. Please try again.</div>';
    }
}

// Display search results
function displayResults(data) {
    resultsContainer.innerHTML = '';
    
    if (!data.response || data.response.numFound === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No books found matching your search criteria.</div>';
        return;
    }
    
    const docs = data.response.docs;
    
    docs.forEach(book => {
        const bookElement = document.createElement('div');
        bookElement.className = 'book-card';
        
        bookElement.innerHTML = `
            <div class="book-title">${book.title}</div>
            <div class="book-author">by ${book.author}</div>
            <div>
                <span class="book-category">${book.category}</span>
                <span class="${book.published ? 'book-published' : 'book-unpublished'}">
                    ${book.published ? 'Published' : 'Unpublished'}
                </span>
            </div>
            <div class="book-id">ID: ${book.id}</div>
        `;
        
        resultsContainer.appendChild(bookElement);
    });
}