# Frederick Abalo — geospatial software & spatial analytics

[Live portfolio](https://freddie999.github.io/portfolio/) · [GitHub profile](https://github.com/Freddie999)

A minimalist portfolio with system typography, a restrained palette, an optional animated spatial field, a filterable work index, seven project case studies, background and contact pages, and a portfolio guide with text and voice controls.

## Develop and publish

The site is static HTML, CSS, and JavaScript, served from `main` by GitHub Pages. `.nojekyll` preserves the buildless deployment. Node is managed with mise; the generator has no npm dependencies.

```sh
node scripts/build.mjs
node --test tests/*.test.mjs
uv run --no-project --managed-python --python 3.14 python -m http.server 8000
```

Open `http://localhost:8000`. Project content lives in `assets/projects.mjs`. `scripts/build.mjs` generates the home, work, about, contact, 404, and project pages. Commit the generated pages alongside source changes.

## Portfolio guide

- **Quick guide:** retrieves and displays saved public portfolio facts with their source links. This mode is not a generated AI answer and requires no model download.
- **AI chat:** runs Qwen2.5-1.5B-Instruct through WebLLM in a browser worker. A supported WebGPU browser and sufficient memory are required. The first model download is approximately 900 MB; the browser can cache it for later use. The q4f32 variant is used when shader-f16 is unavailable.
- **Grounding:** project-specific questions retrieve the relevant project record. Other questions retrieve public background/contact facts. The model selects at most two relevant source passages using JSON output and bounded question history. Every selected ID is validated, and only the original authored source text is displayed. Model prose never becomes a biographical claim. The selection may still be incomplete or irrelevant; linked project sources remain authoritative.
- **Voice:** the microphone button uses the browser's SpeechRecognition implementation. Recording starts only after a visitor clicks it and grants permission. A transcript is placed in the input for review; it is not submitted automatically. Some browsers use an external speech service for dictation. Read-aloud uses SpeechSynthesis and is opt-in, with a stop control.
- **Privacy:** no API key, paid inference backend, chat database, analytics, or message-sending tool is included. Conversations remain in the current tab. The browser contacts the runtime/model hosts for downloads and potentially its speech provider for dictation. The assistant cannot act on Frederick's behalf.
- **Runtime:** WebLLM is pinned to `0.2.86` in both the assistant and worker modules. If model/runtime hosts are unavailable or the browser lacks WebGPU, Quick guide remains usable. No AI capability is simulated.

## Checks

The test suite checks project/source integrity, project-specific retrieval, out-of-scope questions, prompt/history bounds, generated local links, case-study routes, and image descriptions. Browser QA covers mobile and desktop layouts, navigation, domain filters, hiring-manager details, and actual local-model initialization and responses. No ambient microphone recording is needed for automated QA.

## Content and credits

Project descriptions preserve academic context, team attribution, results, and limitations. Employer code and operational source datasets are not included. The portrait is Frederick's LinkedIn profile photo. Project thumbnails come from the existing portfolio and analytical outputs.

The earlier visual direction was inspired by [Tarik Moody's portfolio](https://builds.tarikmoody.com/); this implementation, content, animation, and assistant are independently authored. No reference-site code, portrait, or project assets are copied. Historical theme copyright is preserved in [LICENSE.md](LICENSE.md).

Model/runtime: [Qwen2.5](https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC), [WebLLM](https://webllm.mlc.ai/). Typography uses system fonts with no external font requests.
