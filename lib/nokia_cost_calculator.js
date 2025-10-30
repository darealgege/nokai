// nokia_cost_calculator.js

class NokiaCostCalculator {
    constructor() {
        this.modelPricing = null; // Itt fogjuk tárolni a JSON-ból betöltött árakat
        this.initPromise = this.init(); // Elindítjuk az aszinkron inicializálást

        this.currentCallCost = 0;
        this.currentCallModel = null;
        this.callDurationSeconds = 0;
        this.callCostInterval = null;
        
        this.usageData = this.loadUsageData();
    }

    // ✅ ÚJ: Aszinkron inicializálás, ami betölti az árakat a JSON-ból
    async init() {
        try {
            const response = await fetch('./lib/openai_pricing.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.modelPricing = await response.json();
            console.log('💰 Model pricing loaded successfully from JSON.', this.modelPricing);
        } catch (error) {
            console.error("❌ Failed to load openai_pricing.json. Cost calculations will fail.", error);
            // Hiba esetén is létrehozunk egy üres objektumot, hogy a többi kód ne szálljon el
            this.modelPricing = { text_models: {}, voice_models: {} };
        }
    }

    loadUsageData() {
        const savedData = localStorage.getItem('nokia_usage_data_v2'); // Új kulcs a struktúraváltás miatt
        if (savedData) {
            return JSON.parse(savedData);
        }
        // ✅ ÚJ, RÉSZLETESEBB STRUKTÚRA
        return {
            // pl. { '2024-05': { total: 1.23, text: {...}, voice: {...}, vision: {...} }, ... }
            monthly: {}, 
            // pl. { total: 5.67, text: { 'gpt-4o': 4.55, ... }, voice: { ... }, vision: { ... } }
            total: {
                total: 0,
                text: {},
                voice: {},
                vision: {}  // ✅ Vision kategória hozzáadva
            }
        };
    }

    saveUsageData() {
        localStorage.setItem('nokia_usage_data_v2', JSON.stringify(this.usageData));
    }

    async calculateAndStoreCost(model, usage, type, overrideCost = null) {
        await this.initPromise;

        let cost = 0;
        if (overrideCost !== null) {
            // Ha kaptunk felülíró értéket (pl. a hanghívás végén), azt használjuk.
            cost = overrideCost;
        } else if (type === 'text') {
            const pricing = this.modelPricing.text_models[model];
            if (!pricing || !usage) return 0;

            const inputCost = (usage.prompt_tokens || 0) * (pricing.input / 1000000);
            const outputCost = (usage.completion_tokens || 0) * (pricing.output / 1000000);
            cost = inputCost + outputCost;
        } else if (type === 'vision') {
            // ✅ ÚJ: Vision API kalkuláció
            const pricing = this.modelPricing.vision_models[model];
            if (!pricing || !usage) return 0;

            const inputCost = (usage.prompt_tokens || 0) * (pricing.input / 1000000);
            const outputCost = (usage.completion_tokens || 0) * (pricing.output / 1000000);
            
            // Kép kalkuláció (fix költség képenként)
            const imageCost = pricing.image_cost || 0;
            
            cost = inputCost + outputCost + imageCost;
            
            console.log(`📊 Vision cost breakdown: input=${inputCost.toFixed(6)}, output=${outputCost.toFixed(6)}, image=${imageCost.toFixed(6)}, total=${cost.toFixed(6)}`);
        }
        // A 'voice' esetet már az overrideCost kezeli, így a régi 'else' blokk felesleges.

        if (cost > 0) {
            const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

            // Havi adatok inicializálása, ha szükséges
            if (!this.usageData.monthly[currentMonth]) {
                this.usageData.monthly[currentMonth] = { total: 0, text: {}, voice: {}, vision: {} };
            }

            // Teljes és havi adatok frissítése
            this.usageData.total.total += cost;
            this.usageData.monthly[currentMonth].total += cost;
            
            // ✅ ÚJ: Vision külön kategória
            const category = type === 'vision' ? 'vision' : type;
            
            if (!this.usageData.total[category]) this.usageData.total[category] = {};
            if (!this.usageData.monthly[currentMonth][category]) this.usageData.monthly[currentMonth][category] = {};

            if (!this.usageData.total[category][model]) this.usageData.total[category][model] = 0;
            if (!this.usageData.monthly[currentMonth][category][model]) this.usageData.monthly[currentMonth][category][model] = 0;
            
            this.usageData.total[category][model] += cost;
            this.usageData.monthly[currentMonth][category][model] += cost;

            this.saveUsageData();
        }
        
        return cost;
    }

    async startCallCostTracking(model) {
        // ✅ JAVÍTÁS: Megvárjuk, amíg az árakat tartalmazó JSON betöltődik.
        await this.initPromise;

        this.stopCallCostTracking(); // Biztos, ami biztos
        this.currentCallCost = 0;
        this.currentCallModel = model;
        this.callDurationSeconds = 0;

        const costPerMinute = this.modelPricing.voice_models[model]?.cost || 0;
        const costPerSecond = costPerMinute / 60;

        if (costPerSecond === 0) {
            console.warn(`No price found for voice model: ${model}`);
            return;
        }

        this.callCostInterval = setInterval(() => {
            this.currentCallCost += costPerSecond;
        }, 1000);
    }

    stopCallCostTracking() {
        if (this.callCostInterval) {
            clearInterval(this.callCostInterval);
            this.callCostInterval = null;

            // ✅ JAVÍTÁS: Mentsük el a végső költséget, MIELŐTT bármi mást csinálnánk.
            const finalCallCost = this.currentCallCost;

            if (finalCallCost > 0 && this.currentCallModel) {
                // A `calculateAndStoreCost` most már a helyes, elmentett értéket kapja meg.
                this.calculateAndStoreCost(this.currentCallModel, null, 'voice', finalCallCost);
            }

            // Most már biztonságosan lenullázhatjuk a következő hívásra.
            this.currentCallCost = 0;
        }
    }

    // ✅ JAVÍTOTT: Dinamikus HTML generálás a részletes adatokból
    async getFormattedUsageForSystemInfo() {
        await this.initPromise; // Várakozás az árak betöltésére

        const currentMonthKey = new Date().toISOString().substring(0, 7);
        const monthlyData = this.usageData.monthly[currentMonthKey] || { total: 0, text: {}, voice: {}, vision: {} };
        const totalData = this.usageData.total;

        const generateModelRows = (dataObject, indent) => {
            let modelHtml = '';
            const models = Object.keys(dataObject).sort();
            if (models.length === 0) return `${indent}No usage recorded.<br>`;
            
            models.forEach(model => {
                const cost = dataObject[model];
                modelHtml += `${indent}${model}: ${cost.toFixed(4)}<br>`;
            });
            return modelHtml;
        };

        let html = `<strong>💲 Service Costs</strong><br>`;
        html += `This Month: ${monthlyData.total.toFixed(4)}<br>`;
        html += `└ Text Models:<br>`;
        html += generateModelRows(monthlyData.text, '  └ ');
        html += `└ Vision Models:<br>`;
        html += generateModelRows(monthlyData.vision, '  └ ');
        html += `└ Voice Models:<br>`;
        html += generateModelRows(monthlyData.voice, '  └ ');
        
        html += `All Time: ${totalData.total.toFixed(4)}<br>`;
        html += `└ Text Models:<br>`;
        html += generateModelRows(totalData.text, '  └ ');
        html += `└ Vision Models:<br>`;
        html += generateModelRows(totalData.vision, '  └ ');
        html += `└ Voice Models:<br>`;
        html += generateModelRows(totalData.voice, '  └ ');
        html += `<br>`;
        
        return html;
    }
}

window.costCalculator = new NokiaCostCalculator();