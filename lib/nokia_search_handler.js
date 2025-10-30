/**
 * Nokia Search Handler - Brave & Perplexity Integration
 * Handles web searches with progress updates for voice and text modes
 */

class NokiaSearchHandler {
    constructor() {
        this.searchActive = false;
        this.currentSearchType = null;
        this.progressCallback = null;
        this.BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';
        this.PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
        
        // Debug mode (set to true to see detailed logs)
        this.debugMode = false;
        
        // Rate limiting
        this.braveSearchCount = 0;
        this.lastBraveSearchTime = 0;
        this.BRAVE_COOLDOWN = 5000; // 5 seconds
        this.BRAVE_RATE_LIMIT = 5; // Max 5 queries per cooldown period
        
        // Callbacks
        this.onSearchProgress = null; // (message, type) => void
        this.onSearchComplete = null; // (results, searchType) => void
        this.onError = null; // (error) => void
    }

    /**
     * Search with Brave Search API
     * @param {string} query - Search query
     * @returns {Promise<Array>} - Search results
     */
    async searchBrave(query) {
        try {
            if (this.onSearchProgress) {
                this.onSearchProgress('🦁 Searching Brave...', 'brave');
            }

            const now = Date.now();
            const timeSinceLastSearch = now - this.lastBraveSearchTime;

            // Rate limit check
            if (timeSinceLastSearch < this.BRAVE_COOLDOWN && this.braveSearchCount >= this.BRAVE_RATE_LIMIT) {
                const waitTime = Math.ceil((this.BRAVE_COOLDOWN - timeSinceLastSearch) / 1000);
                throw new Error(`Rate limit: wait ${waitTime}s`);
            }

            // Reset counter if cooldown expired
            if (timeSinceLastSearch >= this.BRAVE_COOLDOWN) {
                this.braveSearchCount = 0;
            }

            const searchUrl = `${this.BRAVE_API_URL}?q=${encodeURIComponent(query)}&extra_snippets=true`;
            
            const response = await fetch('brave-search.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                throw new Error(`Brave API error: ${response.status}`);
            }

            // Update rate limiting trackers
            this.braveSearchCount++;
            this.lastBraveSearchTime = now;

            const data = await response.json();
            
            if (!data.web || !Array.isArray(data.web.results)) {
                return [];
            }

            if (this.onSearchProgress) {
                this.onSearchProgress(`✅ Found ${data.web.results.length} results`, 'brave');
            }

            return data.web.results.map(item => ({
                name: item.title,
                snippet: item.description,
                extraSnippets: item.extra_snippets || [],
                url: item.url
            }));

        } catch (error) {
            if (this.debugMode) {
                console.error('❌ Brave search error:', error);
            }
            if (this.onError) {
                this.onError('Brave: ' + error.message);
            }
            return [];
        }
    }

    /**
     * Search with Perplexity AI
     * @param {string} query - Search query
     * @returns {Promise<Array>} - Search results with AI synthesis
     */
    async searchPerplexity(query) {
        try {
            if (this.onSearchProgress) {
                this.onSearchProgress('🧠 Searching Perplexity...', 'perplexity');
            }

        const response = await fetch('perplexity-search.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                throw new Error(`Perplexity API error: ${response.status}`);
            }

            const data = await response.json();
            
            const content = data.choices?.[0]?.message?.content || "No content received.";
            const citations = Array.isArray(data.citations)
                ? data.citations.map(result => ({
                    name: result.title || result.name,
                    snippet: result.snippet || content.substring(0, 200),
                    url: result.url
                }))
                : [];

            if (this.onSearchProgress) {
                this.onSearchProgress(`✅ Perplexity response ready`, 'perplexity');
            }

            return citations.length > 0 ? citations : [{
                name: "Perplexity AI Summary",
                snippet: content,
                url: null,
                fullContent: content
            }];

        } catch (error) {
            if (this.debugMode) {
                console.error('❌ Perplexity search error:', error);
            }
            if (this.onError) {
                this.onError('Perplexity: ' + error.message);
            }
            return [];
        }
    }

