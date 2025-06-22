import  { html } from "npm:htl";
import { TRAVEL_TRENDS_URL } from "./constants.js";

function socialShares({width}){
    const HOOK = "See where are the next trending destinations in the Philippines - backed by data!";

    return html`
        <div class="social-share" style="font-family: sans-serif; margin: 1rem 0;">
            <h3 style="margin-bottom: 0.5rem;">Share Travel Trends:</h3>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                <!-- LinkedIn -->
                <a href="https://www.linkedin.com/sharing/share-offsite/?url=${TRAVEL_TRENDS_URL}" 
                target="_blank"
                title="Share on LinkedIn"
                style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: #0A66C2; color: white; border-radius: 4px; text-decoration: none;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                LinkedIn
                </a>

                <!-- Facebook -->
                <a href="https://www.facebook.com/sharer/sharer.php?u=${TRAVEL_TRENDS_URL}"
                target="_blank"
                title="Share on Facebook"
                style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: #1877F2; color: white; border-radius: 4px; text-decoration: none;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
                Facebook
                </a>

                <!-- Twitter/X -->
                <a href="https://twitter.com/intent/tweet?url=${TRAVEL_TRENDS_URL}&text=${HOOK}"
                    target="_blank"
                    title="Share on X (Twitter)"
                    style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: black; color: white; border-radius: 4px; text-decoration: none; border: 1px solid #777777;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    Twitter/X
                </a>

                <!-- Bluesky (Fixed SVG) -->
                <a href="https://bsky.app/intent/compose?text=${HOOK}%20${TRAVEL_TRENDS_URL}" 
                    target="_blank"
                    title="Share on Bluesky"
                    style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: #1185FE; color: white; border-radius: 4px; text-decoration: none;">
                    Bluesky
                </a>

                <!-- Copy Link -->
                <button onclick="navigator.clipboard.writeText('${TRAVEL_TRENDS_URL}'); this.textContent = 'Copied!'; setTimeout(() => this.textContent = 'Copy Link', 2000)"
                style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                Copy Link
                </button>
            </div>
            </div>
`
}

export default socialShares;