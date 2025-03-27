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
  <summary> Where do I get an API key? </summary>
  <p> Answer </p>
</details>

<details>
  <summary> How does graph generation work? </summary>
  <p> Answer </p>
</details>

<details>
  <summary> Why don't you support user accounts and server-side storage? </summary>
  <p> Answer </p>
</details>
