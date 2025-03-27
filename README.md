# <img src="https://github.com/julietlawton/conceptify.ai/blob/ae13723033846ed6a7eff220a6d7dd22fceafc9a/public/appicon.png" alt="Conceptify Icon" width="28"/> Conceptify.AI
Conceptify.AI lets you build interactive concept maps from your conversations with AI assistants - supporting meaningful learning by making it easier to visually organize ideas and recall information.

<table align="center"><tr><td>
    <img width="1000" src="https://github.com/user-attachments/assets/592be89d-5686-4b6b-a690-6a1ebced4686" />
</td></tr></table>
<p align="center">
  <i>Concept map built with Conceptify.AI for the Linear Algebra chapter in “Deep Learning” by Goodfellow et al.</i>
</p>

➡️ Try it out: https://conceptify-ai.vercel.app
  
## Features

- Create colorful, interactive concept maps from AI assistant messages that grow organically as you learn

- Enrich concept descriptions with support for LaTeX, code blocks, and image links

- Customize the look and content of your concept map with 12 color palettes and full editing control

- Compile concept maps into concise summaries that can be exported as a PDF or text file

- Free to use, no account required

- Works with both OpenAI and Anthropic models

## For developers
### Installation
1. Clone the repo
```bash
git clone https://github.com/julietlawton/conceptify.ai.git
cd conceptify.ai
```
2. Install dependencies
```bash
pnpm install
```
4. Set environment variables
   - Create a new file named `.env`
   - Set the following environment variables:
   - Required:
     ```env
     OPENAI_API_KEY=<your OpenAI API key>
     ```
   - Optional:
     ```env
     EMAIL_USER=<gmail email address> # Used for sending user feedback
     EMAIL_PASS=<gmail app password> #Used for sending user feedback (obtained by requesting app-specific password in gmail settings)
     UPSTASH_REDIS_REST_URL=<upstash db endpoint> #Used for demo rate limiting
     UPSTASH_REDIS_REST_TOKEN=<upstash db password> #Used for demo rate limiting
     ```

5. Run the development server
```bash
pnpm run dev
```
6. The app should now be up at http://localhost:3000

## Future plans
- Desktop app
- Image upload
- Share gallery
- Documents

## FAQs
<details>
  <summary> <strong>Where do I get an API key?</strong> </summary>
    <br>
    <p> You can get an API key from OpenAI at https://platform.openai.com or from Anthropic at https://console.anthropic.com. Both providers offer a pay-as-you go pricing. </p>
</details>

<details>
  <summary><strong>How does concept map generation work?</strong></summary>
  <br>
  <p>
    Conceptify.AI uses the <a href="https://sdk.vercel.ai/docs/reference/ai-sdk-core/generate-object">generateObject</a> API from the Vercel AI SDK, which allows you to define a structured object schema and pass it along with the prompt. The model is then constrained to return a response that matches this schema.
  </p>
  <p>
    For concept map generation, the app sends the assistant message along with the current concept map. The model is prompted to extract new concepts from the message and intelligently connect them to existing nodes in the concept map.
  </p>
</details>

<details>
  <summary><strong>Why aren’t you using user accounts and server-side storage?</strong></summary>
    <br>
    <p>
    To keep the app completely free to use and maintain, I chose not to support user accounts or server-side storage in the MVP. Instead, all data is stored locally in your browser. There is a minimal backend for demo rate-limiting, but it's small enough to stay within free usage tiers.  
    <br><br>
    In the future, I plan to turn the app into a standalone desktop app with persistent local storage — eliminating the need for accounts or cloud backend.
    </p>
</details>
