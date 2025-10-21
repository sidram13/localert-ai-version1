<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LocaLert AI: Your Intelligent Commute Assistant

**LocaLert AI** is a smart web application designed to ensure you never miss your bus, train, or ride-share stop again. By leveraging your device's GPS and the power of the Google Gemini API, it provides intelligent destination selection, real-time location tracking, and timely proximity alerts.

Set your destination by name, by describing it in natural language, or by simply picking a point on the map. LocaLert will monitor your journey and sound a loud alarm when you're getting close, giving you peace of mind during your commute.

## ✨ Key Features

- **Real-time GPS Tracking:** Utilizes the browser's high-accuracy Geolocation API to monitor your position.
- **Customizable Proximity Alerts:** Set an alert distance (from 100m to 3km) and receive a loud audio alarm and vibration when you enter the radius.
- **AI-Powered Destination Search:**
    - **Search by Name:** Find locations with intelligent, location-aware autocomplete suggestions powered by the Gemini API.
    - **Describe a Place:** Use natural language to find your destination (e.g., "the big red coffee shop next to the city library").
- **Interactive Map Selector:** A fully interactive Google Map to visually search, pan, and drop a pin on your exact destination.
- **Commute History:** Access a list of your recent destinations for quick and easy setup.
- **Customizable Alarms:** Choose from a selection of pre-defined alarm sounds or upload your own audio file.
- **Screen Wake Lock:** An optional feature that keeps your device's screen awake during your journey to prevent tracking interruption.
- **Modern UI/UX:** A clean, responsive, and mobile-first design with support for light, dark, and system themes.
- **No Installation Needed:** Runs directly in your mobile or desktop browser.

## 🛠️ Technology Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **AI & Mapping:**
    - **Google Gemini API:** For natural language understanding, location suggestions, and geocoding.
    - **Google Maps JavaScript API:** For the interactive map, place search autocomplete, and reverse geocoding.
- **Browser APIs:**
    - Geolocation API
    - Wake Lock API
    - Vibration API
    - Web Audio API
- **Build Tool:** Vite

## Run and deploy your AI Studio app

This contains everything you need to run your app locally.

<<<<<<< HEAD
=======

>>>>>>> e84686bc54d9039c3cd23f939c088f71bbf48a5c
## Run Locally

**Prerequisites:** Node.js

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up your API Key:**
    Create a `.env.local` file in the root of the project and add your Google API key:
    ```
    GEMINI_API_KEY="YOUR_API_KEY_HERE"
    ```
    *Note: For this project, the same API key is used for both the Gemini and Google Maps APIs.*
4.  **Run the app:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## 🔒 API Key Security (IMPORTANT for Deployment)

The Google Maps API key used in this project is visible in the client-side code. To prevent unauthorized use and protect against unexpected charges, you **MUST** restrict your API key before deploying your application to a public URL.

Follow these steps in the Google Cloud Console:

1.  **Navigate to Credentials:** Go to the [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials) page in your Google Cloud project.
2.  **Select Your API Key:** Click on the name of the API key you are using for this project.
3.  **Set Application Restrictions:**
    *   Under "Application restrictions," select **HTTP referrers (web sites)**.
    *   Click "Add a referrer" and enter your application's domain (e.g., `your-app-domain.com/*`). If you're testing on a specific subdomain, you can be more specific.
4.  **Set API Restrictions:**
    *   Under "API restrictions," select **Restrict key**.
    *   In the dropdown, select only the APIs required for this app:
        *   **Generative Language API** (for Gemini)
        *   **Maps JavaScript API**
        *   **Places API**
5.  **Save your changes.**

By applying these restrictions, your API key will only work on your specified website and only for the selected APIs, significantly enhancing its security.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