    /**
     * Fetch full content from URLs
     * @param {Array} urls - Array of URLs to fetch
     * @param {number} maxUrls - Maximum number of URLs to fetch
     * @returns {Promise<string>} - Combined content
     */
    async fetchUrls(urls, maxUrls = 5) {
        if (!Array.isArray(urls) || urls.length === 0) {
            return "";
        }

        try {
            const urlsToFetch = urls.slice(0, maxUrls);
            
            if (this.onSearchProgress) {
                this.onSearchProgress(`📄 Fetching ${urlsToFetch.length} pages...`, 'fetch');
            }

            const fetchPromises = urlsToFetch.map(async (url, index) => {
                try {
                    if (this.onSearchProgress) {
                        this.onSearchProgress(`📄 Reading page ${index + 1}/${urlsToFetch.length}...`, 'fetch');
                    }

                    const response = await fetch('fetch-url.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url })
                    });

                    if (!response.ok) {
                        if (this.debugMode) {
                            console.warn(`Failed to fetch ${url}: HTTP ${response.status}`);
                        }
                        return ''; // Return empty string instead of error message
                    }

                    const data = await response.json();
                    
                    // Check if fetch was successful
                    if (!data.success || !data.content) {
                        if (this.debugMode) {
                            console.warn(`Failed to fetch ${url}: ${data.error || 'No content'}`);
                        }
                        return ''; // Return empty string instead of error message
                    }
                    
                    return data.content;

                } catch (error) {
                    if (this.debugMode) {
                        console.warn(`Failed to fetch ${url}:`, error);
                    }
                    return ''; // Return empty string, don't break the search
                }
            });

            const results = await Promise.all(fetchPromises);
            
            // Filter out empty results
            const validResults = results.filter(r => r && r.length > 0);
            
            if (this.onSearchProgress) {
                this.onSearchProgress(`✅ Content fetched (${validResults.length}/${results.length})`, 'fetch');
            }

            // Only join if we have valid results
            return validResults.length > 0 ? validResults.join('\n\n---\n\n') : '';

        } catch (error) {
            if (this.debugMode) {
                console.error('❌ URL fetch error:', error);
            }
            return "";
        }
    }

    /**
     * Execute search with decision agent
     * @param {string} query - User query
     * @param {boolean} shouldFetchUrls - Whether to fetch full page content
     * @returns {Promise<Object>} - Search results and content
     */
    async executeSearch(query, shouldFetchUrls = true) {
        this.searchActive = true;

        try {
            // Run both searches in parallel for speed
            if (this.onSearchProgress) {
                this.onSearchProgress('🔍 Searching...', 'init');
            }

            const [braveResults, perplexityResults] = await Promise.all([
                this.searchBrave(query),
                this.searchPerplexity(query)
            ]);

            let fetchedContent = "";

            // Fetch URLs if requested
            if (shouldFetchUrls) {
                const urlsToFetch = [
                    ...braveResults.map(r => r.url).filter(u => u),
                    ...perplexityResults.map(r => r.url).filter(u => u)
                ];

                // Remove duplicates
                const uniqueUrls = [...new Set(urlsToFetch)];

                if (uniqueUrls.length > 0) {
                    fetchedContent = await this.fetchUrls(uniqueUrls);
                }
            }

            if (this.onSearchProgress) {
                this.onSearchProgress('✅ Search complete!', 'complete');
            }

            this.searchActive = false;

            return {
                braveResults,
                perplexityResults,
                fetchedContent,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            if (this.debugMode) {
                console.error('❌ Search execution error:', error);
            }
            this.searchActive = false;
            if (this.onError) {
                this.onError(error.message);
            }
            return {
                braveResults: [],
                perplexityResults: [],
                fetchedContent: "",
                error: error.message
            };
        }
    }

    /**
     * Format search results for AI context
     * @param {Object} searchData - Search results from executeSearch
     * @returns {string} - Formatted context string
     */
    formatForContext(searchData) {
        let context = "";

        if (searchData.braveResults && searchData.braveResults.length > 0) {
            context += "\n\n🦁 BRAVE SEARCH RESULTS:\n";
            searchData.braveResults.forEach((result, index) => {
                context += `\n${index + 1}. ${result.name}\n`;
                context += `   ${result.snippet}\n`;
                if (result.url) context += `   URL: ${result.url}\n`;
            });
        }

        // ✅ ITT VAN A PERPLEXITY RÉSZ
        if (searchData.perplexityResults && searchData.perplexityResults.length > 0) {
            context += "\n\n🧠 PERPLEXITY AI RESULTS:\n";
            searchData.perplexityResults.forEach((result, index) => {
                context += `\n${index + 1}. ${result.name}\n`;
                if (result.fullContent) {
                    context += `   ${result.fullContent}\n`;
                } else {
                    context += `   ${result.snippet}\n`;
                }
                if (result.url) context += `   URL: ${result.url}\n`;
            });
        }

        if (searchData.fetchedContent) {
            context += "\n\n📄 FETCHED WEB CONTENT:\n";
            context += searchData.fetchedContent;
        }

        return context;
    }

    clearResults() {
        console.log('🧹 Clearing previous search results from handler.');
        this.braveResults = [];
        this.perplexityResults = [];
    }    

    isSearching() {
        return this.searchActive;
    }
}

// Export for use in main app
window.NokiaSearchHandler = NokiaSearchHandler;
