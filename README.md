# Nokai - The Retro AI Phone Simulator

**Nokai** is a web-based project that merges the user interface of a classic feature phone with the power of modern artificial intelligence. The simulator emulates a complete mobile OS with its own applications, settings, and unique features, all presented on a nostalgic, monochrome green display.

This project explores what it might have been like if the mobile technology of the early 2000s had suddenly gained access to today's advanced AI models.

## ✨ Key Features

- **📞 Real-time AI Voice Calls:** Initiate voice calls with built-in AI personalities using the OpenAI Realtime API for seamless, low-latency conversations.
- **💬 Advanced Messaging App:** Chat with AI profiles in an SMS-style interface. Conversations are saved, and the AI responds with a delay, simulating a real human interaction.
- **🤖 ChatGPT Integration:** A dedicated app for direct chatting, supporting model selection and conversation history.
- **🌐 Integrated Web Search:** The AI can decide when it needs fresh information and uses **Brave Search** and **Perplexity AI** to gather real-time data for its responses.
- **🖼️ Image Analysis (Vision):** Attach photos from the Gallery to your messages or ChatGPT conversations. The AI can analyze and respond to the content of the images.
- **👤 AI Personalities:** A collection of distinct AI profiles, each with a unique personality, prompt, and voice, managed through `.ini` files.
- **📸 Camera & Gallery:** A retro-style camera app to take "photos" (processed webcam feed) and a gallery to view and manage them.
- **👾 It can run DOOM:** A fully functional, monochrome (grayscale 1) version of DOOM is included, complete with save/load functionality via IndexedDB.
- **🔐 Secure API Key Management:** API keys are never stored in plain text. They are encrypted with a user-defined PIN and stored securely in IndexedDB. A session-only option is also available.
- **💰 Cost Tracking:** The application tracks the estimated cost of OpenAI API usage (text, voice, and vision) and displays it in the system information panel.
- **⌨️ T9 Predictive Text Input:** A fully implemented T9 input system with a custom dictionary, word completion, and multi-language support (English & Hungarian).

## 🎞️ YouTube

