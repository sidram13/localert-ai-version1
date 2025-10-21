
<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

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
        *   **Maps JavaScript API**
        *   **Places API**
5.  **Save your changes.**

By applying these restrictions, your API key will only work on your specified website and only for the selected APIs, significantly enhancing its security.
