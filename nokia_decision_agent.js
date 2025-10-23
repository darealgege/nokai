/**
 * Nokia Decision Agent - Determines when to use web search
 * Uses GPT-4.1-nano to decide if fresh internet data is needed
 */

class NokiaDecisionAgent {
    constructor() {
        this.model = 'gpt-4.1-nano';
        this.chatEndpoint = 'openaiProxy.php';
        
        this.systemPrompt = `You are a decision agent that determines if a user query requires fresh internet data.

CRITICAL RULES:
- Respond ONLY with "SEARCH" or "NO_SEARCH"
- No explanations, no other text

Use SEARCH when:
- Query asks about current events, news, or recent developments
- Query mentions specific dates after 2023 (like "2024", "2025", "this year")
- Query asks "what's happening", "latest", "recent", "current"
- Query needs real-time data (weather, stock prices, sports scores)
- Query asks about people, places, or topics that may have changed recently
- Query explicitly asks to search ("search for", "look up", "find information")
- Query is about technology, politics, or fast-changing topics
- Any uncertainty about knowledge cutoff (OpenAI's knowledge ends in 2023)

Use NO_SEARCH when:
- Query is about well-known historical facts
- Query is about mathematics, logic, or timeless concepts
- Query is casual conversation ("hello", "how are you")
- Query asks for creative writing or opinion
- Query is about stable, unchanging knowledge

Examples:
"What's the weather?" -> SEARCH
"What's the latest news?" -> SEARCH
"Use the internet" -> SEARCH
"Stock market" -> SEARCH
"Search on the internet" -> SEARCH
"Who won the 2024 election?" -> SEARCH
"Tell me about World War 2" -> NO_SEARCH
"What is 2+2?" -> NO_SEARCH
"Latest news about AI" -> SEARCH
"Hello, how are you?" -> NO_SEARCH
"Tell me about the political situation in France" -> SEARCH 
"What was the score of the game last night?" -> SEARCH
"How do I bake a cake?" -> NO_SEARCH 
"Recommend a good sci-fi book" -> SEARCH
"Who is the president of the USA?" -> SEARCH
"Explain quantum mechanics" -> NO_SEARCH
"What's the capital of Japan?" -> NO_SEARCH
"Who is the CEO of Tesla?" -> SEARCH
"Find me a recipe for lasagna" -> NO_SEARCH
"What's the price of Bitcoin?" -> SEARCH
"Tell me a joke" -> NO_SEARCH
"Who won the World Cup?" -> SEARCH
"What's the latest on climate change?" -> SEARCH
"Define photosynthesis" -> NO_SEARCH
"Who is the richest person in the world?" -> SEARCH
"How to learn programming?" -> NO_SEARCH
Remember: When in doubt, prefer SEARCH to ensure fresh, accurate information!`;
    }

    /**
     * Decide if search is needed
     * @param {string} userQuery - The user's question
     * @returns {Promise<boolean>} - true if search needed, false otherwise
     */
    async shouldSearch(userQuery) {
        try {
            const apiKey = window.apiKeyManager.getSessionApiKey();
            if (!apiKey) {
                throw new Error("API Key is not available for Decision Agent.");
            }            
            const response = await fetch(this.chatEndpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    // A hiányzó Authorization fejléc hozzáadása
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: this.systemPrompt },
                        { role: 'user', content: userQuery }
                    ],
                    temperature: 0.1,
                    max_tokens: 10
                })
            });

            if (!response.ok) {
                // A 401-es hibát is itt kapjuk el, ha valamiért mégis rossz a kulcs
                const errorData = await response.json();
                console.warn(`Decision agent HTTP error ${response.status}:`, errorData.error || 'Unknown error');
                return false;
            }

            const data = await response.json();
            const decision = data.choices[0].message.content.trim().toUpperCase();
            
            console.log(`🤖 Decision Agent: ${decision} for query: "${userQuery}"`);
            
            return decision === 'SEARCH';

        } catch (error) {
            console.error('❌ Decision agent error:', error);
            // Default to no search on error
            return false;
        }
    }

    /**
     * Decide if search is needed for voice mode (faster, simplified)
     * @param {string} userQuery - The user's question
     * @returns {Promise<boolean>} - true if search needed, false otherwise
     */
    async shouldSearchVoice(userQuery) {
        const queryLower = userQuery.toLowerCase().trim();
        const apiKey = window.apiKeyManager.getSessionApiKey();
                    if (!apiKey) {
                        throw new Error("API Key is not available for Decision Agent.");
                    }
        // --- 1️⃣ LÉPÉS: Magas prioritású kizárások (blacklist) ---
        const endingPhrases = [
            // Hungarian
            'viszlát', 'viszontlátásra', 'bontom a vonalat', 
            // English
            'bye', 'goodbye', 'see you', 'talk later', 'end the call'
        ];
        if (endingPhrases.some(phrase => queryLower.startsWith(phrase) || queryLower.endsWith(phrase))) {
            console.log('👋 Goodbye phrase - NO SEARCH');
            return false;
        }

        const personalQuestions = [
            // Hungarian
            'mesélj magadról', 'ki vagy te', 'mit tudsz csinálni', 'mutatkozz be', 
            // English
            'tell me about yourself', 'who are you', 'what can you do', 'introduce yourself'
        ];
        if (personalQuestions.some(phrase => queryLower.includes(phrase))) {
            console.log('👤 Personal question - NO SEARCH');
            return false;
        }

        // --- 2️⃣ LÉPÉS: Magas prioritású keresési parancsok (whitelist) ---
        const searchKeywords = [
            // Hungarian
            'keress rá', 'keresd meg', 'nézz utána', 'nézd meg',
            'legújabb', 'friss', 'aktuális', 'hírek',
            'időjárás', 'árfolyam', 'tőzsde', 'ár',
            // English
            'search for', 'look up', 'find', 'check',
            'latest', 'recent', 'current', 'news',
            'weather', 'price', 'exchange rate', 'stock', 'market'
        ];
        
        const searchRegex = new RegExp(searchKeywords.join('|'), 'i');
        if (searchRegex.test(queryLower)) {
            console.log(`🎤 Voice mode: SEARCH detected (keyword/regex match)`);
            return true;
        }

        // --- 3️⃣ LÉPÉS: Heurisztika kérdőszavakra ---
        const questionPatterns = [
            // Hungarian
            /^ki a/, /^mi a/, /^milyen ma/, /^hány óra/,
            // English
            /^who is/, /^what is/, /^what’s the/, /^what time is it/, /^how’s the weather/
        ];

        if (questionPatterns.some(pattern => pattern.test(queryLower))) {
            console.log(`🎤 Voice mode: SEARCH detected (question pattern heuristic)`);
            return true;
        }

        // --- 4️⃣ LÉPÉS: Alapértelmezett viselkedés ---
        console.log('🎤 Voice mode: NO SEARCH needed (default)');
        return false;
    }


}

// Export for use in main app
window.NokiaDecisionAgent = NokiaDecisionAgent;