[![Nokai - Retro AI Phone Simulator Demo](https://img.youtube.com/vi/jRszWA2AA48/hqdefault.jpg)](https://www.youtube.com/watch?v=jRszWA2AA48 "Nokai - Retro AI Phone Simulator Demo")

## 🖼️ Screenshots

[NOKAI Phone main screen](https://hungaryvfr.hu/images/nokai/1-main_screen.png)

[NOKAI Phone Contacts screen](https://hungaryvfr.hu/images/nokai/2-contacts.png)

[NOKAI Phone In-Call screen](https://hungaryvfr.hu/images/nokai/3-in_call.png)

[NOKAI Phone Call History screen](https://hungaryvfr.hu/images/nokai/4-call_history.png)

[NOKAI Phone Call History Transcript screen](https://hungaryvfr.hu/images/nokai/5-history_transcript.png)

[NOKAI Phone Messages (SMS/MMS) screen](https://hungaryvfr.hu/images/nokai/6-messages.png)

[NOKAI Phone Messages screen - a reply from Penny AI profile](https://hungaryvfr.hu/images/nokai/7-messages_penny_reply.png)

[NOKAI Phone Messages - Options](https://hungaryvfr.hu/images/nokai/8-messages_options.png)

[NOKAI Phone ChatGPT app](https://hungaryvfr.hu/images/nokai/9_chatgpt_app.png)

[NOKAI Phone DOOM](https://hungaryvfr.hu/images/nokai/10_doom.png)

[![PayPal Donate Button](https://hungaryvfr.hu/images/paypal-donate-button-2.png)](https://www.paypal.com/ncp/payment/KUM7TUZW4CNPN)

## 🔧 How It Works

The project is built with a vanilla JavaScript frontend and a PHP backend that acts as a secure proxy for various APIs.

### Frontend
The frontend is written entirely in **Vanilla JavaScript**, HTML, and CSS, without any external frameworks. It simulates the entire phone OS, including the status bar, keypad interactions, and application lifecycle. All data (messages, photos, settings) is stored client-side using **LocalStorage** and **IndexedDB** for persistence and performance.

### Backend (PHP Scripts)
The PHP backend serves as a secure proxy to handle API requests, keeping sensitive API keys off the client-side.

-   **`openaiProxy.php`**: Forwards chat completion requests to the OpenAI API. It receives the API key securely via an `Authorization` header from the client.
-   **`realtime-session.php`**: Creates an ephemeral key for OpenAI's Realtime API, enabling secure WebRTC voice calls.
-   **`brave-search.php` & `perplexity-search.php`**: Proxy requests to the Brave Search and Perplexity AI APIs, respectively. API keys are stored in the `.env` file on the server.
-   **`fetch-url.php`**: A simple web scraper to fetch and parse text content from URLs found in search results.
-   **`list_profiles.php`**: Lists the available AI personality `.ini` files from the `/profiles` directory.
-   **`weather.php`**: Fetches current weather data from the Open-Meteo API based on the user's geolocation.

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites
- A web server with PHP support (e.g., Apache, Nginx with PHP-FPM).
- Composer (optional, but recommended for PHP projects).
- API keys for:
    - OpenAI
    - Brave Search
    - Perplexity AI

### Installation

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/darealgege/nokai.git
    cd nokai
    ```

2.  **Configure Web Server:**
    Point your web server's document root to the cloned project directory. Ensure that `.php` files are processed correctly.

3.  **Create the Environment File:**
    In the root directory of the project, create a file named `.env` and add your API keys. This file is used by the backend PHP scripts.

    ```ini
    BRAVE_API_KEY=YOUR_BRAVE_SEARCH_API_KEY
    PERPLEXITY_API_KEY=YOUR_PERPLEXITY_AI_API_KEY
    ```
    **Important:** The OpenAI API key is **not** placed here. The user provides it through the application's setup screen for security.

4.  **Open in Browser:**
    Navigate to the local URL of your project (e.g., `http://localhost/nokai`).

5.  **First-Time Setup:**
    The application will prompt you to enter your OpenAI API key and set a 4-6 digit PIN to encrypt it. This key will be stored securely in your browser's IndexedDB.

## 🛠️ Key Technologies

-   **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
-   **Backend:** PHP
-   **AI Services:**
    -   OpenAI API (Chat Completions, Vision, Realtime Voice)
    -   Brave Search API
    -   Perplexity AI API
-   **Storage:** IndexedDB (for API keys and images), LocalStorage (for settings and conversations)
-   **Real-time Communication:** WebRTC (for voice calls)

## 📁 Project Structure

```
├── apps/ # Logic for individual applications
│ ├── camera/ # Camera application
│ │ └── nokia_camera.js
│ ├── gallery/ # Gallery application
│ │ └── nokia_gallery.js
│ ├── messages/ # Messaging application and handlers
│ │ ├── nokia_messages.js
│ │ ├── nokia_messages_api.js
│ │ ├── nokia_messages_background_handler.js
│ │ ├── nokia_messages_image_handler.js
│ │ └── nokia_messages_storage.js
│ └── phone/ # Phone application
│ └── nokia_phone_app.js
├── games/ # Games
│ ├── doom/ # DOOM easter egg
│ │ ├── doom_easter_egg.css
│ │ ├── doom_easter_egg.js
│ │ └── doom_icon.png
│ ├── snake/ # Snake game
│ │ ├── snake_game.css
│ │ └── snake_game.js
│ └── super_steve/ # Super Steve platformer game
│ ├── super_steve_audio.js
│ ├── super_steve_game.css
│ ├── super_steve_game.js
│ ├── super_steve_icon.png
│ ├── super_steve_jump.png
│ ├── super_steve_level.js
│ ├── super_steve_metro_system_integration.js
│ ├── super_steve_player.js
│ ├── super_steve_renderer.js
│ ├── super_steve_sprites.js
│ ├── super_steve_stand_anim.png
│ ├── super_steve_underground_scene_generator.js
│ ├── super_steve_walk.png
│ ├── super_steve_walk_2x1.png
│ ├── super_steve_walk_new_1.png
│ ├── super_steve_walk_new_2.png
│ ├── super_steve_walk_new_3.png
│ └── super_steve_walk_new_4.png
├── handlers/ # General application handlers (keyboard, navigation)
│ ├── nokia_app_handlers.js
│ ├── nokia_app_handlers_init.js
│ ├── nokia_app_handlers_keyboard.js
│ ├── nokia_app_handlers_navigation.js
│ └── nokia_app_handlers_utils.js
├── image_handlers/ # Modules related to image processing, including AI integration
│ ├── nokia_chatgpt_image_handler.js
│ ├── nokia_dcim_manager.js
│ ├── nokia_image_attachments.js
│ ├── nokia_storage_cleanup.js
│ └── nokia_vision_handler.js
├── lib/ # General-purpose libraries and utilities
│ ├── nokia_api_key_manager.js
│ ├── nokia_app.js
│ ├── nokia_battery_handler.js
│ ├── nokia_cost_calculator.js
│ ├── nokia_decision_agent.js
│ ├── nokia_emoji_converter.js
│ ├── nokia_profile_manager.js
│ ├── nokia_search_handler.js
│ ├── nokia_unified_history_manager.js
│ ├── nokia_voice_handler.js
│ └── openai_pricing.json
├── main/ # Main application components (startup, login)
│ ├── nokia_app_manager.js
│ ├── nokia_pin_screen.js
│ └── nokia_setup_screen.js
├── migration/ # Database and image migration scripts
│ ├── nokia_image_indexeddb.js
│ └── nokia_image_migration.js
├── profiles/ # AI personality .ini files
├── styles/ # CSS stylesheets
│ ├── nokia_camera_gallery.css
│ ├── nokia_messages.css
│ ├── nokia_setup.css
│ └── nokia_style.css
├── T9/ # T9 dictionaries
│ ├── words_en.txt
│ └── words_hu.txt
├── brave-search.php # Backend proxy for Brave Search
├── favicon.ico # Favicon
├── fetch-url.php # Backend proxy for fetching URL content
├── index.html # Main HTML file
├── list_profiles.php # Backend script to list profiles
├── openaiProxy.php # Backend proxy for OpenAI Chat API
├── perplexity-search.php # Backend proxy for Perplexity AI
├── realtime-session.php # Backend for OpenAI Realtime API sessions
├── weather.php # Backend for weather data
└── README.md # This file
```

## 💡 Future Ideas

-   **Expandable App System:** Create a more robust system for adding new third-party apps.
-   **Voicemail:** Allow AI personalities to leave "voicemail" messages if a call is missed.
-   **WAP Browser:** Simulate a basic WAP browser that uses an AI to summarize web pages into a text-only format.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).


---







